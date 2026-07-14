import {
  buildGrid, addRowBelow, addRowAbove, deleteRow, addColumnAt, deleteColumn, mergeRight, mergeDown,
} from './tableGridOps';
import { defaultTableModel } from './tableSerializer';

function cell(content, extra = {}) {
  return { content, colspan: 1, rowspan: 1, align: 'l', width: null, ...extra };
}

function simpleModel(rows, cols) {
  const model = defaultTableModel(rows, cols);
  model.rows.forEach((r, ri) => r.cells.forEach((c, ci) => { c.content = `${ri},${ci}`; }));
  return model;
}

test('buildGrid marks every plain cell as its own master with span 1', () => {
  const model = simpleModel(2, 2);
  const { grid } = buildGrid(model);
  expect(grid[0][0]).toMatchObject({ kind: 'master', span: 1, rowspan: 1 });
  expect(grid[1][1]).toMatchObject({ kind: 'master', span: 1, rowspan: 1 });
});

test('mergeDown then addRowBelow inside the span grows the merge instead of splitting it', () => {
  let model = simpleModel(3, 2);
  model = mergeDown(model, 0, 0); // (0,0) now spans rows 0-1
  expect(model.rows[0].cells[0].rowspan).toBe(2);
  expect(model.rows[1].cells.length).toBe(1); // column 0 is covered, only column 1's cell remains

  model = addRowBelow(model, 0); // insert a row in the middle of the merge
  expect(model.rows[0].cells[0].rowspan).toBe(3); // grew instead of splitting
  expect(model.rows[1].cells.length).toBe(1); // new row also has no cell at column 0
  expect(model.rows.length).toBe(4);
});

test('deleteRow on the row owning a rowspan promotes the merge to the next row', () => {
  let model = simpleModel(3, 2);
  model = mergeDown(model, 0, 0); // (0,0) spans rows 0-1, content "0,0 1,0"
  model = deleteRow(model, 0);
  expect(model.rows.length).toBe(2);
  expect(model.rows[0].cells[0].rowspan).toBe(1);
  expect(model.rows[0].cells[0].content).toContain('0,0');
});

test('deleteRow on a row covered by a rowspan shrinks the owning merge', () => {
  let model = simpleModel(3, 2);
  model = mergeDown(model, 0, 0); // rows 0-1 merged at column 0
  model = deleteRow(model, 1); // delete the covered row, not the owner
  expect(model.rows.length).toBe(2);
  expect(model.rows[0].cells[0].rowspan).toBe(1);
});

test('addColumnAt inside a multicolumn span grows it instead of splitting', () => {
  let model = simpleModel(2, 3);
  model = mergeRight(model, 0, 0); // row 0: cell0 spans cols 0-1
  expect(model.rows[0].cells[0].colspan).toBe(2);

  model = addColumnAt(model, 1); // insert a column in the middle of the span
  expect(model.rows[0].cells[0].colspan).toBe(3);
  expect(model.rows[0].cells.length).toBe(2); // spanning cell + the untouched trailing cell
  expect(model.rows[1].cells.length).toBe(4); // row 1 wasn't merged, gets a genuine new cell
  expect(model.columns.length).toBe(4);
});

test('deleteColumn shrinks a crossing colspan and removes a plain cell', () => {
  let model = simpleModel(2, 3);
  model = mergeRight(model, 0, 0); // row 0: cell0 spans cols 0-1
  model = deleteColumn(model, 0);
  expect(model.rows[0].cells[0].colspan).toBe(1); // shrank, didn't vanish
  expect(model.rows[1].cells.length).toBe(2); // plain cell in that column was removed
  expect(model.columns.length).toBe(2);
});

test('addRowAbove at the very top just inserts a blank row', () => {
  const model = simpleModel(2, 2);
  const withNewRow = addRowAbove(model, 0);
  expect(withNewRow.rows.length).toBe(3);
  expect(withNewRow.rows[0].cells.map((c) => c.content)).toEqual(['', '']);
});

test('deleteRow refuses to empty the table entirely', () => {
  const model = simpleModel(1, 2);
  const result = deleteRow(model, 0);
  expect(result.rows.length).toBe(1);
});
