import { Node } from '@tiptap/core';
import { parseTableSource } from './tableParser';
import { validateTableShape } from './tableShapeValidate';
import { buildGrid } from './tableGridOps';

const RULE_THICK = new Set(['toprule', 'bottomrule']);
const FULL_WIDTH_RULES = new Set(['hline', 'toprule', 'midrule', 'bottomrule']);

function ruleBorderStyle(tokens) {
  if (!tokens || !tokens.length) return '';
  const thick = tokens.some((t) => RULE_THICK.has(t));
  return thick ? '2px solid #222' : '1px solid #666';
}

function alignFor(align) {
  if (align === 'r') return 'right';
  if (align === 'c' || align === 'S') return 'center';
  return 'left';
}

function pipeCount(str) {
  return (str || '').split('').filter((c) => c === '|').length;
}

function verticalBorderStyle(count) {
  if (!count) return '';
  return count >= 2 ? '3px double #666' : '1px solid #666';
}

// \toprule/\midrule/\bottomrule/\hline/\cline render as their own spacer
// row (see the CSS note in Editor.css) rather than a border on the
// adjacent content row — this is also the only way to render \cline{a-b}
// correctly, since it's a *partial*-width rule under just columns a..b,
// not the full row buildPreviewTable used to draw for every rule token.
function buildRuleRow(tokens, nCols) {
  const tr = document.createElement('tr');
  tr.className = 'latex-table-rule-row';

  const fullWidth = (tokens || []).some((t) => FULL_WIDTH_RULES.has(t));
  const clineTokens = (tokens || []).filter((t) => typeof t === 'string' && t.startsWith('cline:'));

  if (fullWidth || !clineTokens.length) {
    const td = document.createElement('td');
    td.colSpan = nCols;
    const style = ruleBorderStyle(tokens);
    if (style) td.style.borderTop = style;
    tr.appendChild(td);
    return tr;
  }

  const ranges = clineTokens.map((t) => t.slice('cline:'.length).split('-').map(Number));
  for (let col = 1; col <= nCols; col++) {
    const td = document.createElement('td');
    if (ranges.some(([a, b]) => col >= a && col <= b)) td.style.borderTop = '1px solid #666';
    tr.appendChild(td);
  }
  return tr;
}

// Groups validateTableShape's flat issue list by where each one attaches:
// a whole row (cellIndex === null) or one specific cell within it.
function groupShapeIssues(issues) {
  const rowMessages = new Map();
  const cellMessages = new Map();
  issues.forEach(({ rowIndex, cellIndex, message }) => {
    if (cellIndex != null) {
      const key = `${rowIndex}:${cellIndex}`;
      if (!cellMessages.has(key)) cellMessages.set(key, []);
      cellMessages.get(key).push(message);
    } else {
      if (!rowMessages.has(rowIndex)) rowMessages.set(rowIndex, []);
      rowMessages.get(rowIndex).push(message);
    }
  });
  return { rowMessages, cellMessages };
}

// Exported for testing — see LatexTableExtension.test.js.
export function buildPreviewTable(model) {
  const table = document.createElement('table');
  table.className = 'latex-table-preview';

  const shapeIssues = validateTableShape(model);
  const { rowMessages, cellMessages } = groupShapeIssues(shapeIssues);
  const { grid, nCols } = buildGrid(model);

  // Vertical rules from the column spec (e.g. `{l|c|r}`) — a `\multicolumn`
  // cell's own alignment argument can in principle override these, but
  // tableParser doesn't retain that (see its parseCell), so this uses the
  // base column spec for every cell, multicolumn included. Good enough for
  // the overwhelmingly common case of plain vertical-rule tables.
  const verticalBefore = model.columns.map((c) => pipeCount(c.before));
  const verticalAfterLast = pipeCount(model.columns[model.columns.length - 1]?.after);

  const tbody = document.createElement('tbody');

  // Rules render as extra *physical* <tr> spacer rows (see buildRuleRow),
  // but HTML's rowSpan counts physical rows, not logical table rows — a
  // \multirow spanning across a rule boundary would otherwise reach into
  // the spacer row instead of the real next row, leaving a stray
  // misaligned cell. ruleRowExists lets cell rowSpans absorb those extra
  // physical rows so they still land on the correct final row.
  const ruleRowExists = model.rules.map((tokens) => !!(tokens && tokens.length));
  const htmlRowSpanFor = (ri, rowspan) => {
    let span = rowspan;
    for (let b = ri + 1; b <= ri + rowspan - 1; b++) {
      if (ruleRowExists[b]) span++;
    }
    return span;
  };

  const appendRuleRow = (boundaryIdx) => {
    const tokens = model.rules[boundaryIdx];
    if (tokens && tokens.length) tbody.appendChild(buildRuleRow(tokens, nCols));
  };

  appendRuleRow(0);
  model.rows.forEach((row, ri) => {
    const tr = document.createElement('tr');
    const masterByCellIdx = new Map();
    (grid[ri] || []).forEach((slot) => {
      if (slot?.kind === 'master') masterByCellIdx.set(slot.cellIdx, slot);
    });

    row.cells.forEach((cell, ci) => {
      const td = document.createElement('td');
      td.textContent = cell.content;
      td.style.textAlign = alignFor(cell.align);
      if (cell.colspan > 1) td.colSpan = cell.colspan;
      if (cell.rowspan > 1) td.rowSpan = htmlRowSpanFor(ri, cell.rowspan);

      const slot = masterByCellIdx.get(ci);
      const startCol = slot ? slot.startCol : ci;
      const span = slot ? slot.span : (cell.colspan || 1);
      const leftBorder = verticalBorderStyle(verticalBefore[startCol]);
      if (leftBorder) td.style.borderLeft = leftBorder;
      if (startCol + span - 1 === nCols - 1) {
        const rightBorder = verticalBorderStyle(verticalAfterLast);
        if (rightBorder) td.style.borderRight = rightBorder;
      }

      const cellMsgs = cellMessages.get(`${ri}:${ci}`);
      if (cellMsgs) {
        td.classList.add('table-shape-error-cell');
        td.title = cellMsgs.join('\n');
      }
      tr.appendChild(td);
    });
    const rowMsgs = rowMessages.get(ri);
    if (rowMsgs) {
      tr.classList.add('table-shape-error-row');
      tr.title = rowMsgs.join('\n');
    }
    tbody.appendChild(tr);
    appendRuleRow(ri + 1);
  });
  table.appendChild(tbody);

  if (model.caption) {
    const caption = document.createElement('caption');
    caption.textContent = model.caption;
    table.appendChild(caption);
  }

  return { table, shapeIssues };
}

function buildRawFallback(raw, error) {
  const wrap = document.createElement('div');
  wrap.className = 'latex-table-raw-fallback';
  const label = document.createElement('div');
  label.className = 'latex-table-raw-label';
  label.textContent = `Can't edit this table visually yet (${error}) — click to edit as raw LaTeX`;
  const pre = document.createElement('pre');
  pre.textContent = raw;
  wrap.appendChild(label);
  wrap.appendChild(pre);
  return wrap;
}

export const LatexTableExtension = Node.create({
  name: 'latexTable',
  group: 'block',
  atom: true,
  isolating: true,

  addAttributes() {
    return {
      raw: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-table-src]',
        getAttrs: (dom) => ({ raw: dom.getAttribute('data-table-src') }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const raw = node.attrs.raw || '';
    return ['div', { 'data-table-src': raw, ...HTMLAttributes }, raw];
  },

  addNodeView() {
    return (props) => {
      const { node, getPos } = props;
      const dom = document.createElement('div');
      dom.classList.add('latex-table-node');
      dom.setAttribute('title', 'Click to edit table');

      const render = (attrs) => {
        dom.innerHTML = '';
        dom.classList.remove('latex-table-node--error');
        const result = parseTableSource(attrs.raw);
        if (result.ok) {
          dom.classList.remove('latex-table-node--raw');
          const { table, shapeIssues } = buildPreviewTable(result.model);
          dom.appendChild(table);
          if (shapeIssues.length) {
            dom.classList.add('latex-table-node--error');
            const icon = document.createElement('span');
            icon.className = 'table-error-icon';
            icon.textContent = '⚠';
            icon.title = shapeIssues.map((i) => i.message).join('\n');
            dom.appendChild(icon);
          }
        } else {
          dom.classList.add('latex-table-node--raw');
          dom.appendChild(buildRawFallback(attrs.raw, result.error));
        }
      };

      render(node.attrs);

      dom.addEventListener('click', (e) => {
        const pos = getPos?.();
        if (pos !== undefined && window.flumenwriteTableEdit) {
          e.stopPropagation();
          window.flumenwriteTableEdit(() => getPos(), node.attrs.raw);
        }
      });

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          node.attrs = { ...updatedNode.attrs };
          render(node.attrs);
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      insertLatexTable:
        (raw) =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'latexTable',
            attrs: { raw },
          });
        },
    };
  },
});
