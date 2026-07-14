import React, { useState, useRef } from 'react';

const ImportLatexModal = ({ onImport, onClose }) => {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setText(e.target.result || '');
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="source-modal" onClick={(e) => e.stopPropagation()}>
        <div className="source-modal-header">
          <h3>Import LaTeX</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontFamily: '-apple-system, sans-serif', lineHeight: 1.5 }}>
            Paste .tex source below, or load a .tex file directly. This replaces the current document content.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ alignSelf: 'flex-start', background: 'var(--hover-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
          >
            {fileName ? `Loaded: ${fileName}` : 'Choose .tex file…'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".tex,text/x-tex,text/plain"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <textarea
            className="math-textarea"
            rows={14}
            value={text}
            onChange={(e) => { setText(e.target.value); setFileName(''); }}
            placeholder={'\\documentclass{article}\n\\begin{document}\n...\n\\end{document}'}
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className="source-modal-actions">
          <button onClick={() => text.trim() && onImport(text)} disabled={!text.trim()}>
            Import
          </button>
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

export default ImportLatexModal;
