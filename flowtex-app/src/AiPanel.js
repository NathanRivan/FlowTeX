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
        {messages.length === 0 && (
          <div className="comment-threads-empty">
            <p>Select text (or place your cursor in a paragraph), then ask for a change.</p>
            <p>e.g. "make this more concise" or "does this need a citation?"</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`ai-message ai-message-${m.role}`}>
            {m.role === 'user' && (
              <>
                <div className="ai-message-text">{m.text}</div>
                {m.contextUsed && <ContextUsed {...m.contextUsed} />}
              </>
            )}

            {m.role === 'assistant' && m.kind === 'text' && (
              <div className="ai-message-text">{m.text}</div>
            )}

            {m.role === 'assistant' && m.kind === 'error' && (
              <div className="ai-message-text ai-message-error">{m.text}</div>
            )}

            {m.role === 'assistant' && m.kind === 'action' && (
              <div className="ai-action-card">
                <div className="ai-action-title">{ACTION_LABEL[m.action]}</div>
                <div className="ai-action-reason">{m.reason}</div>
                {m.resolved === 'accepted' && <span className="resolved-badge">✓ Accepted</span>}
                {m.resolved === 'rejected' && <span className="ai-rejected-badge">Rejected</span>}
                {m.resolved === 'superseded' && <span className="ai-rejected-badge">Superseded</span>}
                {!m.resolved && (
                  <div className="comment-actions">
                    <button onClick={() => onAccept(i)} disabled={!hasSuggestion}><Check size={13} /> Accept</button>
                    <button onClick={() => onReject(i)}><X size={13} /> Reject</button>
                  </div>
                )}
              </div>
            )}

            {m.role === 'assistant' && m.kind === 'citation' && (
              <div className="ai-action-card">
                <div className="ai-action-title">Citation suggestion</div>
                <div className="ai-action-reason">Claim: "{m.claimText}"</div>
                {m.match ? (
                  <>
                    <div className="comment-quote">
                      {m.match.ref.title} — {m.match.ref.authors}{m.match.ref.year ? ` (${m.match.ref.year})` : ''}
                      <span className="reference-offline-badge">{m.match.source === 'library' ? 'in library' : 'CrossRef'}</span>
                    </div>
                    {m.resolved === 'inserted' && <span className="resolved-badge">✓ Inserted</span>}
                    {m.resolved === 'dismissed' && <span className="ai-rejected-badge">Dismissed</span>}
                    {!m.resolved && (
                      <div className="comment-actions">
                        <button onClick={() => onResolveCitation(i, 'insert')}><Check size={13} /> {m.match.source === 'library' ? 'Insert citation' : 'Add to library & cite'}</button>
                        <button onClick={() => onResolveCitation(i, 'dismiss')}><X size={13} /> Dismiss</button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="ai-message-text">No citation found for this claim.</div>
                )}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="ai-message ai-message-assistant"><div className="ai-message-text ai-thinking">Thinking…</div></div>}
      </div>

      <div className="ai-input-row">
        <input
          placeholder="Ask about the selected text…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          disabled={busy}
        />
        <button onClick={submit} disabled={busy || !input.trim()}>Send</button>
      </div>
    </div>
  );
};

export default AiPanel;
