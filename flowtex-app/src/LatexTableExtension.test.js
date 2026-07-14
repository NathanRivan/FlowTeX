import { parseTableSource } from './tableParser';
import { buildPreviewTable } from './LatexTableExtension';

function previewFor(tex) {
  const result = parseTableSource(tex);
  if (!result.ok) throw new Error(`fixture failed to parse: ${result.error}`);
  return buildPreviewTable(result.model).table;
}

describe('buildPreviewTable — vertical column rules from the column spec', () => {
  test('`{l|c|r}` draws a rule to the left of columns 2 and 3, none elsewhere', () => {
    const table = previewFor(`\\begin{tabular}{l|c|r}
  A & B & C \\\\
\\end{tabular}`);
    const [c1, c2, c3] = table.querySelectorAll('tbody > tr td');
    expect(c1.style.borderLeft).toBe('');
    expect(c2.style.borderLeft).not.toBe('');
    expect(c3.style.borderLeft).not.toBe('');
    expect(c3.style.borderRight).toBe('');
  });

  test('a trailing `|` draws a rule on the right edge of the last column', () => {
    const table = previewFor(`\\begin{tabular}{lc|}
  A & B \\\\
\\end{tabular}`);
    const [, c2] = table.querySelectorAll('tbody > tr td');
    expect(c2.style.borderRight).not.toBe('');
  });

  test('a double `||` renders as a double border, not the same as a single `|`', () => {
    const table = previewFor(`\\begin{tabular}{l||c}
  A & B \\\\
\\end{tabular}`);
    const [, c2] = table.querySelectorAll('tbody > tr td');
    expect(c2.style.borderLeft).toContain('double');
  });

  test('no pipes in the column spec means no vertical borders anywhere', () => {
    const table = previewFor(`\\begin{tabular}{lcr}
  A & B & C \\\\
\\end{tabular}`);
    table.querySelectorAll('tbody > tr td').forEach((td) => {
      expect(td.style.borderLeft).toBe('');
      expect(td.style.borderRight).toBe('');
    });
  });

  test('a \\multicolumn cell reaching the last column still gets the trailing rule', () => {
    const table = previewFor(`\\begin{tabular}{lc|}
  \\multicolumn{2}{c}{Merged} \\\\
\\end{tabular}`);
    const [merged] = table.querySelectorAll('tbody > tr td');
    expect(merged.colSpan).toBe(2);
    expect(merged.style.borderRight).not.toBe('');
  });
});

describe('buildPreviewTable — booktabs rules render as their own spacer row', () => {
  test('toprule/midrule/bottomrule each produce a distinct rule row with correct weight', () => {
    const table = previewFor(`\\begin{tabular}{ll}
  \\toprule
  A & B \\\\
  \\midrule
  C & D \\\\
  \\bottomrule
\\end{tabular}`);
    const ruleRows = table.querySelectorAll('tbody > tr.latex-table-rule-row');
    expect(ruleRows).toHaveLength(3);

    const [top, mid, bottom] = ruleRows;
    expect(top.querySelector('td').style.borderTop).toContain('2px');
    expect(mid.querySelector('td').style.borderTop).toContain('1px');
    expect(bottom.querySelector('td').style.borderTop).toContain('2px');

    // full-width: a single cell spanning every column, not one per column
    expect(top.querySelectorAll('td')).toHaveLength(1);
    expect(top.querySelector('td').colSpan).toBe(2);
  });

  test('a boundary with no rule token produces no spacer row at all', () => {
    const table = previewFor(`\\begin{tabular}{ll}
  A & B \\\\
  C & D \\\\
\\end{tabular}`);
    expect(table.querySelectorAll('tbody > tr.latex-table-rule-row')).toHaveLength(0);
    expect(table.querySelectorAll('tbody > tr')).toHaveLength(2);
  });
});

describe('buildPreviewTable — a rule row never breaks \\multirow spanning', () => {
  test('\\hline between the two rows a \\multirow spans inflates the HTML rowSpan to still reach the real row, not the spacer row', () => {
    const table = previewFor(`\\begin{tabular}{lll}
  \\multirow{2}{*}{X} & A & B \\\\
  \\hline
  C & D \\\\
\\end{tabular}`);

    const trs = table.querySelectorAll('tbody > tr');
    // row0, the \hline spacer row, row1 — the spacer must be its own
    // physical row, not swallowed into (or breaking) the multirow's span.
    expect(trs).toHaveLength(3);

    const [row0, spacerRow, row1] = trs;
    expect(row0.classList.contains('latex-table-rule-row')).toBe(false);
    expect(spacerRow.classList.contains('latex-table-rule-row')).toBe(true);
    expect(row1.classList.contains('latex-table-rule-row')).toBe(false);

    const multirowCell = row0.querySelector('td');
    expect(multirowCell.textContent).toBe('X');
    // Logical rowspan is 2, but one rule row was inserted inside that span,
    // so the physical HTML rowSpan must be 3 to still land on row1.
    expect(multirowCell.rowSpan).toBe(3);

    // row1 must have exactly its own two cells (C, D) — not a stray extra
    // cell from the multirow's span landing in the wrong physical row.
    const row1Cells = row1.querySelectorAll('td');
    expect(row1Cells).toHaveLength(2);
    expect(row1Cells[0].textContent).toBe('C');
    expect(row1Cells[1].textContent).toBe('D');
  });

  test('a \\multirow with no rule inside its span keeps a plain, unadjusted rowSpan', () => {
    const table = previewFor(`\\begin{tabular}{ll}
  \\multirow{2}{*}{X} & A \\\\
  B \\\\
\\end{tabular}`);
    const multirowCell = table.querySelector('tbody > tr td');
    expect(multirowCell.rowSpan).toBe(2);
  });
});

describe('buildPreviewTable — \\cline renders a partial-width rule', () => {
  test('\\cline{2-3} only borders columns 2 and 3, not column 1', () => {
    const table = previewFor(`\\begin{tabular}{lll}
  A & B & C \\\\
  \\cline{2-3}
  D & E & F \\\\
\\end{tabular}`);
    const ruleRow = table.querySelector('tbody > tr.latex-table-rule-row');
    const cells = ruleRow.querySelectorAll('td');
    expect(cells).toHaveLength(3);
    expect(cells[0].style.borderTop).toBe('');
    expect(cells[1].style.borderTop).not.toBe('');
    expect(cells[2].style.borderTop).not.toBe('');
  });

  test('two \\cline ranges in the same boundary both render', () => {
    const table = previewFor(`\\begin{tabular}{llll}
  A & B & C & D \\\\
  \\cline{1-1}\\cline{3-4}
  E & F & G & H \\\\
\\end{tabular}`);
    const ruleRow = table.querySelector('tbody > tr.latex-table-rule-row');
    const cells = ruleRow.querySelectorAll('td');
    expect(cells[0].style.borderTop).not.toBe('');
    expect(cells[1].style.borderTop).toBe('');
    expect(cells[2].style.borderTop).not.toBe('');
    expect(cells[3].style.borderTop).not.toBe('');
  });

  test('\\hline alongside other rows still renders full-width (not per-cline)', () => {
    const table = previewFor(`\\begin{tabular}{ll}
  A & B \\\\
  \\hline
  C & D \\\\
\\end{tabular}`);
    const ruleRow = table.querySelector('tbody > tr.latex-table-rule-row');
    expect(ruleRow.querySelectorAll('td')).toHaveLength(1);
  });
});
