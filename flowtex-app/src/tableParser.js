/**
 * Parses a raw LaTeX `tabular`/`tabularx` source (optionally wrapped in a
 * `table`/`table*` float) into a structured model that the table object's
 * node view and spreadsheet toolbar can render/edit.
 *
 * Mirrors the "parse to a model, edit the model, serialize the model" shape
 * of the rest of the app, but - unlike the math nodes, which store only the
 * inner LaTeX and let KaTeX re-render it live - table cell *content* is kept
 * as opaque raw LaTeX strings rather than deeply parsed, since table cells
 * are simple text in the overwhelming majority of real documents and full
 * recursive re-parsing isn't worth the risk it'd add to the highest-risk
 * part of this feature.
 */

// Walks `str` tracking brace depth and backslash-escaping, splitting on any
// top-level occurrence of `sep` (a single character, e.g. '&'). A backslash
// always escapes the following character (so `\&` and `\{` are literal, not
// structural) except for the two-character `\\` row/cell-terminator token,
// which is never itself treated as an escape.
function splitTopLevel(str, sep) {
  const parts = [];
  let depth = 0;
  let current = '';
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === '\\' && str[i + 1] === '\\') {
      current += '\\\\';
      i += 2;
      continue;
    }
    if (ch === '\\' && i + 1 < str.length) {
      current += ch + str[i + 1];
      i += 2;
      continue;
    }
    if (ch === '{') { depth++; current += ch; i++; continue; }
    if (ch === '}') { depth--; current += ch; i++; continue; }
    if (ch === sep && depth === 0) {
      parts.push(current);
      current = '';
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  parts.push(current);
  return parts;
}

// Splits `body` into row segments on top-level `\\`, respecting brace depth
// and backslash-escaping the same way splitTopLevel does.
function splitRows(body) {
  const rows = [];
  let depth = 0;
  let current = '';
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === '\\' && body[i + 1] === '\\' && depth === 0) {
      rows.push(current);
      current = '';
      i += 2;
      // Optional `\\[<len>]` extra spacing - consume and discard.
      const rest = body.slice(i);
      const m = rest.match(/^\s*\[[^\]]*\]/);
      if (m) i += m[0].length;
      continue;
    }
    if (ch === '\\' && i + 1 < body.length) {
      current += ch + body[i + 1];
      i += 2;
      continue;
    }
    if (ch === '{') { depth++; current += ch; i++; continue; }
    if (ch === '}') { depth--; current += ch; i++; continue; }
    current += ch;
    i++;
  }
  if (current.trim() !== '') rows.push(current);
  return rows;
}

function findMatchingBrace(str, openIdx) {
  let depth = 1;
  let i = openIdx + 1;
  while (i < str.length && depth > 0) {
    if (str[i] === '{' && str[i - 1] !== '\\') depth++;
    else if (str[i] === '}' && str[i - 1] !== '\\') depth--;
    i++;
  }
  if (depth !== 0) throw new Error('Unbalanced braces in column spec');
  return i - 1;
}

function parseColSpec(spec) {
  const cols = [];
  let pendingBefore = '';
  let i = 0;
  while (i < spec.length) {
    const ch = spec[i];
    if (ch === '|') { pendingBefore += '|'; i++; continue; }
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === 'l' || ch === 'c' || ch === 'r') {
      cols.push({ align: ch, before: pendingBefore, after: '' });
      pendingBefore = '';
      i++;
      continue;
    }
    if (ch === 'X') {
      cols.push({ align: 'X', before: pendingBefore, after: '' });
      pendingBefore = '';
      i++;
      continue;
    }
    if (ch === 'S') {
      i++;
      let sOptions = '';
      if (spec[i] === '[') {
        const close = spec.indexOf(']', i);
        if (close === -1) throw new Error("Unbalanced 'S[...]' in column spec");
        sOptions = spec.slice(i + 1, close);
        i = close + 1;
      }
      cols.push({ align: 'S', before: pendingBefore, after: '', sOptions });
      pendingBefore = '';
      continue;
    }
    if (ch === 'p' || ch === 'm' || ch === 'b') {
      const type = ch;
      i++;
      if (spec[i] !== '{') throw new Error(`Expected '{' after '${type}' column spec`);
      const close = findMatchingBrace(spec, i);
      const width = spec.slice(i + 1, close);
      cols.push({ align: type, before: pendingBefore, after: '', width });
      pendingBefore = '';
      i = close + 1;
      continue;
    }
    if (ch === '@' || ch === '!') {
      const marker = ch;
      i++;
      if (spec[i] !== '{') throw new Error(`Expected '{' after '${marker}'`);
      const close = findMatchingBrace(spec, i);
      pendingBefore += marker + '{' + spec.slice(i + 1, close) + '}';
      i = close + 1;
      continue;
    }
    throw new Error(`Unsupported column spec token '${ch}'`);
  }
  if (pendingBefore) {
    if (!cols.length) throw new Error('Column spec has no columns');
    cols[cols.length - 1].after += pendingBefore;
  }
  return cols;
}

const RULE_NAMES = ['toprule', 'midrule', 'bottomrule', 'hline'];

// Pulls booktabs/hline/cline commands out of a row segment (they never
// occur inside a cell's own content, so no brace-depth tracking is needed
// to find them - unlike `&`/`\\`).
function extractRules(segment) {
  const rules = [];
  let text = segment.replace(
    new RegExp(`\\\\(${RULE_NAMES.join('|')})\\b`, 'g'),
    (_, name) => { rules.push(name); return ''; }
  );
  text = text.replace(/\\cline\{(\d+)-(\d+)\}/g, (_, a, b) => { rules.push(`cline:${a}-${b}`); return ''; });
  return { rules, text };
}

// Parses a single cell's raw content, unwrapping \multicolumn / \multirow
// (which may nest in either order) into { content, colspan, rowspan, align, width }.
function parseCell(raw, columnAlign) {
  let text = raw.trim();
  let colspan = 1;
  let rowspan = 1;
  let align = columnAlign;
  let width = null;

  for (let guard = 0; guard < 2; guard++) {
    const mc = matchCommand(text, 'multicolumn');
    if (mc) {
      const n = parseInt(mc.args[0], 10);
      if (!Number.isFinite(n) || n < 1) throw new Error(`Invalid \\multicolumn span '${mc.args[0]}'`);
      colspan = n;
      const spec = mc.args[1].trim();
      align = spec.replace(/[|]/g, '').trim() || align;
      text = mc.args[2].trim();
      continue;
    }
    const mr = matchCommand(text, 'multirow');
    if (mr) {
      const n = parseInt(mr.args[0], 10);
      if (!Number.isFinite(n) || n < 1) throw new Error(`Invalid \\multirow span '${mr.args[0]}'`);
      rowspan = n;
      width = mr.args[1].trim();
      text = mr.args[2].trim();
      continue;
    }
    break;
  }

  return { content: text, colspan, rowspan, align, width };
}

// Matches `\name{a}{b}{c}` (2 or 3 balanced-brace args) at the start of `text`.
function matchCommand(text, name) {
  const re = new RegExp(`^\\\\${name}\\s*\\{`);
  const m = text.match(re);
  if (!m) return null;
  const args = [];
  let i = m[0].length - 1; // position of the first '{'
  while (args.length < 3) {
    if (text[i] !== '{') break;
    const close = findMatchingBrace(text, i);
    args.push(text.slice(i + 1, close));
    i = close + 1;
    if (text[i] === '{') continue;
    break;
  }
  if (args.length < 2) return null;
  const trailing = text.slice(i).trim();
  if (trailing !== '') return null; // something follows the command - not a pure wrapper
  return { args };
}

function parseTabularCore(env, headerArgs, body, columns) {
  const rawSegments = splitRows(body);

  const rules = [];
  const rows = [];
  let pendingRules = [];

  rawSegments.forEach((seg) => {
    const { rules: segRules, text } = extractRules(seg);
    if (text.trim() === '') {
      pendingRules.push(...segRules);
      return;
    }
    // Rule commands share a `\\`-bounded segment with the row that follows
    // them (a rule always sits after the previous row's `\\` and before the
    // next row's cells), so segRules found here belong to *this* boundary,
    // not the next one.
    rules.push([...pendingRules, ...segRules]);
    pendingRules = [];
    const cellTexts = splitTopLevel(text, '&');
    const cells = cellTexts.map((c, ci) => {
      const col = columns[Math.min(ci, columns.length - 1)] || { align: 'l' };
      return parseCell(c, col.align);
    });
    rows.push({ cells });
  });
  rules.push(pendingRules); // trailing rules after the last row (e.g. \bottomrule)

  if (!rows.length) throw new Error('Table has no rows');

  return { env, headerArgs, columns, rows, rules };
}

function stripCommand(text, name) {
  let value = null;
  const re = new RegExp(`\\\\${name}\\{`, 'g');
  const m = re.exec(text);
  if (!m) return { text, value };
  const close = findMatchingBrace(text, m.index + m[0].length - 1);
  value = text.slice(m.index + m[0].length, close);
  const rest = text.slice(0, m.index) + text.slice(close + 1);
  return { text: rest, value };
}

// Finds the `\end{env}` matching a `\begin{env}` that starts at `fromIdx`,
// counting nested \begin/\end pairs of the same env name so a (rare) nested
// tabular doesn't truncate the outer one early.
function findMatchingEnvEnd(str, env, fromIdx) {
  const re = new RegExp(`\\\\(begin|end)\\{${env}\\}`, 'g');
  re.lastIndex = fromIdx;
  let depth = 1;
  let m;
  while ((m = re.exec(str)) !== null) {
    depth += m[1] === 'begin' ? 1 : -1;
    if (depth === 0) return m.index;
  }
  throw new Error(`No matching \\end{${env}}`);
}

// Extracts the (optional tabularx width arg +) column spec using balanced
// brace matching - a plain non-greedy regex breaks as soon as the column
// spec contains its own braces (e.g. `p{4cm}` or `S[table-format=1.2]`),
// same failure mode latexImporter.js's replaceBalanced was written to avoid.
function parseEnvHeader(inner) {
  const m = inner.match(/\\begin\{(tabular|tabularx)\}/);
  if (!m) throw new Error('No \\begin{tabular} or \\begin{tabularx} environment found');
  const env = m[1];
  let i = m.index + m[0].length;

  let width = null;
  if (env === 'tabularx') {
    while (/\s/.test(inner[i])) i++;
    if (inner[i] !== '{') throw new Error('Expected a width argument after \\begin{tabularx}');
    const close = findMatchingBrace(inner, i);
    width = inner.slice(i + 1, close);
    i = close + 1;
  }

  while (/\s/.test(inner[i])) i++;
  if (inner[i] !== '{') throw new Error(`Expected a column spec after \\begin{${env}}`);
  const specClose = findMatchingBrace(inner, i);
  const colSpecRaw = inner.slice(i + 1, specClose);

  const bodyStart = specClose + 1;
  const endIdx = findMatchingEnvEnd(inner, env, bodyStart);
  const body = inner.slice(bodyStart, endIdx);

  return { env, width, colSpecRaw, body };
}

/**
 * Parses raw LaTeX table source. Returns `{ ok: true, model }` on success,
 * or `{ ok: false, error }` on anything the parser doesn't confidently
 * support - callers should fall back to a raw/unparsed representation
 * rather than guess.
 */
export function parseTableSource(raw) {
  try {
    const source = (raw || '').trim();

    let placement = null;
    let floatEnv = null;
    let inner = source;
    const floatMatch = source.match(/^\\begin\{(table\*?)\}(\[[^\]]*\])?([\s\S]*)\\end\{\1\}\s*$/);
    if (floatMatch) {
      floatEnv = floatMatch[1];
      placement = floatMatch[2] ? floatMatch[2].slice(1, -1) : null;
      inner = floatMatch[3];
    }

    let centering = false;
    if (/\\centering\b/.test(inner)) {
      centering = true;
      inner = inner.replace(/\\centering\b/, '');
    }

    let caption = null;
    ({ text: inner, value: caption } = stripCommand(inner, 'caption'));
    let label = null;
    ({ text: inner, value: label } = stripCommand(inner, 'label'));

    const { env, width, colSpecRaw, body } = parseEnvHeader(inner);
    const columns = parseColSpec(colSpecRaw);
    const core = parseTabularCore(env, { width }, body, columns);

    const colCounts = core.rows.map((r) => r.cells.reduce((sum, c) => sum + c.colspan, 0));
    const maxCols = Math.max(...colCounts, columns.length);
    if (maxCols > columns.length + 4) {
      // Wildly more cells than declared columns - likely something the
      // parser mis-split rather than a legitimately ragged table.
      throw new Error('Row cell counts are inconsistent with the column spec');
    }

    return {
      ok: true,
      model: {
        floatEnv,
        placement,
        centering,
        caption,
        label,
        env,
        width,
        columns,
        rows: core.rows,
        rules: core.rules,
      },
    };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}
