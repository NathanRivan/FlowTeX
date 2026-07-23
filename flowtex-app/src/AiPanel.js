import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';

const ACTION_LABEL = {
  propose_rewrite: 'Proposed rewrite',
  propose_delete: 'Proposed deletion',
};

const ContextUsed = ({ scopeText, orientation }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="ai-context-used">
      <button className="ai-context-toggle" onClick={() => setOpen(o => !o)}>
        <ChevronDown size={12} className={open ? 'ai-context-chevron open' : 'ai-context-chevron'} />
        Context used
      </button>
      {open && (
        <div className="ai-context-detail">
          {orientation?.title && <div><strong>Title:</strong> {orientation.title}</div>}
          {orientation?.outline?.length > 0 && <div><strong>Outline:</strong> {orientation.outline.join(' / ')}</div>}
          {orientation?.abstract && <div><strong>Abstract:</strong> {orientation.abstract}</div>}
          <div><strong>Selected text:</strong> "{scopeText}"</div>
        </div>
      )}
    </div>
  );
};

const AiPanel = ({ messages, busy, hasSuggestion, onSend, onAccept, onReject, onResolveCitation, onClose }) => {
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

  const submit = () => {
    const text = input.trim();
    if (!text || busy) return;
    onSend(text);
    setInput('');
  };

  return (
    <div className="comment-sidebar ai-panel">
      <div className="comment-sidebar-header">
        <h3>AI Assistant</h3>
        <button className="close-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </div>

      <div className="ai-messages" ref={listRef}>
        <div className="comment-threads-empty">
          <p><strong>⚠ Work in progress</strong></p>
          <p>The AI assistant is still being developed and is not yet available.</p>
          <p>This feature will be released in a future update.</p>
        </div>
      </div>

      <div className="ai-input-row">
        <input
          placeholder="Work in progress — coming soon"
          disabled
        />
        <button disabled>Send</button>
      </div>
    </div>
  );
};

export default AiPanel;
