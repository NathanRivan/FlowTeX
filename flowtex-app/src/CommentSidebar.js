import React, { useEffect, useRef } from 'react';

const CommentSidebar = ({ threads, activeId, onSelect, onReply, onResolve, onDelete, onClose }) => {
  const threadRefs = useRef({});
  const inputRefs = useRef({});
  const listRef = useRef(null);

  useEffect(() => {
    const el = activeId && threadRefs.current[activeId];
    const list = listRef.current;
    if (!el || !list) return;
    const elRect = el.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const above = elRect.top < listRect.top;
    const below = elRect.bottom > listRect.bottom;
    if (above || below) {
      list.scrollTop += (elRect.top - listRect.top) - (list.clientHeight / 2 - el.offsetHeight / 2);
    }
  }, [activeId, threads]);

  // Auto-focus the input when a new (empty) thread becomes active
  useEffect(() => {
    if (!activeId) return;
    const thread = threads.find(t => t.id === activeId);
    if (thread && !thread.text) {
      setTimeout(() => inputRefs.current[activeId]?.focus(), 50);
    }
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="comment-sidebar">
      <div className="comment-sidebar-header">
        <h3>Comments</h3>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="comment-threads-list" ref={listRef}>
        {threads.length === 0 && (
          <div className="comment-threads-empty">
            <p>No comments yet.</p>
            <p>Select text and click <strong>+</strong> to add one.</p>
          </div>
        )}
        {threads.map(thread => (
          <div
            key={thread.id}
            ref={el => (threadRefs.current[thread.id] = el)}
            className={`comment-thread${activeId === thread.id ? ' active' : ''}${thread.resolved ? ' resolved' : ''}`}
            onClick={() => onSelect(thread.id)}
          >
            {thread.quote && (
              <div className="comment-quote">"{thread.quote}"</div>
            )}

            {thread.text && (
              <div className="comment-body">{thread.text}</div>
            )}

            {thread.replies.map((reply, idx) => (
              <div key={idx} className="comment-reply">{reply}</div>
            ))}

            {!thread.resolved && (
              <div className="reply-form" onClick={e => e.stopPropagation()}>
                <input
                  ref={el => (inputRefs.current[thread.id] = el)}
                  placeholder={thread.text ? 'Reply…' : 'Add a comment…'}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      onReply(thread.id, e.target.value.trim());
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            )}

            <div className="comment-meta">
              <span className="comment-date">
                {new Date(thread.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="comment-actions">
                {thread.resolved
                  ? <span className="resolved-badge">✓ Resolved</span>
                  : <button onClick={e => { e.stopPropagation(); onResolve(thread.id); }}>Resolve</button>
                }
                <button onClick={e => { e.stopPropagation(); onDelete(thread.id); }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommentSidebar;
