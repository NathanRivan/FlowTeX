/**
 * Serializes a table model (see tableParser.js) back into idiomatic LaTeX —
 * booktabs rules, \multirow/\multicolumn, siunitx S columns — rather than a
 * mechanical dump. This is the inverse of parseTableSource; TableEditModal
 * is the only caller (the document-level latexSerializer just re-emits the
 * node's stored raw string, same as the math nodes do for `attrs.latex`).
 */

function serializeColSpec(columns) {
  return columns
    .map((col) => {
      let token;
      if (col.align === 'S') token = 'S' + (col.sOptions ? `[${col.sOptions}]` : '');
      else if (col.align === 'p' || col.align === 'm' || col.align === 'b') token = `${col.align}{${col.width}}`;
      else token = col.align; // l, c, r, X
      return (col.before || '') + token + (col.after || '');
    })
    .join('');
}

function serializeRuleToken(tok) {
  if (tok.startsWith('cline:')) return `\\cline{${tok.slice('cline:'.length)}}`;
  return `\\${tok}`;
}

function serializeCell(cell) {
  let inner = cell.content || '';
  if (cell.rowspan > 1) {
    inner = `\\multirow{${cell.rowspan}}{${cell.width || '*'}}{${inner}}`;
  }
  if (cell.colspan > 1) {
    const align = cell.align || 'c';
    inner = `\\multicolumn{${cell.colspan}}{${align}}{${inner}}`;
  }
  return inner;
}

export function serializeTableModel(model) {
  const colSpec = serializeColSpec(model.columns);
  const envOpen =
    model.env === 'tabularx'
      ? `\\begin{tabularx}{${model.width || '\\linewidth'}}{${colSpec}}`
      : `\\begin{tabular}{${colSpec}}`;
  const envClose = `\\end{${model.env}}`;

  const lines = [];
  (model.rules[0] || []).forEach((tok) => lines.push('  ' + serializeRuleToken(tok)));
  model.rows.forEach((row, i) => {
    const cellsText = row.cells.map(serializeCell).join(' & ');
    lines.push('  ' + cellsText + ' \\\\');
    (model.rules[i + 1] || []).forEach((tok) => lines.push('  ' + serializeRuleToken(tok)));
  });

  const tabular = `${envOpen}\n${lines.join('\n')}\n${envClose}`;

  const wantsFloat = !!(model.caption || model.label || model.floatEnv);
  if (!wantsFloat) return tabular;

  const floatEnv = model.floatEnv || 'table';
  const placement = model.placement || 'htbp';
  const parts = [`\\begin{${floatEnv}}[${placement}]`];
  if (model.centering !== false) parts.push('\\centering');
  parts.push(tabular);
  if (model.caption) parts.push(`\\caption{${model.caption}}`);
  if (model.label) parts.push(`\\label{${model.label}}`);
  parts.push(`\\end{${floatEnv}}`);
  return parts.join('\n');
}

// Rewrites every non-empty rule slot to the chosen border style, preserving
// \cline entries (which have no booktabs equivalent) as-is. Used by the
// toolbar's booktabs/hline toggle.
export function convertRulesToStyle(rules, style) {
  const nonEmptyIdx = rules.reduce((acc, tokens, i) => (tokens.length ? [...acc, i] : acc), []);
  if (!nonEmptyIdx.length) return rules;
  const firstIdx = nonEmptyIdx[0];
  const lastIdx = nonEmptyIdx[nonEmptyIdx.length - 1];

  return rules.map((tokens, i) => {
    if (!tokens.length) return tokens;
    return tokens.map((tok) => {
      if (tok.startsWith('cline:')) return tok;
      if (style === 'hline') return 'hline';
      if (i === firstIdx) return 'toprule';
      if (i === lastIdx) return 'bottomrule';
      return 'midrule';
    });
  });
}

export function defaultTableModel(rows = 2, cols = 2) {
  const columns = Array.from({ length: cols }, () => ({ align: 'l', before: '', after: '' }));
  const dataRows = Array.from({ length: rows }, () => ({
    cells: Array.from({ length: cols }, () => ({
      content: '', colspan: 1, rowspan: 1, align: 'l', width: null,
    })),
  }));
  const rules = Array.from({ length: rows + 1 }, () => []);
  rules[0] = ['toprule'];
  rules[rows] = ['bottomrule'];
  if (rows > 1) rules[1] = ['midrule'];

  return {
    floatEnv: null, placement: null, centering: true, caption: null, label: null,
    env: 'tabular', width: null, columns, rows: dataRows, rules,
  };
}

export function defaultTableRaw(rows, cols) {
  return serializeTableModel(defaultTableModel(rows, cols));
}
