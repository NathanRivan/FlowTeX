/**
 * Grid-layout resolution and row/column/merge editing operations over a
 * table model (see tableParser.js). LaTeX's \multirow/\multicolumn mean a
 * row's `cells` array physically omits an entry for every column a previous
 * row's \multirow (or the row's own \multicolumn) already covers — the same
 * "sparse array + occupancy grid" shape browsers use to lay out HTML
 * <table rowspan/colspan>. buildGrid resolves that sparse shape into a full
 * rows x columns grid so the editor can reason in plain (row, col)
 * coordinates; the mutating ops below all read that grid to find which
 * cell "owns" a given boundary before deciding whether an insert/delete
 * should grow/shrink a merge or touch a plain cell.
 */

export function cloneModel(model) {
  return {
    ...model,
    columns: model.columns.map((c) => ({ ...c })),
    rows: model.rows.map((r) => ({ cells: r.cells.map((c) => ({ ...c })) })),
    rules: model.rules.map((r) => [...r]),
  };
}

export function buildGrid(model) {
  const nCols = model.columns.length;
  const nRows = model.rows.length;
  const coverage = Array.from({ length: nRows }, () => new Array(nCols).fill(null));
  const grid = Array.from({ length: nRows }, () => new Array(nCols).fill(null));

  for (let ri = 0; ri < nRows; ri++) {
    const cells = model.rows[ri].cells;
    let c = 0;
    let cellIdx = 0;
    while (c < nCols && cellIdx < cells.length) {
      if (coverage[ri][c]) {
        grid[ri][c] = { kind: 'covered', ownerRi: coverage[ri][c].ri, ownerCellIdx: coverage[ri][c].cellIdx };
        c++;
        continue;
      }
      const cell = cells[cellIdx];
      const span = Math.max(1, cell.colspan || 1);
      const rowspan = Math.max(1, cell.rowspan || 1);
      grid[ri][c] = { kind: 'master', ri, cellIdx, startCol: c, span, rowspan };
      for (let k = 1; k < span && c + k < nCols; k++) {
        grid[ri][c + k] = { kind: 'cont', ownerRi: ri, ownerCellIdx: cellIdx };
      }
      if (rowspan > 1) {
        for (let rr = ri + 1; rr < Math.min(nRows, ri + rowspan); rr++) {
          for (let k = 0; k < span && c + k < nCols; k++) {
            coverage[rr][c + k] = { ri, cellIdx };
          }
        }
      }
      c += span;
      cellIdx++;
    }
  }
  return { grid, nCols, nRows };
}

function ownerOf(grid, ri, c) {
  const slot = grid[ri]?.[c];
  if (!slot) return null;
  if (slot.kind === 'master') return { ri, cellIdx: slot.cellIdx };
  if (slot.kind === 'cont' || slot.kind === 'covered') return { ri: slot.ownerRi, cellIdx: slot.ownerCellIdx };
  return null;
}

function blankCell(align) {
  return { content: '', colspan: 1, rowspan: 1, align, width: null };
}

export function updateCellContent(model, ri, cellIdx, content) {
  const cloned = cloneModel(model);
  cloned.rows[ri].cells[cellIdx].content = content;
  return cloned;
}

export function setColumnAlign(model, ci, patch) {
  const cloned = cloneModel(model);
  cloned.columns[ci] = { ...cloned.columns[ci], ...patch };
  return cloned;
}

export function setCaption(model, caption) {
  return { ...cloneModel(model), caption: caption || null };
}

export function setLabel(model, label) {
  return { ...cloneModel(model), label: label || null };
}

export function setRuleAt(model, boundaryIdx, tokens) {
  const cloned = cloneModel(model);
  cloned.rules[boundaryIdx] = tokens;
  return cloned;
}

// Inserts a blank row directly below row `ri` (or, if ri === -1, at the very
// top). Columns whose rowspan-merge from a row at or above `ri` continues
// past `ri` grow by one instead of getting a new cell — matching what
// \multirow{n} would mean if you typed a new row in the middle of it.
export function addRowBelow(model, ri) {
  const cloned = cloneModel(model);
  const { grid, nCols } = buildGrid(model);
  const newCells = [];
  const bumped = new Set();

  for (let c = 0; c < nCols; c++) {
    const owner = ri >= 0 ? ownerOf(grid, ri, c) : null;
    if (owner) {
      const ownerCell = cloned.rows[owner.ri].cells[owner.cellIdx];
      const rowspan = ownerCell.rowspan || 1;
      if (owner.ri + rowspan - 1 > ri) {
        const key = `${owner.ri}:${owner.cellIdx}`;
        if (!bumped.has(key)) {
          ownerCell.rowspan = rowspan + 1;
          bumped.add(key);
        }
        continue;
      }
    }
    newCells.push(blankCell(cloned.columns[c].align));
  }

  cloned.rows.splice(ri + 1, 0, { cells: newCells });
  cloned.rules.splice(ri + 1, 0, []);
  return cloned;
}

export function addRowAbove(model, ri) {
  if (ri <= 0) {
    const cloned = cloneModel(model);
    const nCols = cloned.columns.length;
    cloned.rows.splice(0, 0, { cells: Array.from({ length: nCols }, (_, c) => blankCell(cloned.columns[c].align)) });
    cloned.rules.splice(0, 0, []);
    return cloned;
  }
  return addRowBelow(model, ri - 1);
}

export function deleteRow(model, ri) {
  const cloned = cloneModel(model);
  const { grid, nCols, nRows } = buildGrid(model);
  if (nRows <= 1) return cloned; // never leave a table with zero rows

  const promotions = [];
  for (let c = 0; c < nCols; c++) {
    const slot = grid[ri][c];
    if (!slot) continue;
    if (slot.kind === 'master') {
      const cell = cloned.rows[ri].cells[slot.cellIdx];
      if ((cell.rowspan || 1) > 1 && !promotions.some((p) => p.cellIdx === slot.cellIdx)) {
        promotions.push({ cellIdx: slot.cellIdx, col: c });
      }
    } else if (slot.kind === 'covered') {
      const ownerCell = cloned.rows[slot.ownerRi].cells[slot.ownerCellIdx];
      ownerCell.rowspan = Math.max(1, (ownerCell.rowspan || 1) - 1);
    }
  }

  if (ri + 1 < nRows && promotions.length) {
    promotions
      .sort((a, b) => a.col - b.col)
      .forEach(({ cellIdx, col }) => {
        const origCell = model.rows[ri].cells[cellIdx];
        const promoted = { ...origCell, rowspan: Math.max(1, (origCell.rowspan || 1) - 1) };
        let insertAt = 0;
        for (let cc = 0; cc < col; cc++) {
          if (grid[ri + 1][cc]?.kind === 'master') insertAt++;
        }
        cloned.rows[ri + 1].cells.splice(insertAt, 0, promoted);
      });
  }

  cloned.rows.splice(ri, 1);
  const removedRule = cloned.rules.splice(ri, 1)[0] || [];
  cloned.rules[ri] = [...(cloned.rules[ri] || []), ...removedRule];
  return cloned;
}

// Inserts a blank column at logical index `insertAt` (0..nCols). A cell
// whose colspan run straddles the boundary on both sides grows by one
// instead of splitting.
export function addColumnAt(model, insertAt) {
  const cloned = cloneModel(model);
  const { grid, nCols, nRows } = buildGrid(model);
  cloned.columns.splice(insertAt, 0, { align: 'l', before: '', after: '' });

  const bumped = new Set();
  for (let ri = 0; ri < nRows; ri++) {
    const leftOwner = insertAt > 0 ? ownerOf(grid, ri, insertAt - 1) : null;
    const rightOwner = insertAt < nCols ? ownerOf(grid, ri, insertAt) : null;
    const crossing = leftOwner && rightOwner && leftOwner.ri === rightOwner.ri && leftOwner.cellIdx === rightOwner.cellIdx;

    if (crossing) {
      const key = `${leftOwner.ri}:${leftOwner.cellIdx}`;
      if (!bumped.has(key)) {
        cloned.rows[leftOwner.ri].cells[leftOwner.cellIdx].colspan =
          (cloned.rows[leftOwner.ri].cells[leftOwner.cellIdx].colspan || 1) + 1;
        bumped.add(key);
      }
      continue;
    }

    // Only rows that would otherwise show a real gap at this column (i.e.
    // aren't already covered by someone else's merge here) get a new cell.
    const coveredHere = rightOwner && rightOwner.ri !== ri && grid[ri][insertAt]?.kind === 'covered';
    if (coveredHere) continue;

    let insertCellIdx = 0;
    for (let cc = 0; cc < insertAt; cc++) {
      if (grid[ri][cc]?.kind === 'master') insertCellIdx++;
    }
    cloned.rows[ri].cells.splice(insertCellIdx, 0, blankCell('l'));
  }

  return cloned;
}

export function deleteColumn(model, ci) {
  const cloned = cloneModel(model);
  const { grid, nRows } = buildGrid(model);
  if (cloned.columns.length <= 1) return cloned;

  for (let ri = 0; ri < nRows; ri++) {
    const slot = grid[ri][ci];
    if (!slot) continue;
    if (slot.kind === 'master') {
      const cell = cloned.rows[ri].cells[slot.cellIdx];
      if ((cell.colspan || 1) > 1) {
        cell.colspan -= 1;
      } else {
        const idx = cloned.rows[ri].cells.indexOf(cell);
        cloned.rows[ri].cells.splice(idx, 1);
      }
    } else if (slot.kind === 'cont') {
      const owner = cloned.rows[slot.ownerRi].cells[slot.ownerCellIdx];
      owner.colspan = Math.max(1, (owner.colspan || 1) - 1);
    }
    // 'covered' slots (rowspan from an earlier row) need no action here —
    // the owning master's colspan was already handled at its own row.
  }

  cloned.columns.splice(ci, 1);
  return cloned;
}

// Merges the cell at (ri, ci) with the cell immediately to its right
// (\multicolumn). Only valid when both are plain (span === 1) siblings in
// the same physical row.
export function mergeRight(model, ri, cellIdx) {
  const cloned = cloneModel(model);
  const cells = cloned.rows[ri].cells;
  if (cellIdx + 1 >= cells.length) return cloned;
  const a = cells[cellIdx];
  const b = cells[cellIdx + 1];
  a.colspan = (a.colspan || 1) + (b.colspan || 1);
  a.content = [a.content, b.content].filter(Boolean).join(' ');
  if (!a.align || a.align === 'l') a.align = model.columns[0]?.align || 'c';
  cells.splice(cellIdx + 1, 1);
  return cloned;
}

// Merges the cell at (ri, ci) with the cell directly below it (\multirow).
// Only valid when the row below has a physical (non-covered) cell at the
// same logical column.
export function mergeDown(model, ri, cellIdx) {
  const { grid, nRows } = buildGrid(model);
  const slot = grid[ri].find((s, c) => s?.kind === 'master' && s.cellIdx === cellIdx && s.ri === ri);
  if (!slot || ri + 1 >= nRows) return cloneModel(model);
  const col = slot.startCol;
  const belowSlot = grid[ri + 1][col];
  if (!belowSlot || belowSlot.kind !== 'master') return cloneModel(model); // already merged/covered there

  const cloned = cloneModel(model);
  const a = cloned.rows[ri].cells[cellIdx];
  const b = cloned.rows[ri + 1].cells[belowSlot.cellIdx];
  a.rowspan = (a.rowspan || 1) + (b.rowspan || 1);
  a.content = [a.content, b.content].filter(Boolean).join(' ');
  if (!a.width) a.width = '*';
  cloned.rows[ri + 1].cells.splice(belowSlot.cellIdx, 1);
  return cloned;
}
