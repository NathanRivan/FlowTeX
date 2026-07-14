import React from 'react';

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

// Groups versions into same-day buckets (Today / Yesterday / "Mon, Jul 6"),
// newest day first — the dropdown-per-day the user asked for, via native
// <details> (no extra open/closed state needed).
export function groupByDay(versions) {
  const today = startOfDay(new Date());
  const groups = new Map();
  for (const v of versions) {
    const day = startOfDay(v.created_at);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(v);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([day, items]) => {
      const diffDays = Math.round((today - day) / 86400000);
      const label =
        diffDays === 0 ? 'Today' :
        diffDays === 1 ? 'Yesterday' :
        new Date(day).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
      return { label, items };
    });
}

const VersionHistorySidebar = ({ versions, onRestore, onViewChanges, onClose }) => {
  const days = groupByDay(versions);

  return (
    <div className="comment-sidebar version-sidebar">
      <div className="comment-sidebar-header">
        <h3>Version History</h3>
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="comment-threads-list">
        {versions.length === 0 && (
          <div className="comment-threads-empty">
            <p>No earlier versions yet.</p>
            <p>A version is saved automatically each time you come back and edit this document.</p>
          </div>
        )}
        {days.map((group, i) => (
          <details key={group.label} className="version-day-group" open={i === 0}>
            <summary>{group.label} <span className="version-day-count">({group.items.length})</span></summary>
            {group.items.map(version => (
              <div key={version.id} className="comment-thread version-item" onClick={() => onViewChanges(version)}>
                <div className="comment-body">{version.title || 'Untitled Document'}</div>
                <div className="comment-meta">
                  <span className="comment-date">
                    {new Date(version.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="comment-actions">
                    <button onClick={e => { e.stopPropagation(); onViewChanges(version); }}>View changes</button>
                    <button onClick={e => { e.stopPropagation(); onRestore(version); }}>Restore</button>
                  </div>
                </div>
              </div>
            ))}
          </details>
        ))}
      </div>
    </div>
  );
};

export default VersionHistorySidebar;
