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
import { parseMacros } from './macroExpander';
import PreambleModal from './PreambleModal';
import { CommentMark } from './CommentMark';
import CommentSidebar from './CommentSidebar';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  FileText, Upload, Printer, Wrench, MessageSquare,
  Highlighter, ScissorsIcon,
} from 'lucide-react';
import LoadingScreen from './LoadingScreen';
import { Indent } from './IndentExtension';



const Editor = () => {
  // ---- STATE ----
  const [, setUpdate] = useState(0); // force re‑render on editor changes
  const [showSource, setShowSource] = useState(false);
  const [latexCode, setLatexCode] = useState('');
  const [highlightColor, setHighlightColor] = useState('#ffff00');  // Tiptap's default yellow
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [minTimeReached, setMinTimeReached] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    show: false, 
    x: 0,
    y: 0,
    hasSelection: false,
  });
  
  const [mathModal, setMathModal] = useState({
    open: false,
    latex: '',
    nodePos: null,
  });
  const handlePrintPDF = () => {
    setTimeout(() => {
      window.print();
    }, 0);
  };
  const handleMathComment = (pos, latex) => {
    const id = Date.now().toString();
    // Mark the node with a comment attribute? For display, we'll just store in state.
    setCommentThreads(prev => [...prev, {
      id,
      text: `Equation: ${latex}`,
      replies: [],
      resolved: false,
      createdAt: new Date(),
      pos, // store position for later reference if needed
    }]);
  };
  const [preamble, setPreamble] = useState(false);
  const [showPreamble, setShowPreamble] = useState(false);
  const [commentThreads, setCommentThreads] = useState([]);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [showComments, setShowComments] = useState(false);

  const addCommentThread = (threadId, text) => {
    setCommentThreads(prev => [...prev, {
      id: threadId,
      text: `Commented: "${text}"`,
      replies: [],
      resolved: false,
      createdAt: new Date(),
    }]);
  };
  const removeCommentMark = (commentId) => {
    if (!editor) return;
    const { state, dispatch } = editor.view;
    const { doc } = state;
    const positions = [];
    doc.descendants((node, pos) => {
      if (node.marks) {
        const hasMark = node.marks.some(
          mark => mark.type.name === 'comment' && mark.attrs.commentId === commentId
        );
        if (hasMark) {
          positions.push({ from: pos, to: pos + node.nodeSize });
        }
      }
    });
    if (positions.length === 0) return;
    let tr = state.tr;
    positions.forEach(({ from, to }) => {
      tr = tr.removeMark(from, to, state.schema.marks.comment.create({ commentId }));
    });
    dispatch(tr);
  };


  // ---- EDITOR CONFIG ----
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph', 'bulletList', 'orderedList'], defaultAlignment: 'left', }),
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
      PageBreak,
      CommentMark,
      Indent,
    ],
    content: '<p></p>',
    editorProps: {
      handleKeyDown: (view, event) => {
        const mod = event.metaKey || event.ctrlKey;

        // Backspace on empty aligned line → step down alignment
        if (!mod && event.key === 'Backspace') {
          const { state } = editor;
          const { selection } = state;
          if (selection.empty) {
            const $pos = state.doc.resolve(selection.head);
            const node = $pos.node();
            const isEmpty =
              node.childCount === 0 ||
              (node.childCount === 1 &&
                node.firstChild?.type.name === 'hardBreak' &&
                node.textContent.trim() === '');
            if (isEmpty && node.type.isBlock) {
              const alignment = node.attrs?.textAlign || 'left';
              if (alignment === 'right') {
                event.preventDefault();
                editor.chain().focus().setTextAlign('center').run();
                return true;
              } else if (alignment === 'center') {
                event.preventDefault();
                editor.chain().focus().setTextAlign('left').run();
                return true;
              }
            }
          }
          return false;
        }

        // Tab/Shift+Tab – indent/outdent lists, prevent huge space
        if (event.key === 'Tab') {
          event.preventDefault();
          const { state } = editor;
          const { selection } = state;
          const $pos = state.doc.resolve(selection.head);
          const node = $pos.node();
  
          if (node.type.name === 'listItem') {
            if (event.shiftKey) {
              editor.chain().focus().liftListItem('listItem').run();
            } else {
              editor.chain().focus().sinkListItem('listItem').run();
            }
            return true;
          }
  
          // For paragraphs and headings
          if (['paragraph', 'heading'].includes(node.type.name)) {
            if (event.shiftKey) {
              editor.chain().focus().outdent().run();
            } else {
              editor.chain().focus().indent().run();
            }
            return true;
          }
  
          // Default: just ignore Tab (prevent huge space)
          return true;
        }

        // Alignment shortcuts (Ctrl/Cmd + L/E/R/J)
        if (!mod) return false;
        switch (event.key) {
          case 'l':
            event.preventDefault();
            editor.chain().focus().setTextAlign('left').run();
            alignListItems('left');
            return true;
          case 'e':
            event.preventDefault();
            editor.chain().focus().setTextAlign('center').run();
            alignListItems('center');
            return true;
          case 'r':
            event.preventDefault();
            editor.chain().focus().setTextAlign('right').run();
            alignListItems('right');
            return true;
          case 'j':
            event.preventDefault();
            editor.chain().focus().setTextAlign('justify').run();
            return true;
          default:
            return false;
        }
      }
    } 
  })


  // ---- FORCE RE-RENDER ON TRANSACTION (for toolbar active states) ----
  useEffect(() => {
    if (!editor) return;
    const handler = () => setUpdate(prev => prev + 1);
    editor.on('transaction', handler);
    return () => editor.off('transaction', handler);
  }, [editor]);

  useEffect(() => {
    window.flowtexMacros = parseMacros(preamble);
  }, [preamble]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const handler = (e) => {
      e.preventDefault();
      const { from, to } = editor.state.selection;
      setContextMenu({
        show: true,
        x: e.clientX,
        y: e.clientY,
        hasSelection: from !== to,
      });
    };
    dom.addEventListener('contextmenu', handler);
    return () => dom.removeEventListener('contextmenu', handler);
  }, [editor]);

  useEffect(() => {
    if (!contextMenu.show) return;
    const handler = (e) => {
      // Close if the click is outside the menu
      const menuEl = document.querySelector('[data-context-menu]');
      if (menuEl && !menuEl.contains(e.target)) {
        setContextMenu({ show: false, x: 0, y: 0, hasSelection: false });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu.show]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const handleClick = (e) => {
      const target = e.target.closest('.commented-text');
      if (!target) return;
      const commentId = target.getAttribute('data-comment-id');
      if (!commentId) return;
      e.stopPropagation();
      setActiveCommentId(commentId);
      setShowComments(true);
      // Also close math modal if open
      setMathModal({ open: false, latex: '', nodePos: null });
    };
    dom.addEventListener('click', handleClick);
    return () => dom.removeEventListener('click', handleClick);
  }, [editor]);
  
  
  //Render Editor
  useEffect(() => {
    if (!editor) return;
    window.flowtexMathEdit = (getPosFn, latex, isDisplay) => {
      setShowComments(false);   // close comment sidebar if open
      setMathModal({ open: true, latex, getPos: getPosFn, isDisplay: !!isDisplay });
    };
    return () => { delete window.flowtexMathEdit; };
  }, [editor]);
  // When the editor is created, mark the editor as ready
  useEffect(() => {
    if (editor && !isEditorReady) {
      setIsEditorReady(true);
    }
  }, [editor, isEditorReady]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeReached(true);
    }, 2000);   // loading screen visible at least 2 second
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (isEditorReady && minTimeReached && showLoading) {
      setFadeOut(true);                     // start the fade
      const timeout = setTimeout(() => {
        setShowLoading(false);              // remove the loading screen after the fade ends
      }, 300);                              // 300ms matches the CSS transition duration
      return () => clearTimeout(timeout);
    }
  }, [isEditorReady, minTimeReached, showLoading]);

  // 📄 Auto‑expand editor to full page heights
  useEffect(() => {
    if (!editor) return;
    const PAGE_HEIGHT = 1056; // 11 inches at 96 dpi

    const updateEditorHeight = () => {
      const dom = editor.view.dom;
      if (!dom) return;
      dom.style.minHeight = 'auto';
      const scrollHeight = dom.scrollHeight;
      const pages = Math.max(1, Math.ceil(scrollHeight / PAGE_HEIGHT));
      dom.style.minHeight = (pages * PAGE_HEIGHT) + 'px';
    };

    updateEditorHeight();

    const handleUpdate = () => setTimeout(updateEditorHeight, 10);
    editor.on('update', handleUpdate);
    return () => editor.off('update', handleUpdate);
  }, [editor]);

  // ---- HELPER ----
  const handleShowSource = () => {
    if (!editor) return;
    const latex = generateLaTeX(editor);
    setLatexCode(latex);
    setShowSource(true);
  };

  const alignListItems = (alignment) => {
    if (!editor) return;
    const { state, dispatch } = editor.view;
    const { selection } = state;
    const tr = state.tr;

    // Apply alignment to every listItem in the current selection
    state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
      if (node.type.name === 'listItem') {
        tr.setNodeMarkup(pos, null, { ...node.attrs, textAlign: alignment });
      }
    });

    if (tr.docChanged) dispatch(tr);
  };

  // ---- EARLY RETURN (editor not ready) ----
  if (!editor) return <div>Loading…</div>;

  const commentBtnClass = `floating-action-btn${showComments ? ' disabled' : ''}`;
  // ---- RENDER ----
  return (
  <>
    {isEditorReady && (
      <>
        <div className="editor-container">
          <div className="toolbar">
            <div className="toolbar-inner">

              {/* Text formatting group */}
              <div className="toolbar-group">
                <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''} title="Bold (Ctrl+B)">
                  <Bold size={16} />
                </button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''} title="Italic (Ctrl+I)">
                  <Italic size={16} />
                </button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'active' : ''} title="Underline (Ctrl+U)">
                  <Underline size={16} />
                </button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'active' : ''} title="Strikethrough">
                  <Strikethrough size={16} />
                </button>
              </div>

              {/* Highlight group */}
              <div className="toolbar-group">
                <input
                  type="color"
                  value={highlightColor}
                  onMouseDown={e => e.preventDefault()}
                  onChange={e => {
                    setHighlightColor(e.target.value);
                    editor.chain().focus().setHighlight({ color: e.target.value }).run();
                  }}
                  style={{ width: '24px', height: '24px', padding: 0, border: 'none', cursor: 'pointer' }}
                  title="Highlight color"
                />
                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => editor.chain().focus().unsetHighlight().run()}
                  style={{ width: '24px', height: '24px', padding: 0, border: '1px solid #ccc', cursor: 'pointer', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Remove highlight"
                >
                  <span style={{ color: 'red', fontWeight: 'bold' }}><Highlighter size={16} /></span>
                </button>
              </div>

              {/* Font & size group */}
              <div className="toolbar-group">
                <select onChange={e => { const f = e.target.value; if(f) editor.chain().focus().setFontFamily(f).run(); else editor.chain().focus().unsetFontFamily().run(); }}>
                  <option value='"Computer Modern Serif", serif'>Computer Modern</option>
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
                <FontSizeControl editor={editor} />
              </div>

              {/* Alignment group */}
              <div className="toolbar-group">
                <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left (Ctrl+L)"><AlignLeft size={16} /></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => {
                  editor.chain().focus().setTextAlign('center').run();
                  alignListItems('center');
                }} title="Center (Ctrl+E)"><AlignCenter size={16} /></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => {
                  editor.chain().focus().setTextAlign('right').run();
                  alignListItems('right');
                }} title="Align right (Ctrl+R)"><AlignRight size={16} /></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify (Ctrl+J)"><AlignJustify size={16} /></button>
              </div>

              {/* Actions group (page break, import/export, etc.) */}
              <div className="toolbar-group">
                <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().insertPageBreak().run()} title="Page Break"><ScissorsIcon size={16}/></button>
                <button onClick={handleShowSource} title="Export .tex"><FileText size={16} /></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => {
                  const raw = prompt('Paste your .tex content:');
                  if (raw) {
                    const converted = importLaTeX(raw);
                    editor.commands.setContent(converted);
                  }
                }} title="Import .tex"><Upload size={16} /></button>
                <button onClick={handlePrintPDF} title="Print PDF"><Printer size={16} /></button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => setShowPreamble(true)} title="Preamble"><Wrench size={16} /></button>
              </div>

              {/* Comment button (you can keep or remove since we have the floating button) */}
              <div className="toolbar-group">
                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    const { from, to } = editor.state.selection;
                    if (from === to) return;
                    const commentId = Date.now().toString();
                    editor.chain().focus().toggleComment(commentId).run();
                    addCommentThread(commentId, window.getSelection().toString());
                  }}
                  disabled={editor.state.selection.empty}
                  title="Add comment"
                >
                  <MessageSquare size={16} />
                </button>
              </div>

              {/* Right side links */}
              <div className="toolbar-right">
                <a href="https://docs.google.com/document/d/1nBMPNTxlaXkcNME8on8_TwG4jL0Ep0Y1CuvhfGUWr5M" target="_blank" rel="noopener noreferrer" className="toolbar-link">📘 Guide</a>
                <a href="https://forms.gle/SsKvNGMgPDFrGD8w7" target="_blank" rel="noopener noreferrer" className="toolbar-link">📝 Feedback</a>
                <span className="toolbar-version">v0.6.0 Alpha</span>
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
            <div className="source-modal" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999}}>
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
          )}

          {/* MATH EDIT MODAL */}
          {mathModal.open && (
            <MathEditModal
              isDisplay={mathModal.isDisplay}
              initialLatex={mathModal.latex}
              onUpdate={(newLatex) => {
                if (editor && mathModal.getPos) {
                  const currentPos = mathModal.getPos();
                  if (currentPos !== undefined) {
                    editor.view.dispatch(
                      editor.state.tr.setNodeMarkup(currentPos, null, { latex: newLatex })
                    );
                  }
                }
              }}
              onClose={() => setMathModal({ open: false, latex: '', nodePos: null })}
              onComment={handleMathComment}
              nodePos={mathModal.nodePos}
            />
          )}

          {showPreamble && (
            <PreambleModal
              initialPreamble={preamble}
              onSave={(newPreamble) => {
                setPreamble(newPreamble);
                setShowPreamble(false);
              }}
              onClose={() => setShowPreamble(false)}
            />
          )}

          {contextMenu.show && (
            <div
              data-context-menu
              style={{
                position: 'fixed',
                top: contextMenu.y,
                left: contextMenu.x,
                background: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                zIndex: 9999,
                padding: '4px 0',
                minWidth: '200px',
                fontSize: '14px',
              }}
            >
              {/* Cut */}
              <div
                className={`context-menu-item ${contextMenu.hasSelection ? '' : 'disabled'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!contextMenu.hasSelection) return;
                  const selectedText = window.getSelection().toString();
                  if (selectedText) {
                    navigator.clipboard.writeText(selectedText).then(() => {
                      editor.chain().focus().deleteSelection().run();
                    });
                  }
                  setContextMenu({ show: false, x: 0, y: 0, hasSelection: false });
                }}
              >
                <span>✂️ Cut</span>
                <span style={{ color: '#888', fontSize: '12px' }}>Ctrl+X</span>
              </div>

              {/* Copy */}
              <div
                className={`context-menu-item ${contextMenu.hasSelection ? '' : 'disabled'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!contextMenu.hasSelection) return;
                  navigator.clipboard.writeText(window.getSelection().toString());
                  setContextMenu({ show: false, x: 0, y: 0, hasSelection: false });
                }}
              >
                <span>📋 Copy</span>
                <span style={{ color: '#888', fontSize: '12px' }}>Ctrl+C</span>
              </div>

              {/* Paste */}
              <div
                className="context-menu-item"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                      editor.chain().focus().insertContent(text).run();
                    }
                  } catch (err) {
                    // clipboard read may fail silently
                  }
                  setContextMenu({ show: false, x: 0, y: 0, hasSelection: false });
                }}
              >
                <span>📄 Paste</span>
                <span style={{ color: '#888', fontSize: '12px' }}>Ctrl+V</span>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }} />

              {/* Comment */}
              <div
                className={`context-menu-item ${contextMenu.hasSelection ? '' : 'disabled'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!contextMenu.hasSelection) return;
                  const { state } = editor;
                  const { from, to } = state.selection;
                  const selectedText = state.doc.textBetween(from, to, ' ');
                  const commentId = Date.now().toString();
                  editor.chain().focus().toggleComment(commentId).run();
                  addCommentThread(commentId, selectedText);
                  setContextMenu({ show: false, x: 0, y: 0, hasSelection: false });
                }}
              >
                <span>💬 Comment</span>
                <span style={{ color: '#888', fontSize: '12px' }}>Ctrl+Alt+M</span>
              </div>
            </div>
          )}
        </div>

        <div className="floating-right-actions">
          <button
            className={commentBtnClass}
            onClick={() => {
              setShowComments(prev => {
                if (!prev) setMathModal({ open: false, latex: '', nodePos: null });
                return !prev;
              });
            }}
            title={showComments ? 'Hide Comments' : 'Show Comments'}
          >
            💬
          </button>
        </div>

        {showComments && (
          <CommentSidebar
            threads={commentThreads}
            activeId={activeCommentId}
            onSelect={id => setActiveCommentId(id)}
            onReply={(id, text) => {
              setCommentThreads(prev => prev.map(t =>
                t.id === id ? { ...t, replies: [...t.replies, text] } : t
              ));
            }}
            onResolve={id => {
              removeCommentMark(id);
              setCommentThreads(prev => prev.map(t =>
                t.id === id ? { ...t, resolved: true } : t
              ));
            }}
            onDelete={id => {
              removeCommentMark(id);
              setCommentThreads(prev => prev.filter(t => t.id !== id));
            }}
            onClose={() => setShowComments(false)} 
          />
        )}
      </>
    )}
    {showLoading && (
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 99999,
          transition: 'opacity 0.5s ease',   // smooth 0.5s fade
          opacity: fadeOut ? 0 : 1,
        }}
      >
        <LoadingScreen />
      </div>
    )}
  </>
);
};



export default Editor;