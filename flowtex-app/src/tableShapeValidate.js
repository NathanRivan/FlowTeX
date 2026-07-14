import { buildGrid } from './tableGridOps';

/**
 * Shape-consistency check over an already-parsed table model (see
 * tableParser.js) — this does NOT re-parse LaTeX; it re-uses buildGrid's
 * coverage/occupancy bookkeeping, which is deliberately lenient (it places
 * whatever cells exist and stops rather than erroring) so the editor can
 * always render *something*. This module adds the diagnostics buildGrid
 * intentionally skips: a row whose declared cells don't add up to the
 * column count, and a \multirow that spans past the last row.
 *
 * Returns an array of { rowIndex, cellIndex, message } issues, empty if the
 * table is internally consistent.
 */
export function validateTableShape(model) {
  const issues = [];
  const { grid, nCols, nRows } = buildGrid(model);

  for (let ri = 0; ri < nRows; ri++) {
    const cells = model.rows[ri].cells;

    // Columns in this row already occupied by a \multirow from an earlier
    // row — these don't need (and must not have) a physical cell here.
    let coveredWidth = 0;
    for (let c = 0; c < nCols; c++) {
      const slot = grid[ri][c];
      if (slot && slot.kind === 'covered') coveredWidth++;
    }

    const ownSpanWidth = cells.reduce((sum, cell) => sum + Math.max(1, cell.colspan || 1), 0);
    const expectedCells = nCols - coveredWidth;

    if (ownSpanWidth + coveredWidth !== nCols) {
      const spanNote = ownSpanWidth !== cells.length ? ` spanning ${ownSpanWidth} columns` : '';
      const coverNote = coveredWidth ? ` (${nCols} columns minus ${coveredWidth} covered by \\multirow above)` : '';
      issues.push({
        rowIndex: ri,
        cellIndex: null,
        message: `row ${ri + 1} has ${cells.length} cell${cells.length === 1 ? '' : 's'}${spanNote}, expected ${expectedCells}${coverNote}`,
      });
    }

    // \multirow spans that reach past the last real row.
    cells.forEach((cell, cellIdx) => {
      const rowspan = Math.max(1, cell.rowspan || 1);
      if (ri + rowspan > nRows) {
        issues.push({
          rowIndex: ri,
          cellIndex: cellIdx,
          message: `row ${ri + 1}'s \\multirow{${rowspan}} spans past the end of the table (only ${nRows - ri} row${nRows - ri === 1 ? '' : 's'} remain)`,
        });
      }
    });
  }

  return issues;
}
