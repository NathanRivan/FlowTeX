import React, { useMemo, useState } from 'react';
import { parseTableSource } from './tableParser';
import { serializeTableModel, convertRulesToStyle } from './tableSerializer';
import {
  buildGrid, cloneModel, updateCellContent, setColumnAlign, setCaption, setLabel,
  addRowAbove, addRowBelow, deleteRow, addColumnAt, deleteColumn, mergeRight, mergeDown,
} from './tableGridOps';

const ALIGN_OPTIONS = [
  { value: 'l', label: 'Left' },
  { value: 'c', label: 'Center' },
  { value: 'r', label: 'Right' },
  { value: 'S', label: 'S (siunitx numbers)' },
];

function detectStyle(rules) {
  const tokens = rules.flat();
  if (tokens.some((t) => t === 'toprule' || t === 'midrule' || t === 'bottomrule')) return 'booktabs';
  if (tokens.some((t) => t === 'hline')) return 'hline';
  return 'booktabs';
}

function toggleBoundary(model, idx, style) {
  const has = (model.rules[idx] || []).length > 0;
  if (has) return { ...cloneModel(model), rules: model.rules.map((r, i) => (i === idx ? [] : r)) };
  const isFirst = idx === 0;
  const isLast = idx === model.rules.length - 1;
  const token = style === 'hline' ? 'hline' : isFirst ? 'toprule' : isLast ? 'bottomrule' : 'midrule';
  const cloned = cloneModel(model);
  cloned.rules[idx] = [token];
  return cloned;
}

const TableEditModal = ({ initialRaw, onUpdate, onClose }) => {
  const parsed = useMemo(() => parseTableSource(initialRaw), [initialRaw]);
  const [model, setModel] = useState(parsed.ok ? parsed.model : null);
  const [rawMode, setRawMode] = useState(!parsed.ok);
  const [rawText, setRawText] = useState(initialRaw || '');
  const [style, setStyle] = useState(parsed.ok ? detectStyle(parsed.model.rules) : 'booktabs');
  const [rawError, setRawError] = useState(null);

  const switchToVisual = () => {
    const reparsed = parseTableSource(rawText);
    if (!reparsed.ok) {
      setRawError(reparsed.error);
      return;
    }
    setModel(reparsed.model);
    setStyle(detectStyle(reparsed.model.rules));
    setRawError(null);
    setRawMode(false);
  };

  const handleApply = () => {
    if (rawMode) {
      onUpdate(rawText);
    } else if (model) {
      onUpdate(serializeTableModel(model));
    }
    onClose();
  };

  const handleStyleChange = (newStyle) => {
    setStyle(newStyle);
    if (!model) return;
    setModel({ ...cloneModel(model), rules: convertRulesToStyle(model.rules, newStyle) });
  };

  if (rawMode || !model) {
    return (
      <div className="math-side-panel table-edit-panel">
        <div className="math-panel-header">
          <h3>Table Editor (raw mode)</h3>
          <div className="table-panel-header-actions">
            <button onClick={switchToVisual} title="Switch to visual editor">⊞</button>
            <button onClick={onClose} title="Close (Esc)">✕</button>
          </div>
        </div>
        <div className="math-editor-body">
          {!parsed.ok && !rawError && (
            <p className="math-hint">
              This table uses LaTeX the visual editor doesn't support yet ({parsed.error}).
              You can still edit it as raw source below — it won't be corrupted.
            </p>
          )}
          {rawError && (
            <p className="math-hint math-hint-error">
              Can't switch to visual editor: {rawError}
            </p>
          )}
          <textarea
            className="math-textarea table-raw-textarea"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={16}
          />
        </div>
        <div className="math-panel-actions">
          <button onClick={handleApply}>Apply</button>
          <button onClick={onClose}>Cancel (Esc)</button>
        </div>
      </div>
    );
  }

  const { grid, nCols, nRows } = buildGrid(model);

  return (
    <div className="math-side-panel table-edit-panel table-edit-panel--wide">
      <div className="math-panel-header">
        <h3>Table Editor</h3>
        <div className="table-panel-header-actions">
          <button onClick={() => { setRawText(serializeTableModel(model)); setRawMode(true); }} title="Edit as raw LaTeX">{'</>'}</button>
          <button onClick={onClose} title="Close (Esc)">✕</button>
        </div>
      </div>

      <div className="math-editor-body table-edit-body">
        <div className="table-edit-toolbar">
          <label>
            Border style:
            <select value={style} onChange={(e) => handleStyleChange(e.target.value)}>
              <option value="booktabs">booktabs (toprule/midrule/bottomrule)</option>
              <option value="hline">hline</option>
            </select>
          </label>
        </div>

        <div className="table-edit-grid-scroll">
          <table className="table-edit-grid">
            <thead>
              <tr>
                <th className="table-edit-gutter" />
                {model.columns.map((col, ci) => (
                  <th key={ci} className="table-edit-colhead">
                    <select
                      value={col.align}
                      onChange={(e) => setModel(setColumnAlign(model, ci, { align: e.target.value }))}
                    >
                      {ALIGN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {col.align === 'S' && (
                      <input
                        className="table-edit-scol-opts"
                        placeholder="table-format=1.2"
                        value={col.sOptions || ''}
                        onChange={(e) => setModel(setColumnAlign(model, ci, { sOptions: e.target.value }))}
                      />
                    )}
                    <div className="table-edit-col-actions">
                      <button onClick={() => setModel(addColumnAt(model, ci))} title="Insert column left">+←</button>
                      <button onClick={() => setModel(addColumnAt(model, ci + 1))} title="Insert column right">+→</button>
                      <button onClick={() => setModel(deleteColumn(model, ci))} title="Delete column" disabled={model.columns.length <= 1}>✕</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: nRows }, (_, ri) => (
                <React.Fragment key={ri}>
                  <tr className="table-edit-rulerow">
                    <td className="table-edit-gutter" />
                    <td colSpan={nCols} className="table-edit-rule-cell">
                      <button
                        className={(model.rules[ri] || []).length ? 'active' : ''}
                        onClick={() => setModel(toggleBoundary(model, ri, style))}
                        title="Toggle rule above this row"
                      >
                        {(model.rules[ri] || []).length ? (model.rules[ri][0]) : '— no rule —'}
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="table-edit-gutter">
                      <div className="table-edit-row-actions">
                        <button onClick={() => setModel(addRowAbove(model, ri))} title="Insert row above">+↑</button>
                        <button onClick={() => setModel(addRowBelow(model, ri))} title="Insert row below">+↓</button>
                        <button onClick={() => setModel(deleteRow(model, ri))} title="Delete row" disabled={nRows <= 1}>✕</button>
                      </div>
                    </td>
                    {Array.from({ length: nCols }, (_, ci) => {
                      const slot = grid[ri][ci];
                      if (!slot || slot.kind !== 'master') return null;
                      const cell = model.rows[ri].cells[slot.cellIdx];
                      return (
                        <td key={ci} colSpan={slot.span} rowSpan={slot.rowspan} className="table-edit-cell">
                          <input
                            value={cell.content}
                            onChange={(e) => setModel(updateCellContent(model, ri, slot.cellIdx, e.target.value))}
                          />
                          <div className="table-edit-cell-actions">
                            <button
                              onClick={() => setModel(mergeRight(model, ri, slot.cellIdx))}
                              title="Merge with cell to the right (\\multicolumn)"
                              disabled={slot.startCol + slot.span >= nCols}
                            >⇥</button>
                            <button
                              onClick={() => setModel(mergeDown(model, ri, slot.cellIdx))}
                              title="Merge with cell below (\\multirow)"
                              disabled={ri + slot.rowspan >= nRows}
                            >⤓</button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              ))}
              <tr className="table-edit-rulerow">
                <td className="table-edit-gutter" />
                <td colSpan={nCols} className="table-edit-rule-cell">
                  <button
                    className={(model.rules[nRows] || []).length ? 'active' : ''}
                    onClick={() => setModel(toggleBoundary(model, nRows, style))}
                    title="Toggle rule below the last row"
                  >
                    {(model.rules[nRows] || []).length ? model.rules[nRows][0] : '— no rule —'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="table-edit-meta">
          <label>
            Caption
            <input value={model.caption || ''} onChange={(e) => setModel(setCaption(model, e.target.value))} placeholder="(none)" />
          </label>
          <label>
            Label
            <input value={model.label || ''} onChange={(e) => setModel(setLabel(model, e.target.value))} placeholder="tab:my-table" />
          </label>
        </div>
      </div>

      <div className="math-panel-actions">
        <button onClick={handleApply}>Apply</button>
        <button onClick={onClose}>Cancel (Esc)</button>
      </div>
    </div>
  );
};

export default TableEditModal;
