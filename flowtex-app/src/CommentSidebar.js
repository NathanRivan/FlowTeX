import React from 'react';
import { useEffect, useRef } from 'react';

const CommentSidebar = ({ threads, activeId, onSelect, onReply, onResolve, onDelete, onClose }) => {
  const threadRefs = useRef({});
  const listRef = useRef(null);

  useEffect(() => {
    const el = activeId && threadRefs.current[activeId];
    const list = listRef.current;
    if (!el || !list) return;
    // Scroll only WITHIN the sidebar list — never use scrollIntoView here, which
    // would also scroll the main editor window (jumping the user away from their
    // place). Adjust the list's own scrollTop to bring the active thread into view.
    const elRect = el.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const above = elRect.top < listRect.top;
    const below = elRect.bottom > listRect.bottom;
    if (above || below) {
      const delta = (elRect.top - listRect.top) - (list.clientHeight / 2 - el.offsetHeight / 2);
      list.scrollTop += delta;
    }
  }, [activeId, threads]);

  return (
    <div className="comment-sidebar">
      <div className="comment-sidebar-header">
        <h3>Comments</h3>
        <button className="close-btn" onClick={onClose} aria-label="Close comments">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="comment-threads-list" ref={listRef}>
        {threads.length === 0 && (
          <p className="comment-threads-empty">No comments yet.</p>
        )}
        {threads.map(thread => (
          <div
            key={thread.id}
            ref={el => (threadRefs.current[thread.id] = el)}
            className={`comment-thread ${activeId === thread.id ? 'active' : ''}`}
            onClick={() => onSelect(thread.id)}
          >
            <div className="comment-header">
              <span className="comment-date">{thread.createdAt.toLocaleTimeString()}</span>
              {thread.resolved && <span className="resolved-badge">✓ Resolved</span>}
            </div>
            <div className="comment-body">{thread.text}</div>
            {thread.replies.map((reply, idx) => (
              <div key={idx} className="comment-reply">{reply}</div>
            ))}
            <div className="comment-actions">
              {!thread.resolved && (
                <button onClick={(e) => { e.stopPropagation(); onResolve(thread.id); }}>Resolve</button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onDelete(thread.id); }}>Delete</button>
            </div>
            <div className="reply-form">
              <input
                placeholder="Reply…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    onReply(thread.id, e.target.value.trim());
                    e.target.value = '';
                  }
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommentSidebar;
