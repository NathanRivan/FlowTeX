import React, { useState, useRef, useEffect } from 'react';
import katex from 'katex';
import { preprocessMathForDisplay } from './mathPreprocessor';

// --- Expanded Symbol Set (organized) ---
const symbolGroups = [
  {
    name: 'Greek Alphabet',
    symbols: [
      { label: 'α', insert: '\\alpha' }, { label: 'β', insert: '\\beta' },
      { label: 'γ', insert: '\\gamma' }, { label: 'δ', insert: '\\delta' },
      { label: 'ϵ', insert: '\\epsilon' }, { label: 'ζ', insert: '\\zeta' },
      { label: 'η', insert: '\\eta' }, { label: 'θ', insert: '\\theta' },
      { label: 'λ', insert: '\\lambda' }, { label: 'μ', insert: '\\mu' },
      { label: 'π', insert: '\\pi' }, { label: 'ρ', insert: '\\rho' },
      { label: 'σ', insert: '\\sigma' }, { label: 'τ', insert: '\\tau' },
      { label: 'ϕ', insert: '\\phi' }, { label: 'χ', insert: '\\chi' },
      { label: 'ψ', insert: '\\psi' }, { label: 'ω', insert: '\\omega' },
      { label: 'Γ', insert: '\\Gamma' }, { label: 'Δ', insert: '\\Delta' },
      { label: 'Θ', insert: '\\Theta' }, { label: 'Λ', insert: '\\Lambda' },
      { label: 'Π', insert: '\\Pi' }, { label: 'Σ', insert: '\\Sigma' },
      { label: 'Φ', insert: '\\Phi' }, { label: 'Ω', insert: '\\Omega' },
    ],
  },
  {
    name: 'Fractions & Roots',
    symbols: [
      { label: 'frac', insert: '\\frac{}{}' },
      { label: '√', insert: '\\sqrt{}' },
      { label: '∛', insert: '\\sqrt[3]{}' },
      { label: '∜', insert: '\\sqrt[4]{}' },
    ],
  },
  {
    name: 'Operators',
    symbols: [
      { label: '∑', insert: '\\sum_{}^{}' },
      { label: '∏', insert: '\\prod_{}^{}' },
      { label: '∫', insert: '\\int_{}^{}' },
      { label: '∬', insert: '\\iint_{}^{}' },
      { label: '∮', insert: '\\oint_{}^{}' },
      { label: 'lim', insert: '\\lim_{}' },
      { label: 'max', insert: '\\max' },
      { label: 'min', insert: '\\min' },
      { label: 'sin', insert: '\\sin' },
      { label: 'cos', insert: '\\cos' },
      { label: 'tan', insert: '\\tan' },
      { label: 'log', insert: '\\log' },
      { label: 'ln', insert: '\\ln' },
    ],
  },
  {
    name: 'Relations',
    symbols: [
      { label: '≤', insert: '\\leq' },
      { label: '≥', insert: '\\geq' },
      { label: '≠', insert: '\\neq' },
      { label: '≈', insert: '\\approx' },
      { label: '≡', insert: '\\equiv' },
      { label: '∝', insert: '\\propto' },
      { label: '∼', insert: '\\sim' },
      { label: '≪', insert: '\\ll' },
      { label: '≫', insert: '\\gg' },
    ],
  },
  {
    name: 'Arrows',
    symbols: [
      { label: '→', insert: '\\rightarrow' },
      { label: '←', insert: '\\leftarrow' },
      { label: '⇒', insert: '\\Rightarrow' },
      { label: '⇐', insert: '\\Leftarrow' },
      { label: '↔', insert: '\\leftrightarrow' },
      { label: '⇔', insert: '\\Leftrightarrow' },
      { label: '↑', insert: '\\uparrow' },
      { label: '↓', insert: '\\downarrow' },
    ],
  },
  {
    name: 'Delimiters',
    symbols: [
      { label: '|...|', insert: '\\left| \\right|' },
      { label: '‖...‖', insert: '\\left\\| \\right\\|' },
      { label: '⟨...⟩', insert: '\\langle \\rangle' },
      { label: '⌊...⌋', insert: '\\lfloor \\rfloor' },
      { label: '⌈...⌉', insert: '\\lceil \\rceil' },
      { label: '{...}', insert: '\\left\\{ \\right\\}' },
    ],
  },
  {
    name: 'Matrices',
    symbols: [
      { label: 'pmatrix', insert: '\\begin{pmatrix}\n  & \\\\\n  & \n\\end{pmatrix}' },
      { label: 'bmatrix', insert: '\\begin{bmatrix}\n  & \\\\\n  & \n\\end{bmatrix}' },
      { label: 'Bmatrix', insert: '\\begin{Bmatrix}\n  & \\\\\n  & \n\\end{Bmatrix}' },
      { label: 'vmatrix', insert: '\\begin{vmatrix}\n  & \\\\\n  & \n\\end{vmatrix}' },
      { label: 'Vmatrix', insert: '\\begin{Vmatrix}\n  & \\\\\n  & \n\\end{Vmatrix}' },
    ],
  },
  {
    name: 'Accents & Decorations',
    symbols: [
      { label: 'x̂', insert: '\\hat{x}' },
      { label: 'x̄', insert: '\\bar{x}' },
      { label: 'x̃', insert: '\\tilde{x}' },
      { label: 'x⃗', insert: '\\vec{x}' },
      { label: 'ẋ', insert: '\\dot{x}' },
      { label: 'ẍ', insert: '\\ddot{x}' },
      { label: 'x̲', insert: '\\underline{x}' },
      { label: 'ℜ', insert: '\\Re' },
      { label: 'ℑ', insert: '\\Im' },
      { label: 'ℓ', insert: '\\ell' },
    ],
  },
  {
    name: 'Misc',
    symbols: [
      { label: '∞', insert: '\\infty' },
      { label: '∂', insert: '\\partial' },
      { label: '∇', insert: '\\nabla' },
      { label: '□', insert: '\\square' },
      { label: '∅', insert: '\\emptyset' },
      { label: '∀', insert: '\\forall' },
      { label: '∃', insert: '\\exists' },
      { label: '¬', insert: '\\neg' },
      { label: '∈', insert: '\\in' },
      { label: '∉', insert: '\\notin' },
      { label: '⊂', insert: '\\subset' },
      { label: '⊆', insert: '\\subseteq' },
      { label: '∪', insert: '\\cup' },
      { label: '∩', insert: '\\cap' },
      { label: '∴', insert: '\\therefore' },
      { label: '∵', insert: '\\because' },
    ],
  },
];

const commonCommands = [
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'theta', 'lambda', 'mu', 'pi', 'sigma', 'omega',
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Pi', 'Sigma', 'Omega',
  'frac', 'sqrt', 'sum', 'int', 'prod', 'lim', 'max', 'min',
  'sin', 'cos', 'tan', 'log', 'ln', 'exp',
  'mathbb{}', 'mathcal{}', 'mathbf{}', 'mathit{}', 'mathrm{}',
  'Rightarrow', 'Leftarrow', 'rightarrow', 'leftarrow', 'Leftrightarrow',
  'leq', 'geq', 'neq', 'approx', 'equiv', 'propto', 'sim',
  'infty', 'partial', 'nabla', 'emptyset', 'forall', 'exists',
  'in', 'notin', 'subset', 'subseteq', 'cup', 'cap',
  'cdot', 'times', 'div', 'pm', 'mp',
  'binom{}{}', 'vec{}', 'hat{}', 'tilde{}', 'bar{}', 'dot{}', 'ddot{}',
];




const MathEditModal = ({ initialLatex, onUpdate, onClose, onComment, nodePos, isDisplay }) => {
  const [latex, setLatex] = useState(initialLatex || '');
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  // Update preview on every change
  useEffect(() => {
    setLatex(initialLatex || '');
  }, [initialLatex]);
  
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Use requestAnimationFrame to let the "Rendering…" message paint first
    requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        const html = katex.renderToString(
          preprocessMathForDisplay(latex || ' '),
          { throwOnError: false, displayMode: false }
        );
        if (!cancelled) {
          setPreviewHtml(html);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setPreviewHtml(`<span style="color:red;">${e.message}</span>`);
          setLoading(false);
        }
      }
    });

    return () => { cancelled = true; };
  }, [latex]);

  const insertSymbol = (insertStr) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newLatex = latex.substring(0, start) + insertStr + latex.substring(end);
    setLatex(newLatex);
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + insertStr.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const handleLatexChange = (e) => {
    const value = e.target.value;
    setLatex(value);

    // Check for backslash at cursor position
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastBackslashIndex = textBeforeCursor.lastIndexOf('\\');
    if (lastBackslashIndex !== -1 && lastBackslashIndex === cursorPos - 1) {
      // Just typed a backslash – show all commands
      setSuggestions(commonCommands);
      setSelectedSuggestionIndex(0);
    } else if (lastBackslashIndex !== -1) {
      const partial = textBeforeCursor.substring(lastBackslashIndex + 1);
      if (partial.length > 0 && !partial.includes(' ')) {
        const filtered = commonCommands.filter(cmd => cmd.startsWith(partial));
        setSuggestions(filtered);
        setSelectedSuggestionIndex(0);
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const insertSuggestion = (command) => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const value = latex;
    const textBefore = value.substring(0, start);
    const lastBackslash = textBefore.lastIndexOf('\\');
    const textAfter = value.substring(start);
    // Replace the partial command with the full command
    const newValue = value.substring(0, lastBackslash) + '\\' + command + ' ' + textAfter;
    setLatex(newValue);
    setSuggestions([]);
    // Set cursor after the inserted command
    setTimeout(() => {
      const newCursorPos = lastBackslash + command.length + 2; // +2 for backslash and space
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Keyboard navigation for suggestions
  const handleSuggestionKeyDown = (e) => {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertSuggestion(suggestions[selectedSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setSuggestions([]);
    }
  };


  const handleSave = () => {
    onUpdate(latex);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (isDisplay) {
        // In display math, Enter inserts a newline (\\)
        e.preventDefault();
        insertSymbol('\\\\\n'); // two backslashes for LaTeX line break
      } else {
        // Inline math: Enter saves
        e.preventDefault();
        handleSave();
      }
    } else if (e.key === 'Enter' && e.shiftKey) {
      // Shift+Enter: in display math, it saves; in inline, it inserts newline
      if (isDisplay) {
        e.preventDefault();
        handleSave();
      } else {
        e.preventDefault();
        insertSymbol('\n');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };


  const extractVariables = (latex) => {
    const commands = latex.match(/\\[a-zA-Z]+/g) || [];
    const letters = latex.match(/[a-zA-Z]/g) || [];
    return [...new Set([...commands, ...letters])]; // unique
  };

  return (
    <div className="math-side-panel">
      <div className="math-panel-header">
        <h3>Math Editor</h3>
        <button onClick={onClose} title="Close (Esc)">✕</button>
      </div>

      {/* Symbol groups */}
      <div className="math-symbol-groups">
        {symbolGroups.map((group) => (
          <details key={group.name} open>
            <summary>{group.name}</summary>
            <div className="math-symbol-row">
              {group.symbols.map((sym) => (
                <button
                  key={sym.label}
                  onClick={() => insertSymbol(sym.insert)}
                  title={sym.insert}
                >
                  {sym.label}
                </button>
              ))}
            </div>
          </details>
        ))}
      </div>
      <h4> "\\" for new line</h4>
      
      {/* Editor textarea */}
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={latex}
          onChange={handleLatexChange}
          onKeyDown={(e) => {
            // First handle suggestion navigation (arrow keys, Enter on suggestion)
            if (suggestions.length > 0) {
              handleSuggestionKeyDown(e);
              // If the suggestion handler took the event, stop here
              if (e.defaultPrevented) return;
            }
            // Otherwise, handle standard keys (Enter to save, Escape to close)
            handleKeyDown(e);
          }}
          placeholder="LaTeX code..."
          rows={8}
          className='math-textarea'
        />
        {suggestions.length > 0 && (
          <div className="math-autocomplete">
            {suggestions.map((cmd, idx) => (
              <div
                key={cmd}
                className={idx === selectedSuggestionIndex ? 'selected' : ''}
                onClick={() => insertSuggestion(cmd)}
                onMouseEnter={() => setSelectedSuggestionIndex(idx)}
              >
                \{cmd}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live preview */}
      <div
        className="math-preview"
        style={{ padding: 10, border: '1px solid #ddd', marginTop: 10, minHeight: 40 }}
      >
        {loading ? (
          <div className="math-preview-loading">Rendering…</div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        )}
      </div>

      <div className="math-panel-actions">
        <button onClick={handleSave}>Apply (Enter)</button>
        <button onClick={onClose}>Cancel (Esc)</button>
        <button onClick={() => {
          const vars = extractVariables(latex);
          const variable = prompt('Which variable? (e.g., x, \\alpha)', vars[0]);
          if (variable && onComment) {
            onComment(nodePos, `Variable '${variable}' in equation: ${latex}`); // we need nodePos passed
          }
        }}>
          💬 Comment
        </button>
      </div>

    </div>
  );
};

export default MathEditModal;