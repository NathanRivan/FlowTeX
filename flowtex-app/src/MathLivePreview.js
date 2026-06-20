import React, { useEffect, useState } from 'react';
import katex from 'katex';
import { preprocessMathForDisplay } from './mathPreprocessor';

const MathLivePreview = ({ active, latex, coords, suggestions, selectedIdx }) => {
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!active) return;
    try {
      const rendered = katex.renderToString(
        preprocessMathForDisplay(latex || ' '),
        { throwOnError: false, displayMode: false }
      );
      setHtml(rendered);
    } catch (e) {
      setHtml(`<span class="math-live-error">${e.message}</span>`);
    }
  }, [latex, active]);

  if (!active || !coords) return null;

  return (
    <div
      className="math-live-container"
      style={{
        position: 'fixed',
        top: coords.bottom + 6,
        left: Math.max(coords.left - 8, 8),
        zIndex: 10000,
      }}
      // Prevent editor blur when clicking inside overlay.
      onMouseDown={(e) => e.preventDefault()}
    >
      {suggestions.length > 0 && (
        <div className="math-live-ac">
          {suggestions.map((cmd, i) => (
            <div
              key={cmd}
              className={`math-live-ac-item${i === selectedIdx ? ' selected' : ''}`}
              onClick={() => window.flowtexMathInsertSuggestion?.(cmd)}
            >
              <span className="math-live-ac-cmd">\{cmd}</span>
            </div>
          ))}
          <div className="math-live-ac-hint">↑↓ navigate · Tab/Enter insert · Esc dismiss</div>
        </div>
      )}
      <div className="math-live-preview">
        <div className="math-live-preview-inner">
          {latex
            ? <div dangerouslySetInnerHTML={{ __html: html }} />
            : <span className="math-live-placeholder">start typing LaTeX…</span>
          }
        </div>
        <div className="math-live-preview-hint">$ to commit · click equation to edit</div>
      </div>
    </div>
  );
};

export default MathLivePreview;
