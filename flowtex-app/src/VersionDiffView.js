import React, { useMemo } from 'react';
import { diffWordsWithSpace } from 'diff';
import { docToPlainText } from './docText';

// Full-screen "what changed" view: word-level diff between an old version
// and the current document, Google-Docs style (additions/deletions inline).
const VersionDiffView = ({ version, currentContent, onRestore, onClose }) => {
  const parts = useMemo(
    () => diffWordsWithSpace(docToPlainText(version.content), docToPlainText(currentContent)),
    [version, currentContent]
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="source-modal diff-modal" onClick={e => e.stopPropagation()}>
        <div className="source-modal-header">
          <h3>Changes since {new Date(version.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="diff-content">
          {parts.map((part, i) => (
            <span key={i} className={part.added ? 'diff-added' : part.removed ? 'diff-removed' : undefined}>
              {part.value}
            </span>
          ))}
        </div>
        <div className="source-modal-actions">
          <button onClick={() => onRestore(version)}>Restore this version</button>
        </div>
      </div>
    </div>
  );
};

export default VersionDiffView;
