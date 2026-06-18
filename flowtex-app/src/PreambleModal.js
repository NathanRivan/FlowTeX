import React, { useState } from 'react';

const PreambleModal = ({ initialPreamble, onSave, onClose }) => {
  const [preamble, setPreamble] = useState(initialPreamble || '');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="source-modal" onClick={(e) => e.stopPropagation()}>
        <div className="source-modal-header">
          <h3>Document Preamble</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontFamily: '-apple-system, sans-serif', lineHeight: 1.5 }}>
            Define custom <code>\newcommand</code>, <code>\newtheorem</code>, and other macros here.
            They will be applied to all math and imported LaTeX.
          </p>
          <textarea
            className="math-textarea"
            rows={12}
            value={preamble}
            onChange={(e) => setPreamble(e.target.value)}
            placeholder={`\\newcommand{\\cA}{\\mathcal{A}}\n\\newcommand{\\R}{\\mathbb{R}}`}
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className="source-modal-actions">
          <button onClick={() => onSave(preamble)}>Save &amp; Apply</button>
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

export default PreambleModal;
