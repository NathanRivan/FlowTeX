import { parseTableSource } from './tableParser';
import { validateTableShape } from './tableShapeValidate';

function modelOf(tex) {
  const result = parseTableSource(tex);
  if (!result.ok) throw new Error(`fixture failed to parse: ${result.error}`);
  return result.model;
}

describe('validateTableShape — valid tables produce zero issues', () => {
  test('simple table, every row matches the column count', () => {
    const model = modelOf(`\\begin{tabular}{lcc}
  A & B & C \\\\
  D & E & F \\\\
\\end{tabular}`);
    expect(validateTableShape(model)).toEqual([]);
  });

  test('\\multicolumn correctly reduces effective cell count', () => {
    const model = modelOf(`\\begin{tabular}{lcc}
  \\multicolumn{2}{c}{Merged} & C \\\\
  D & E & F \\\\
\\end{tabular}`);
    expect(validateTableShape(model)).toEqual([]);
  });

  test('\\multirow correctly reduces effective cell count in the covered row', () => {
    // The column covered by \multirow from the row above gets no `&` at all
    // in the following row — that's how tableGridOps' coverage tracking
    // expects a well-formed multirow table to be written.
    const model = modelOf(`\\begin{tabular}{ll}
  \\multirow{2}{*}{Spans} & B1 \\\\
  B2 \\\\
\\end{tabular}`);
    expect(validateTableShape(model)).toEqual([]);
  });

  test('edge case: \\multirow and \\multicolumn combined in one table (structurally unusual, still valid)', () => {
    const model = modelOf(`\\begin{tabular}{llll}
  \\multirow{2}{*}{X} & \\multicolumn{2}{c}{Merged} & D \\\\
  E & F & G \\\\
\\end{tabular}`);
    expect(validateTableShape(model)).toEqual([]);
  });
});

describe('validateTableShape — invalid tables are flagged with a specific message', () => {
  test('a row with fewer cells than the column spec', () => {
    const model = modelOf(`\\begin{tabular}{lcc}
  A & B & C \\\\
  D & E \\\\
\\end{tabular}`);
    const issues = validateTableShape(model);
    expect(issues).toHaveLength(1);
    expect(issues[0].rowIndex).toBe(1);
    expect(issues[0].message).toBe('row 2 has 2 cells, expected 3');
  });

  test('a row with more cells than the column spec', () => {
    const model = modelOf(`\\begin{tabular}{lcc}
  A & B & C \\\\
  D & E & F & G \\\\
\\end{tabular}`);
    const issues = validateTableShape(model);
    expect(issues).toHaveLength(1);
    expect(issues[0].rowIndex).toBe(1);
    expect(issues[0].message).toBe('row 2 has 4 cells, expected 3');
  });

  test('\\multirow spanning past the last row', () => {
    const model = modelOf(`\\begin{tabular}{ll}
  \\multirow{3}{*}{X} & B1 \\\\
  B2 \\\\
\\end{tabular}`);
    const issues = validateTableShape(model);
    expect(issues).toHaveLength(1);
    expect(issues[0].rowIndex).toBe(0);
    expect(issues[0].message).toMatch(/multirow\{3\} spans past the end/);
  });
});
