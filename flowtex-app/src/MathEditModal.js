import React, { useState, useRef, useEffect } from 'react';
import katex from 'katex';

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
      { label: 'x̂', insert: '\\widehat{x}' },
      { label: 'x̃', insert: '\\widetilde{x}' },
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

const MathEditModal = ({ initialLatex, onUpdate, onClose }) => {
  const [latex, setLatex] = useState(initialLatex || '');
  const [previewHtml, setPreviewHtml] = useState('');
  const textareaRef = useRef(null);

  // Update preview on every change
  useEffect(() => {
    setLatex(initialLatex || '');
  }, [initialLatex]);
  
  useEffect(() => {
    try {
      const html = katex.renderToString(latex || ' ', {
        throwOnError: false,
        displayMode: false,
      });
      setPreviewHtml(html);
    } catch (e) {
      setPreviewHtml(`<span style="color:red;">${e.message}</span>`);
    }
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

  const handleSave = () => {
    onUpdate(latex);
    onClose();
  };

  // Keyboard handler: Enter = save, Escape = cancel, Shift+Enter = newline
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
    // Shift+Enter will insert newline by default
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
      <h4>Shift+Enter to go up and down the text area </h4>

      {/* Editor textarea */}
      <textarea
        ref={textareaRef}
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="LaTeX code..."
        rows={8}
        className='math-textarea'
      />

      {/* Live preview */}
      <div
        className="math-preview"
        dangerouslySetInnerHTML={{ __html: previewHtml }}
        style={{ padding: 10, border: '1px solid #ddd', marginTop: 10, minHeight: 40 }}
      />

      <div className="math-panel-actions">
        <button onClick={handleSave}>Apply (Enter)</button>
        <button onClick={onClose}>Cancel (Esc)</button>
      </div>
    </div>
  );
};

export default MathEditModal;