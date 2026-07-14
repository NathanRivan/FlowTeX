import React, { useState } from 'react';

const OutlineSidebar = ({ headings, onSelect, onClose }) => {
  const [activePos, setActivePos] = useState(null);

  return (
    <div className="outline-sidebar">
      <div className="outline-sidebar-header">
        <h3>Outline</h3>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="outline-list">
        {headings.length === 0 && (
          <div className="outline-empty">
            <p>No headings yet.</p>
            <p>Add a heading to build an outline.</p>
          </div>
        )}
        {headings.map((h, i) => (
          <div
            key={i}
            className={`outline-item outline-level-${h.level}${activePos === h.pos ? ' active' : ''}`}
            onClick={() => { setActivePos(h.pos); onSelect(h.pos); }}
          >
            <span className="outline-item-text">{h.text || 'Untitled heading'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OutlineSidebar;
