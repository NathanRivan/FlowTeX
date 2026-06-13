import React, { useState } from 'react';

const PreambleModal = ({ initialPreamble, onSave, onClose }) => {
  const [preamble, setPreamble] = useState(initialPreamble || '');

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        background: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '80%',
        maxWidth: '700px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 0 20px rgba(0,0,0,0.3)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="source-modal-header">
        <h3>Document Preamble</h3>
        <button onClick={onClose}>✕</button>
      </div>
      <p style={{ fontSize: '13px', color: '#555' }}>
        Paste your custom <code>\newcommand</code>, <code>\newtheorem</code>, and other definitions here.
        They will be applied to all math and imported LaTeX.
      </p>
      <textarea
        className="math-textarea"
        rows={12}
        value={preamble}
        onChange={(e) => setPreamble(e.target.value)}
        placeholder="\newcommand{\cA}{\mathcal{A}}&#10;\newcommand{\R}{\mathbb{R}}"
      />
      <div className="source-modal-actions">
        <button onClick={() => onSave(preamble)}>Save & Apply</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

export default PreambleModal;