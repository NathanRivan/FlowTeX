import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { FontSize } from 'tiptap-extension-font-size';
import { FontFamily } from '@tiptap/extension-font-family';
import { KatexExtension } from './KatexExtension';
import { KatexDisplayExtension } from './KatexDisplayExtension';
import { MathInputPlugin } from './MathInputPlugin';
import { SlashCommands } from './SlashCommands';
import { generateLaTeX } from './latexSerializer';
import './Editor.css';
import MathEditModal from './MathEditModal';
import { PageBreak } from './PageBreak';
import FontSizeControl from './FontSizeControl';
import { importLaTeX } from './latexImporter';
import { buildFullLaTeX } from './latexSerializer';


const Editor = () => {
  // ---- STATE ----
  const [, setUpdate] = useState(0); // force re‑render on editor changes
  const [showSource, setShowSource] = useState(false);
  const [latexCode, setLatexCode] = useState('');
  const [baseFontSize, setBaseFontSize] = useState(12); // default 12pt
  const [pdfLoading, setPdfLoading] = useState(false);
  const [mathModal, setMathModal] = useState({
    open: false,
    latex: '',
    nodePos: null,
  });
  const handleDownloadPDF = async () => {
    if (!editor) return;
    setPdfLoading(true);
    try {
      const fullTeX = `\\documentclass{article}
      \\begin{document}
      Hello world.
      \\end{document}`;
      const response = await fetch('/api/compile-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: fullTeX,
      });

      if (!response.ok) {
        throw new Error(`Compilation failed (${response.status})`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF compilation failed. Check the console.');
      console.error(err);
    } finally {
      setPdfLoading(false);
    }
  };
  // ---- EDITOR CONFIG ----
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'left', }),
      TextStyle,
      FontFamily.configure({
        fontFamilies: [
          { title: 'Latin Modern (LaTeX)', value: '"Latin Modern Roman", serif' },
          { title: 'Serif', value: 'serif' },
          { title: 'Sans-Serif', value: 'sans-serif' },
          { title: 'Monospace', value: 'monospace' },
          { title: 'Arial', value: 'Arial, sans-serif' },
          { title: 'Times New Roman', value: '"Times New Roman", serif' },
          { title: 'Courier New', value: '"Courier New", monospace' },
        ],
      }),
      FontSize,
      KatexExtension,
      KatexDisplayExtension,
      MathInputPlugin,
      SlashCommands,
      PageBreak
    ],
    content: '<p></p>',
  });

  // ---- FORCE RE-RENDER ON TRANSACTION (for toolbar active states) ----
  useEffect(() => {
    if (!editor) return;
    const handler = () => setUpdate(prev => prev + 1);
    editor.on('transaction', handler);
    return () => editor.off('transaction', handler);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    window.flowtexMathEdit = (pos, latex, isDisplay) => {
      setMathModal({ open: true, latex, nodePos: pos, isDisplay: !!isDisplay });
    };
    return () => { delete window.flowtexMathEdit; };
  }, [editor]);
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    dom.style.fontSize = baseFontSize + 'pt';
  }, [editor, baseFontSize]);

  // ---- HELPER ----
  const handleShowSource = () => {
    if (!editor) return;
    const latex = generateLaTeX(editor);
    setLatexCode(latex);
    setShowSource(true);
  };

  // ---- EARLY RETURN (editor not ready) ----
  if (!editor) return <div>Loading…</div>;

  // ---- RENDER ----
  return (
    <div className="editor-container">
      <div className="toolbar">
        <div className="toolbar-inner">
          <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''}><strong>B</strong></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''}><em>I</em></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'active' : ''}><u>U</u></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'active' : ''}><s>S</s></button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleHighlight().run()} className={editor.isActive('highlight') ? 'active' : ''}>🖍️</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().insertPageBreak().run()}>
            📄 Page Break
          </button>

          <select onChange={e => { const f = e.target.value; if(f) editor.chain().focus().setFontFamily(f).run(); else editor.chain().focus().unsetFontFamily().run(); }}>
            <option value='"Latin Modern Roman", serif'>Latin Modern (LaTeX)</option>
            <option value='serif'>Serif</option>
            <option value='sans-serif'>Sans-Serif</option>
            <option value='monospace'>Monospace</option>
            <option value='Arial, sans-serif'>Arial</option>
            <option value='"Times New Roman", serif'>Times New Roman</option>
            <option value='"Courier New", monospace'>Courier New</option>
            <option value='Georgia, serif'>Georgia</option>
            <option value='Helvetica, sans-serif'>Helvetica</option>
            <option value='Verdana, sans-serif'>Verdana</option>
            <option value='Tahoma, sans-serif'>Tahoma</option>
            <option value='"Lucida Console", monospace'>Lucida Console</option>
            <option value='Impact, fantasy'>Impact</option>
          </select>
          <select
            onMouseDown={(e) => e.preventDefault()}
            value={baseFontSize}
            onChange={(e) => {
              const size = parseInt(e.target.value, 10);
              setBaseFontSize(size);
            }}
          >
            <option value="10">10pt</option>
            <option value="11">11pt</option>
            <option value="12">12pt</option>
            <option value="14">14pt</option>
            <option value="16">16pt</option>
            <option value="18">18pt</option>
            <option value="20">20pt</option>
            <option value="24">24pt</option>
          </select>

          <FontSizeControl editor={editor} />

          <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('left').run()}>Left</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('center').run()}>Center</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('right').run()}>Right</button>
          <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>Justify</button>

          {/* LaTeX Source Toggle */}
          <button onClick={handleShowSource}>LaTeX Source</button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const raw = prompt('Paste your .tex content below:');
              if (raw) {
                const converted = importLaTeX(raw);
                editor.commands.setContent(converted);
              }
            }}
          >
            📥 Import .tex
          </button>
          <button onClick={handleShowSource}>LaTeX Source</button>
          <button onClick={handleDownloadPDF} disabled={pdfLoading}>
            {pdfLoading ? 'Compiling…' : '📄 PDF'}
          </button>
          <div className="toolbar-right">
            <a
              href="https://docs.google.com/document/d/1nBMPNTxlaXkcNME8on8_TwG4jL0Ep0Y1CuvhfGUWr5M/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="toolbar-link"
            >
              📘 Guide
            </a>
            <a
              href="https://forms.gle/io39xQCoe57m7FCVA"
              target="_blank"
              rel="noopener noreferrer"
              className="toolbar-link"
            >
              📝 Feedback
            </a>
            <span className="toolbar-version">v0.4.1 Alpha</span>
          </div>
        </div>
      </div>

      {/* PAGE WRAPPER */}
      <div className="page-wrapper">
        <div className="page">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* SOURCE MODAL */}
      {showSource && (
        <div className="source-modal-overlay" onClick={() => setShowSource(false)}>
          <div className="source-modal" onClick={e => e.stopPropagation()}>
            <div className="source-modal-header">
              <h3>Generated LaTeX</h3>
              <button onClick={() => setShowSource(false)}>✕</button>
            </div>
            <pre className="source-code">{latexCode}</pre>
            <div className="source-modal-actions">
              <button onClick={() => navigator.clipboard.writeText(latexCode)}>Copy</button>
              <button onClick={() => {
                const blob = new Blob([latexCode], {type: 'text/plain'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'document.tex';
                a.click();
                URL.revokeObjectURL(url);
              }}>Download .tex</button>
            </div>
          </div>
        </div>
      )}
            {/* LaTeX source modal */}
      {showSource && (
        <div className="source-modal-overlay" onClick={() => setShowSource(false)}>
          ...
        </div>
      )}

      {/* MATH EDIT MODAL — ADD THIS BLOCK */}
      {mathModal.open && (
        <MathEditModal
          initialLatex={mathModal.latex}
          onUpdate={(newLatex) => {
            if (editor && mathModal.nodePos !== null) {
              editor.view.dispatch(
                editor.state.tr.setNodeMarkup(mathModal.nodePos, null, { latex: newLatex })
              );
            }
          }}
          onClose={() => setMathModal({ open: false, latex: '', nodePos: null })}
        />
      )};
    </div>   
  );
};



export default Editor;