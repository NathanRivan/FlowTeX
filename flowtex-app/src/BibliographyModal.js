import React, { useState } from 'react';

const BibliographyModal = ({ initialBibliography, onSave, onClose }) => {
  const [bibliography, setBibliography] = useState(initialBibliography || '');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="source-modal" onClick={(e) => e.stopPropagation()}>
        <div className="source-modal-header">
          <h3>Bibliography (.bib)</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontFamily: '-apple-system, sans-serif', lineHeight: 1.5 }}>
            Paste your <code>.bib</code> source here. <code>\cite</code>/<code>\citep</code>/<code>\citet</code>
            commands anywhere in the document are checked against these entry keys.
          </p>
          <textarea
            className="math-textarea"
            rows={16}
            value={bibliography}
            onChange={(e) => setBibliography(e.target.value)}
            placeholder={`@article{smith2020,\n  author = {Smith, J.},\n  title = {A Paper},\n  year = {2020}\n}`}
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className="source-modal-actions">
          <button onClick={() => onSave(bibliography)}>Save &amp; Apply</button>
          <button
            onClick={onClose}
            style={{ background: 'var(--hover-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BibliographyModal;
