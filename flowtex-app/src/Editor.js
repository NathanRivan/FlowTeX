import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import * as Y from 'yjs';
import { Collaboration } from '@tiptap/extension-collaboration';
import { SupabaseYjsProvider } from './SupabaseYjsProvider';
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
import { generateLaTeX, buildFullLaTeX } from './latexSerializer';
import './Editor.css';
import { supabase } from './supabase';
import MathEditModal from './MathEditModal';
import { PageBreak } from './PageBreak';
import FontSizeControl from './FontSizeControl';
import SoundEngine from './SoundEngine';
import { importLaTeX } from './latexImporter';
import ImportLatexModal from './ImportLatexModal';
import { parseMacros } from './macroExpander';
import PreambleModal from './PreambleModal';
import BibliographyModal from './BibliographyModal';
import { CiteRefValidationPlugin } from './CiteRefValidationPlugin';
import ShareModal from './ShareModal';
import PageSettingsModal, { DEFAULT_PAGE_SETTINGS, PAGE_SIZES } from './PageSettingsModal';
import { CommentMark } from './CommentMark';
import CommentSidebar from './CommentSidebar';
import OutlineSidebar from './OutlineSidebar';
import VersionHistorySidebar from './VersionHistorySidebar';
import VersionDiffView from './VersionDiffView';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  FileText, Upload, Printer, Wrench, MessageSquare,
  Highlighter, ScissorsIcon, LayoutTemplate, Columns2,
  LayoutGrid, ChevronDown, Minus, Table as TableIcon, FileDown,
  History, List, Users, Folder, BookOpen,
} from 'lucide-react';
import TemplatesMenu from './TemplatesMenu';
import { TEMPLATES } from './templates';
import LoadingScreen from './LoadingScreen';
import MathLivePreview from './MathLivePreview';
import { Indent } from './IndentExtension';
import { PagedDocument } from './PagedDocument';
import { PageNode } from './PageNode';
import { AutoPageBreak } from './AutoPageBreakExtension';
import { ColumnSpan } from './ColumnSpanExtension';
import { LatexTableExtension } from './LatexTableExtension';
import TableEditModal from './TableEditModal';
import { defaultTableRaw } from './tableSerializer';

// Initial document: a single page with one empty paragraph
const INITIAL_DOC = {
  type: 'doc',
  content: [{
    type: 'page',
    content: [{
      type: 'paragraph',
      content: [{ type: 'text', text: 'Welcome to the editor! Type math inline with $x^2$, or start a new line with $$E=mc^2$$ for a display equation.' }],
    }],
  }],
};

// A node's captured getPos() only stays valid while its NodeView instance is
// still mounted. Auto-pagination moves blocks between pages by delete+insert,
// which recreates the NodeView at a new position — so a getPos() closure
// captured when a math/table modal opened can go stale by the time the user
// hits Apply, and setNodeMarkup(staleNodePos, ...) throws "No node at given
// position". Falls back to relocating the node by its original attrs.
export function resolveNodePos(doc, guessPos, nodeTypeName, matches) {
  if (typeof guessPos === 'number' && guessPos >= 0 && guessPos < doc.content.size) {
    const node = doc.nodeAt(guessPos);
    if (node && node.type.name === nodeTypeName && matches(node.attrs)) return guessPos;
  }
  let found = null;
  doc.descendants((node, pos) => {
    if (found !== null) return false;
    if (node.type.name === nodeTypeName && matches(node.attrs)) {
      found = pos;
      return false;
    }
    return true;
  });
  return found;
}

const Editor = ({ session, document: docProp, onBack, onOpenDocument }) => {
  // ---- STATE ----
  const [, setUpdate] = useState(0);
  const [showSource, setShowSource] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [latexCode, setLatexCode] = useState('');
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [minTimeReached, setMinTimeReached] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [paginatingImport, setPaginatingImport] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    show: false, x: 0, y: 0, hasSelection: false,
  });
  const [mathModal, setMathModal] = useState({
    open: false, latex: '', nodePos: null,
  });
  const [tableModal, setTableModal] = useState({
    open: false, raw: '', getPos: null,
  });
  const [mathZone, setMathZone] = useState({                                            
    active: false, latex: '', coords: null, suggestions: [], selectedIdx: 0,
  });

  const handlePrintPDF = () => setTimeout(() => window.print(), 0);

  const handleExportPDF = async () => {
    const serverUrl = process.env.REACT_APP_PDF_SERVER_URL;
    if (!serverUrl) {
      alert('PDF server not configured.\nSet REACT_APP_PDF_SERVER_URL in your .env file.');
      return;
    }
    if (!editor || pdfStatus) return;
    setPdfStatus('Compiling…');
    const wakeTimer = setTimeout(() => setPdfStatus('Waking server… (~30s)'), 8000);
    try {
      const latex = buildFullLaTeX(editor, pageSettings);
      const resp = await fetch(`${serverUrl}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const errors = (data.log || data.error || 'Unknown error')
          .split('\n').filter(l => l.startsWith('!') || l.startsWith('l.')).join('\n')
          || data.error || 'Compilation failed.';
        alert(`LaTeX compilation failed:\n\n${errors}`);
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (docTitle || 'document').replace(/[#%&\\/<>:"*?|]/g, '_').trim();
      a.download = `${safeTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      alert('Could not reach the PDF server. Is it running?');
    } finally {
      clearTimeout(wakeTimer);
      setPdfStatus('');
    }
  };

  // Scroll the editor to a comment's highlighted text (used when a thread is
  // clicked in the sidebar). The sidebar itself never scrolls the window.
  const scrollToComment = (commentId) => {
    if (!editor) return;
    const el = editor.view.dom.querySelector(`[data-comment-id="${commentId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const applyTemplate = (tpl) => {
    if (!editor) return;
    const hasContent = editor.getText().trim().length > 0;
    if (hasContent && !window.confirm(
      `Apply the "${tpl.label}" template?\n\nThis will replace your current document.`
    )) return;
    setPageSettings(tpl.pageSettings);
    editor.commands.setContent(tpl.content);
    setShowTemplates(false);
    setTimeout(() => editor.commands.focus('start'), 0);
  };

  const handleMathComment = (pos, latex) => {
    const id = Date.now().toString();
    setCommentThreads(prev => [...prev, {
      id, quote: `Equation: ${latex}`, text: '', replies: [], resolved: false,
      createdAt: new Date(), pos,
    }]);
    setShowComments(true);
    setActiveCommentId(id);
  };

  const [pageSettings, setPageSettings] = useState(
    docProp?.content?.pageSettings || docProp?.pageSettings || DEFAULT_PAGE_SETTINGS
  );
  const [soundSettings, setSoundSettings] = useState(() => ({
    enabled: localStorage.getItem('flumenwrite.sfx.enabled') !== 'false',
    volume:  Math.min(1, Math.max(0, parseFloat(localStorage.getItem('flumenwrite.sfx.volume') ?? '0.6') || 0.6)),
  }));
  const [docTitle, setDocTitle] = useState(docProp?.title || 'Untitled Document');
  const docIdRef = useRef(docProp?.id || null);
  const ydocRef = useRef(null);
  if (!ydocRef.current) ydocRef.current = new Y.Doc();
  const saveTimerRef = useRef(null);
  // Snapshot the doc's pre-session state into document_versions once, the
  // first time it's edited this session — one version per editing session,
  // no timers/config needed.
  const versionSnapshotDoneRef = useRef(false);
  const initialContentRef = useRef(docProp?.content || null);
  const initialTitleRef = useRef(docProp?.title || 'Untitled Document');
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);
  const [diffVersion, setDiffVersion] = useState(null);
  const pageSettingsRef = useRef(pageSettings);
  const commentThreadsRef = useRef([]);
  const mathZoneActiveRef = useRef(false);
  const [pageIndicator, setPageIndicator] = useState({ current: 1, total: 1, show: false, top: 200 });
  const pageIndicatorTimerRef = useRef(null);
  const tableButtonRef = useRef(null);
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableHover, setTableHover] = useState({ cols: 0, rows: 0 });
  const [pdfStatus, setPdfStatus] = useState('');
  const [preamble, setPreamble] = useState(false);
  const [showPreamble, setShowPreamble] = useState(false);
  const [bibliography, setBibliography] = useState('');
  const [showBibliography, setShowBibliography] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const isOwner = docProp?.user_id === session?.user?.id;
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(docProp?.folder_id ?? null);
  const [folders, setFolders] = useState([]);
  const [browseFolderId, setBrowseFolderId] = useState(null);
  const [browseDocs, setBrowseDocs] = useState([]);
  const folderButtonRef = useRef(null);
  const [commentThreads, setCommentThreads] = useState(docProp?.content?.commentThreads || []);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const addCommentThread = (threadId, quote) => {
    setCommentThreads(prev => [...prev, {
      id: threadId, quote, text: '', replies: [],
      resolved: false, createdAt: new Date(),
    }]);
    setShowComments(true);
    setActiveCommentId(threadId);
  };

  const removeCommentMark = (commentId) => {
    if (!editor) return;
    const { state, dispatch } = editor.view;
    const { doc } = state;
    const positions = [];
    doc.descendants((node, pos) => {
      if (node.marks?.some(m => m.type.name === 'comment' && m.attrs.commentId === commentId)) {
        positions.push({ from: pos, to: pos + node.nodeSize });
      }
    });
    if (!positions.length) return;
    let tr = state.tr;
    positions.forEach(({ from, to }) => {
      tr = tr.removeMark(from, to, state.schema.marks.comment.create({ commentId }));
    });
    dispatch(tr);
  };

  // ---- EDITOR CONFIG ----
  const editor = useEditor({
    extensions: [
      // PagedDocument replaces StarterKit's doc node: doc > page+ instead of doc > block+
      PagedDocument,
      PageNode,
      AutoPageBreak.configure({ onSettled: () => setPaginatingImport(false) }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: 'left',
      }),
      TextStyle,
      FontFamily,
      FontSize,
      KatexExtension,
      KatexDisplayExtension,
      MathInputPlugin,
      SlashCommands,
      PageBreak,
      CommentMark,
      Indent,
      ColumnSpan,
      LatexTableExtension,
      CiteRefValidationPlugin,
      StarterKit.configure({ document: false, undoRedo: false }), // our PagedDocument handles the doc node; Yjs owns undo/redo
      Collaboration.configure({ document: ydocRef.current }),
    ],
    editorProps: {
      handleKeyDown: (view, event) => {
        const mod = event.metaKey || event.ctrlKey;

        if (event.key === 'Tab') {
          event.preventDefault();
          const inList = editor.isActive('listItem');
          if (event.shiftKey) {
            // In a list, lift (un-nest). Otherwise remove one tab right before
            // the cursor, if present.
            if (inList) {
              editor.chain().focus().liftListItem('listItem').run();
            } else {
              const { empty, $from } = editor.state.selection;
              if (empty && $from.parentOffset > 0 &&
                  $from.parent.textBetween($from.parentOffset - 1, $from.parentOffset) === '\t') {
                editor.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).run();
              }
            }
          } else {
            if (inList) {
              // In a list: nest the item if possible; if it's the first item
              // (can't sink), silently consume the Tab so no \t is inserted.
              if (editor.can().sinkListItem('listItem')) {
                editor.chain().focus().sinkListItem('listItem').run();
              }
            } else {
              // Outside a list: insert a tab character AT THE CURSOR so only
              // text after the cursor moves (white-space: pre-wrap renders it).
              editor.chain().focus().insertContent('\t').run();
            }
          }
          return true;
        }

        if (event.key === 'Backspace' && !mod && !event.shiftKey) {
          const { empty, $from } = editor.state.selection;
          if (empty && $from.parentOffset === 0) {
            const align = $from.parent.attrs?.textAlign;
            if (align === 'right') {
              editor.chain().focus().setTextAlign('center').run();
              return true;
            }
            if (align === 'center') {
              editor.chain().focus().setTextAlign('left').run();
              return true;
            }
          }
        }

        if (!mod) return false;
        switch (event.key) {
          case 'l':
            event.preventDefault();
            editor.chain().focus().setTextAlign('left').run();
            return true;
          case 'e':
            event.preventDefault();
            editor.chain().focus().setTextAlign('center').run();
            return true;
          case 'r':
            event.preventDefault();
            editor.chain().focus().setTextAlign('right').run();
            return true;
          case 'j':
            event.preventDefault();
            editor.chain().focus().setTextAlign('justify').run();
            return true;
          default:
            return false;
        }
      },
    },
  });

  // ---- EFFECTS ----

  // Walk the doc for heading nodes each render — cheap for typical doc sizes
  // and always in sync, no separate state/effect to keep updated.
  const outlineHeadings = [];
  if (editor) {
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        outlineHeadings.push({ pos, level: node.attrs.level, text: node.textContent });
      }
    });
  }

  const goToHeading = (pos) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos + 1).run();
    const dom = editor.view.nodeDOM(pos);
    if (dom instanceof HTMLElement) dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    if (!editor) return;
    const handler = () => setUpdate(prev => prev + 1);
    editor.on('transaction', handler);
    return () => editor.off('transaction', handler);
  }, [editor]);

  useEffect(() => {
    if (editor && isEditorReady && !showLoading) {
      setTimeout(() => editor.view.dom.focus(), 50);
    }
  }, [editor, isEditorReady, showLoading]);

  useEffect(() => { commentThreadsRef.current = commentThreads; }, [commentThreads]);

  useEffect(() => {
    window.flumenwriteMacros = parseMacros(preamble);
  }, [preamble]);

  // Re-run cite/label validation immediately whenever the .bib source
  // changes, not just when a citation itself is edited (task requirement).
  useEffect(() => {
    window.flumenwriteBibliography = bibliography;
    window.flumenwriteRevalidateCiteRefs?.();
  }, [bibliography]);

  useEffect(() => {
    const { pageSize, marginTop, marginBottom, marginLeft, marginRight, fontSize, lineSpacing, columns } = pageSettings;
    const size = PAGE_SIZES[pageSize];
    const root = document.documentElement;
    root.style.setProperty('--page-width',         size.width);
    root.style.setProperty('--page-height',        size.height);
    root.style.setProperty('--page-margin-top',    `${marginTop}in`);
    root.style.setProperty('--page-margin-bottom', `${marginBottom}in`);
    root.style.setProperty('--page-margin-left',   `${marginLeft}in`);
    root.style.setProperty('--page-margin-right',  `${marginRight}in`);
    root.style.setProperty('--page-font-size',     `${fontSize}pt`);
    root.style.setProperty('--page-line-spacing',  lineSpacing);
    root.setAttribute('data-columns', String(columns));
    window.flumenwritePageSettings = {
      pageHeightPx:   size.heightPx,
      marginBottomPx: Math.round(marginBottom * 96),
      columns,
    };
    pageSettingsRef.current = pageSettings;
    // Dispatch a force-repaginate signal so the AutoPageBreak plugin runs
    // now that CSS vars are committed. This handles the initial load case
    // where the plugin's view() fires before data-columns is set in the DOM.
    if (editor && !editor.isDestroyed) {
      editor.view.dispatch(
        editor.state.tr
          .setMeta('forceRepaginate', true)
          .setMeta('addToHistory', false)
      );
    }
  }, [pageSettings, editor]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const handler = (e) => {
      e.preventDefault();
      const { from, to } = editor.state.selection;
      setContextMenu({ show: true, x: e.clientX, y: e.clientY, hasSelection: from !== to });
    };
    dom.addEventListener('contextmenu', handler);
    return () => dom.removeEventListener('contextmenu', handler);
  }, [editor]);

  useEffect(() => {
    if (!contextMenu.show) return;
    const handler = (e) => {
      const menuEl = document.querySelector('[data-context-menu]');
      if (menuEl && !menuEl.contains(e.target)) {
        setContextMenu({ show: false, x: 0, y: 0, hasSelection: false });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu.show]);

  useEffect(() => {
    if (!showTablePicker) return;
    const handler = (e) => {
      const wrap = tableButtonRef.current;
      const picker = document.querySelector('.table-picker-portal');
      if (wrap && wrap.contains(e.target)) return;
      if (picker && picker.contains(e.target)) return;
      setShowTablePicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTablePicker]);

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
      setMathModal({ open: false, latex: '', nodePos: null });
    };
    dom.addEventListener('click', handleClick);
    return () => dom.removeEventListener('click', handleClick);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    window.flumenwriteMathEdit = (getPosFn, latex, isDisplay) => {
      setShowComments(false);
      setMathModal({ open: true, latex, getPos: getPosFn, isDisplay: !!isDisplay });
    };
    return () => { delete window.flumenwriteMathEdit; };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    window.flumenwriteTableEdit = (getPosFn, raw) => {
      setShowComments(false);
      setTableModal({ open: true, raw, getPos: getPosFn });
    };
    return () => { delete window.flumenwriteTableEdit; };
  }, [editor]);


  // Load persisted Yjs state (if any), connect the realtime broadcast
  // channel, then seed the shared doc from the legacy JSON content only if
  // nobody (a snapshot or a peer who connected first) has written to it yet.
  const collabReadyRef = useRef(false);
  const seededRef = useRef(false);
  useEffect(() => {
    if (!editor || collabReadyRef.current) return;
    collabReadyRef.current = true;
    const provider = new SupabaseYjsProvider(supabase, docIdRef.current, ydocRef.current);
    (async () => {
      await provider.load();
      provider.connect();
      const isEmpty = ydocRef.current.getXmlFragment('default').length === 0;
      if (isEmpty && !seededRef.current) {
        seededRef.current = true;
        editor.commands.setContent(docProp?.content || INITIAL_DOC);
      }
      setIsEditorReady(true);
    })();
    return () => provider.destroy();
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- SOUND ENGINE ----
  // Lazy-init AudioContext on first gesture, then wire all sound hooks.
  useEffect(() => {
    const initOnce = () => SoundEngine.init();
    document.addEventListener('click',   initOnce, { once: true });
    document.addEventListener('keydown', initOnce, { once: true });
    return () => {
      document.removeEventListener('click',   initOnce);
      document.removeEventListener('keydown', initOnce);
    };
  }, []);

  // Apply sound settings immediately when they change.
  useEffect(() => {
    SoundEngine.setEnabled(soundSettings.enabled);
    SoundEngine.setVolume(soundSettings.volume);
  }, [soundSettings]);

  // math.open — fires when the math zone first becomes active.
  useEffect(() => {
    window.flumenwriteMathZoneUpdate = (update) => {
      if (update.active && !mathZoneActiveRef.current) {
        SoundEngine.play('math.open');
      }
      if (update.active !== undefined) mathZoneActiveRef.current = update.active;
      setTimeout(() => setMathZone(prev => ({ ...prev, ...update })), 0);
    };
    return () => { delete window.flumenwriteMathZoneUpdate; };
  }, []);

  // math.commit — fires when $..$ text is converted to a KaTeX node (from MathInputPlugin)
  // OR when the MathEditModal saves an updated equation.
  useEffect(() => {
    window.flumenwriteMathCommit = () => SoundEngine.play('math.commit');
    return () => { delete window.flumenwriteMathCommit; };
  }, []);

  // math.error — scheduleError/cancelError are called from MathLivePreview.
  useEffect(() => {
    window.flumenwriteMathError       = () => SoundEngine.scheduleError();
    window.flumenwriteMathErrorCancel = () => SoundEngine.cancelError();
    return () => {
      delete window.flumenwriteMathError;
      delete window.flumenwriteMathErrorCancel;
      SoundEngine.cancelError();
    };
  }, []);


  useEffect(() => {
    const timer = setTimeout(() => setMinTimeReached(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isEditorReady && minTimeReached && showLoading) {
      setFadeOut(true);
      const timeout = setTimeout(() => setShowLoading(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isEditorReady, minTimeReached, showLoading]);

  // ---- PAGE INDICATOR ----
  useEffect(() => {
    if (!isEditorReady) return;

    const TOOLBAR_H = 87; // menubar (38px) + toolbar (49px)

    const onScroll = () => {
      const pageEls = Array.from(document.querySelectorAll('.page-node'));
      const total = pageEls.length;
      if (total < 2) return;

      // Current page = last page whose top edge has scrolled into the content area.
      const contentTop = window.scrollY + TOOLBAR_H;
      let current = 1;
      pageEls.forEach((el, i) => {
        if (el.offsetTop <= contentTop + 40) current = i + 1;
      });

      // Vertical position: mirror the scrollbar thumb.
      const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const frac = Math.min(1, window.scrollY / scrollMax);
      const topMin = TOOLBAR_H + 24;
      const topMax = window.innerHeight - 36;
      const top = topMin + frac * (topMax - topMin);

      setPageIndicator({ current, total, show: true, top });
      clearTimeout(pageIndicatorTimerRef.current);
      pageIndicatorTimerRef.current = setTimeout(
        () => setPageIndicator(p => ({ ...p, show: false })), 1500
      );
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(pageIndicatorTimerRef.current);
    };
  }, [isEditorReady]);

  // ---- AUTO-SAVE ----
  useEffect(() => {
    if (!editor || !session || !docIdRef.current) return;
    const handler = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!versionSnapshotDoneRef.current) {
          versionSnapshotDoneRef.current = true;
          if (initialContentRef.current) {
            await supabase.from('document_versions').insert({
              document_id: docIdRef.current,
              user_id: session.user.id,
              title: initialTitleRef.current,
              content: initialContentRef.current,
            });
          }
        }
        await supabase
          .from('documents')
          .update({
            content: { ...editor.getJSON(), pageSettings: pageSettingsRef.current, commentThreads: commentThreadsRef.current },
            updated_at: new Date().toISOString(),
          })
          .eq('id', docIdRef.current);
        SoundEngine.play('document.save');
      }, 1500);
    };
    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editor, session]);

  const saveTitle = async (newTitle) => {
    const title = newTitle.trim() || 'Untitled Document';
    setDocTitle(title);
    if (!session || !docIdRef.current) return;
    await supabase.from('documents').update({ title }).eq('id', docIdRef.current);
  };

  // ---- VERSION HISTORY ----
  useEffect(() => {
    if (!showVersions || !docIdRef.current) return;
    supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', docIdRef.current)
      .order('created_at', { ascending: false })
      .then(({ data }) => setVersions(data || []));
  }, [showVersions]);

  // ---- FOLDER BROWSER (also used to switch to a different document) ----
  useEffect(() => {
    if (!showFolderMenu || !isOwner) return;
    setBrowseFolderId(currentFolderId);
    Promise.all([
      supabase.from('folders').select('*').order('name'),
      supabase.from('documents').select('id, title, folder_id').eq('user_id', session.user.id).order('title'),
    ]).then(([{ data: fld }, { data: docs }]) => {
      setFolders(fld || []);
      setBrowseDocs(docs || []);
    });
  }, [showFolderMenu, isOwner]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveToFolder = async (folderId) => {
    setCurrentFolderId(folderId);
    if (!docIdRef.current) return;
    await supabase.from('documents').update({ folder_id: folderId }).eq('id', docIdRef.current);
  };

  const switchToDocument = async (docId) => {
    if (docId === docIdRef.current) { setShowFolderMenu(false); return; }
    setShowFolderMenu(false);
    const { data, error } = await supabase.from('documents').select('*').eq('id', docId).single();
    if (!error && data && onOpenDocument) {
      onOpenDocument({
        id: data.id,
        title: data.title,
        content: data.content,
        pageSettings: null,
        user_id: data.user_id,
        link_shared: data.link_shared,
        folder_id: data.folder_id,
      });
    }
  };

  const currentFolderName = currentFolderId
    ? folders.find(f => f.id === currentFolderId)?.name ?? 'Folder'
    : '/';

  const folderPathMap = useMemo(() => new Map(folders.map(f => [f.id, f])), [folders]);
  const browsePath = useMemo(() => {
    const path = [];
    let f = browseFolderId ? folderPathMap.get(browseFolderId) : null;
    while (f) {
      path.unshift(f);
      f = f.parent_id ? folderPathMap.get(f.parent_id) : null;
    }
    return path;
  }, [browseFolderId, folderPathMap]);
  const browseSubfolders = useMemo(
    () => folders.filter(f => f.parent_id === browseFolderId),
    [folders, browseFolderId]
  );
  const browseDocsHere = useMemo(
    () => browseDocs.filter(d => d.folder_id === browseFolderId),
    [browseDocs, browseFolderId]
  );
  const browseFolderName = browseFolderId
    ? folderPathMap.get(browseFolderId)?.name ?? 'Folder'
    : '/';

  const restoreVersion = async (version) => {
    if (!editor) return;
    if (!window.confirm(`Restore the version from ${new Date(version.created_at).toLocaleString()}? Your current content will be saved as a version first.`)) return;

    if (session && docIdRef.current) {
      await supabase.from('document_versions').insert({
        document_id: docIdRef.current,
        user_id: session.user.id,
        title: docTitle,
        content: { ...editor.getJSON(), pageSettings: pageSettingsRef.current, commentThreads: commentThreadsRef.current },
      });
    }
    // Already snapshotted the pre-restore state above; don't let the
    // autosave's own first-edit-of-session check snapshot it again.
    versionSnapshotDoneRef.current = true;

    editor.commands.setContent(version.content);
    if (version.content?.pageSettings) setPageSettings(version.content.pageSettings);
    setCommentThreads(version.content?.commentThreads || []);
    setShowVersions(false);
    setDiffVersion(null);
  };

  // ---- HELPERS ----
  const handleShowSource = () => {
    if (!editor) return;
    setLatexCode(generateLaTeX(editor));
    setShowSource(true);
  };


  if (!editor) return <div>Loading…</div>;

  // ---- RENDER ----
  return (
    <>
      {isEditorReady && (
        <>
          <div className="editor-container">
            <div className="menubar">
              {onBack && (
                <button className="menubar-back" onClick={onBack} title="Back to FlumenWrite">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M8.5 2.5L3.5 7l5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              <span className="menubar-brand">FlumenWrite</span>
              {docIdRef.current && (
                <input
                  className="menubar-title"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  onBlur={e => saveTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                  spellCheck={false}
                />
              )}
              <div className="menubar-menu-wrap">
                <button
                  className={`menubar-item${showTemplates ? ' active' : ''}`}
                  onClick={() => setShowTemplates(v => !v)}
                  title="Insert a document template"
                >
                  <LayoutGrid size={15} />
                  <span>Templates</span>
                  <ChevronDown size={14} />
                </button>
                {showTemplates && (
                  <TemplatesMenu
                    templates={TEMPLATES}
                    onApply={applyTemplate}
                    onClose={() => setShowTemplates(false)}
                  />
                )}
              </div>
            </div>
            <div className="toolbar">
              <div className="toolbar-inner">

                <div className="toolbar-group">
                  <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''} title="Bold (Ctrl+B)"><Bold size={16} /></button>
                  <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''} title="Italic (Ctrl+I)"><Italic size={16} /></button>
                  <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'active' : ''} title="Underline (Ctrl+U)"><Underline size={16} /></button>
                  <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'active' : ''} title="Strikethrough"><Strikethrough size={16} /></button>
                </div>

                <div className="toolbar-group">
                  <input type="color" value={highlightColor} onMouseDown={e => e.preventDefault()} onChange={e => { setHighlightColor(e.target.value); editor.chain().focus().setHighlight({ color: e.target.value }).run(); }} style={{ width: '24px', height: '24px', padding: 0, border: 'none', cursor: 'pointer' }} title="Highlight color" />
                  <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().unsetHighlight().run()} title="Remove highlight"><Highlighter size={16} /></button>
                </div>

                <div className="toolbar-group">
                  <select
                    value={(() => {
                      const fonts = [
                        '',
                        'KaTeX_Main, WebCM Serif 10, serif',
                        'sans-serif',
                        'monospace',
                        'Arial, sans-serif',
                        'Times New Roman, serif',
                        'Courier New, monospace',
                        'Georgia, serif',
                        'Helvetica, sans-serif',
                        'Verdana, sans-serif',
                        'Tahoma, sans-serif',
                        'Lucida Console, monospace',
                        'Impact, fantasy',
                      ];
                      return fonts.find(f => f && editor.isActive('textStyle', { fontFamily: f })) || '';
                    })()}
                    onChange={e => {
                      const f = e.target.value;
                      if (!f) {
                        editor.chain().focus().unsetFontFamily().run();
                      } else {
                        editor.chain().focus().setFontFamily(f).run();
                      }
                    }}
                  >
                    <option value="">Default</option>
                    <option value="KaTeX_Main, WebCM Serif 10, serif">Computer Modern</option>
                    <option value="sans-serif">Sans-Serif</option>
                    <option value="monospace">Monospace</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Times New Roman, serif">Times New Roman</option>
                    <option value="Courier New, monospace">Courier New</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Helvetica, sans-serif">Helvetica</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                    <option value="Tahoma, sans-serif">Tahoma</option>
                    <option value="Lucida Console, monospace">Lucida Console</option>
                    <option value="Impact, fantasy">Impact</option>
                  </select>
                  <FontSizeControl editor={editor} />
                </div>

                <div className="toolbar-group">
                  <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align left (Ctrl+L)"><AlignLeft size={16} /></button>
                  <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Center (Ctrl+E)"><AlignCenter size={16} /></button>
                  <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align right (Ctrl+R)"><AlignRight size={16} /></button>
                  <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify (Ctrl+J)"><AlignJustify size={16} /></button>
                </div>

                <div className="toolbar-group">
                  <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Line"><Minus size={16} /></button>
                  <button onMouseDown={e => e.preventDefault()} onClick={() => editor.chain().focus().insertNewPage().run()} title="Page Break"><ScissorsIcon size={16} /></button>
                  <div className="toolbar-table-wrap" ref={tableButtonRef}>
                    <button
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => setShowTablePicker(v => !v)}
                      className={showTablePicker ? 'active' : ''}
                      title="Insert Table"
                    >
                      <TableIcon size={16} />
                    </button>
                  </div>
                  <button onClick={handleShowSource} title="Export .tex"><FileText size={16} /></button>
                  <button onMouseDown={e => e.preventDefault()} onClick={() => setShowImport(true)} title="Import .tex"><Upload size={16} /></button>
                  <button
                    onClick={handleExportPDF}
                    title="Export PDF (compiled LaTeX)"
                    disabled={!!pdfStatus}
                    style={pdfStatus ? { opacity: 0.7, cursor: 'wait', fontSize: '11px', padding: '2px 6px', gap: '4px', display: 'flex', alignItems: 'center' } : {}}
                  >
                    <FileDown size={16} />
                    {pdfStatus && <span>{pdfStatus}</span>}
                  </button>
                  <button onClick={handlePrintPDF} title="Print PDF"><Printer size={16} /></button>
                  <button onMouseDown={e => e.preventDefault()} onClick={() => setShowPreamble(true)} title="Preamble"><Wrench size={16} /></button>
                  <button onMouseDown={e => e.preventDefault()} onClick={() => setShowBibliography(true)} title="Bibliography (.bib)"><BookOpen size={16} /></button>
                  <button onMouseDown={e => e.preventDefault()} onClick={() => setShowPageSettings(true)} title="Page Settings"><LayoutTemplate size={16} /></button>
                  {pageSettings.columns === 2 && (
                    <button
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleColumnSpan().run()}
                      className={editor.isActive({ columnSpan: true }) ? 'active' : ''}
                      title="Span both columns"
                    >
                      <Columns2 size={16} />
                    </button>
                  )}
                </div>

                <div className="toolbar-group">
                  <button
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      const { from, to } = editor.state.selection;
                      if (from === to) return;
                      const commentId = Date.now().toString();
                      const quote = editor.state.doc.textBetween(from, to, ' ');
                      editor.chain().focus().toggleComment(commentId).run();
                      addCommentThread(commentId, quote);
                    }}
                    disabled={editor.state.selection.empty}
                    title="Add comment"
                  >
                    <MessageSquare size={16} />
                  </button>
                </div>

                <div className="toolbar-right">
                  <a href="https://docs.google.com/document/d/1nBMPNTxlaXkcNME8on8_TwG4jL0Ep0Y1CuvhfGUWr5M" target="_blank" rel="noopener noreferrer" className="toolbar-link">Guide</a>
                  <a href="https://forms.gle/SsKvNGMgPDFrGD8w7" target="_blank" rel="noopener noreferrer" className="toolbar-link">Feedback</a>
                  <span className="toolbar-version">v0.6.0 Alpha</span>
                </div>
              </div>
            </div>

            {/* The ProseMirror div is the gray canvas; page-node cards are white sheets inside it */}
            <div className="page-wrapper">
              <EditorContent editor={editor} />
            </div>

            {showSource && (
              <div className="modal-backdrop" onClick={() => setShowSource(false)}>
                <div className="source-modal" onClick={e => e.stopPropagation()}>
                  <div className="source-modal-header">
                    <h3>Generated LaTeX</h3>
                    <button onClick={() => setShowSource(false)}>✕</button>
                  </div>
                  <pre className="source-code">{latexCode}</pre>
                  <div className="source-modal-actions">
                    <button onClick={() => navigator.clipboard.writeText(latexCode)}>Copy</button>
                    <button onClick={() => {
                      const blob = new Blob([latexCode], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'document.tex'; a.click();
                      URL.revokeObjectURL(url);
                    }}>Download .tex</button>
                  </div>
                </div>
              </div>
            )}

            {showImport && (
              <ImportLatexModal
                onImport={(raw) => {
                  setShowImport(false);
                  setPaginatingImport(true);
                  editor.commands.setContent(importLaTeX(raw));
                }}
                onClose={() => setShowImport(false)}
              />
            )}

            {mathModal.open && (
              <MathEditModal
                isDisplay={mathModal.isDisplay}
                initialLatex={mathModal.latex}
                onUpdate={(newLatex) => {
                  if (editor && mathModal.getPos) {
                    const nodeTypeName = mathModal.isDisplay ? 'katexDisplay' : 'katex';
                    const pos = resolveNodePos(
                      editor.state.doc,
                      mathModal.getPos(),
                      nodeTypeName,
                      (attrs) => attrs.latex === mathModal.latex
                    );
                    if (pos !== null) {
                      editor.view.dispatch(
                        editor.state.tr.setNodeMarkup(pos, null, { latex: newLatex })
                      );
                      SoundEngine.play('math.commit');
                    }
                  }
                }}
                onClose={() => setMathModal({ open: false, latex: '', nodePos: null })}
                onComment={handleMathComment}
                nodePos={mathModal.nodePos}
              />
            )}

            {tableModal.open && (
              <TableEditModal
                initialRaw={tableModal.raw}
                onUpdate={(newRaw) => {
                  if (editor && tableModal.getPos) {
                    const pos = resolveNodePos(
                      editor.state.doc,
                      tableModal.getPos(),
                      'latexTable',
                      (attrs) => attrs.raw === tableModal.raw
                    );
                    if (pos !== null) {
                      editor.view.dispatch(
                        editor.state.tr.setNodeMarkup(pos, null, { raw: newRaw })
                      );
                      SoundEngine.play('math.commit');
                    }
                  }
                }}
                onClose={() => setTableModal({ open: false, raw: '', getPos: null })}
              />
            )}

            {showPageSettings && (
              <PageSettingsModal
                settings={pageSettings}
                onChange={setPageSettings}
                onClose={() => setShowPageSettings(false)}
                soundSettings={soundSettings}
                onSoundChange={setSoundSettings}
              />
            )}

            {showPreamble && (
              <PreambleModal
                initialPreamble={preamble}
                onSave={(newPreamble) => { setPreamble(newPreamble); setShowPreamble(false); }}
                onClose={() => setShowPreamble(false)}
              />
            )}

            {showBibliography && (
              <BibliographyModal
                initialBibliography={bibliography}
                onSave={(newBibliography) => { setBibliography(newBibliography); setShowBibliography(false); }}
                onClose={() => setShowBibliography(false)}
              />
            )}

            {showShare && (
              <ShareModal
                docId={docIdRef.current}
                initialLinkShared={docProp?.link_shared}
                onClose={() => setShowShare(false)}
              />
            )}

            {contextMenu.show && (
              <div
                data-context-menu
                style={{
                  position: 'fixed', top: contextMenu.y, left: contextMenu.x,
                  background: 'white', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
padding: '4px', minWidth: '196px',
                }}
              >
                <div className={`context-menu-item ${contextMenu.hasSelection ? '' : 'disabled'}`} onClick={(e) => {
                  e.stopPropagation();
                  if (!contextMenu.hasSelection) return;
                  const sel = window.getSelection().toString();
                  if (sel) navigator.clipboard.writeText(sel).then(() => editor.chain().focus().deleteSelection().run());
                  setContextMenu({ show: false, x: 0, y: 0, hasSelection: false });
                }}>
                  <span>Cut</span><span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Ctrl+X</span>
                </div>
                <div className={`context-menu-item ${contextMenu.hasSelection ? '' : 'disabled'}`} onClick={(e) => {
                  e.stopPropagation();
                  if (!contextMenu.hasSelection) return;
                  navigator.clipboard.writeText(window.getSelection().toString());
                  setContextMenu({ show: false, x: 0, y: 0, hasSelection: false });
                }}>
                  <span>Copy</span><span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Ctrl+C</span>
                </div>
                <div className="context-menu-item" onClick={async (e) => {
                  e.stopPropagation();
                  try { const t = await navigator.clipboard.readText(); if (t) editor.chain().focus().insertContent(t).run(); } catch {}
                  setContextMenu({ show: false, x: 0, y: 0, hasSelection: false });
                }}>
                  <span>Paste</span><span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Ctrl+V</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', margin: '3px 0' }} />
                <div className={`context-menu-item ${contextMenu.hasSelection ? '' : 'disabled'}`} onClick={(e) => {
                  e.stopPropagation();
                  if (!contextMenu.hasSelection) return;
                  const { state } = editor;
                  const { from, to } = state.selection;
                  const commentId = Date.now().toString();
                  editor.chain().focus().toggleComment(commentId).run();
                  addCommentThread(commentId, state.doc.textBetween(from, to, ' '));
                  setContextMenu({ show: false, x: 0, y: 0, hasSelection: false });
                }}>
                  <span>Comment</span><span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Ctrl+Alt+M</span>
                </div>
              </div>
            )}
          </div>

          <div className="floating-right-actions">
            {isOwner && (
              <button
                className={`floating-action-btn${showShare ? ' active' : ''}`}
                onClick={() => setShowShare(prev => !prev)}
                title="Share"
              >
                <Users size={16} />
              </button>
            )}
            {isOwner && (
              <button
                ref={folderButtonRef}
                className={`floating-action-btn${showFolderMenu ? ' active' : ''}`}
                onClick={() => setShowFolderMenu(prev => !prev)}
                title={`Folder: ${currentFolderName}`}
              >
                <Folder size={16} />
              </button>
            )}
            <button
              className={`floating-action-btn${showOutline ? ' active' : ''}`}
              onClick={() => setShowOutline(prev => !prev)}
              title={showOutline ? 'Hide Outline' : 'Show Outline'}
            >
              <List size={16} />
            </button>
            <button
              className={`floating-action-btn${showVersions ? ' active' : ''}`}
              onClick={() => setShowVersions(prev => !prev)}
              title={showVersions ? 'Hide Version History' : 'Show Version History'}
            >
              <History size={16} />
            </button>
            <button
              className={`floating-action-btn${showComments ? ' active' : ''}`}
              onClick={() => {
                setShowComments(prev => {
                  if (!prev) setMathModal({ open: false, latex: '', nodePos: null });
                  return !prev;
                });
              }}
              title={showComments ? 'Hide Comments' : 'Show Comments'}
            >
              <MessageSquare size={16} />
            </button>
          </div>

          <MathLivePreview
            active={mathZone.active}
            latex={mathZone.latex}
            coords={mathZone.coords}
            suggestions={mathZone.suggestions}
            selectedIdx={mathZone.selectedIdx}
          />

          {showFolderMenu && createPortal(
            <div className="folder-picker-backdrop" onClick={() => setShowFolderMenu(false)} />,
            document.body
          )}
          {showFolderMenu && folderButtonRef.current && createPortal(
            (() => {
              const rect = folderButtonRef.current.getBoundingClientRect();
              return (
                <div
                  className="folder-picker-portal"
                  style={{ position: 'fixed', top: rect.top, right: window.innerWidth - rect.left + 10 }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="folder-picker-crumbs">
                    <button className="folder-picker-crumb" onClick={() => setBrowseFolderId(null)}>/</button>
                    {browsePath.map(f => (
                      <React.Fragment key={f.id}>
                        <span className="folder-picker-crumb-sep">/</span>
                        <button className="folder-picker-crumb" onClick={() => setBrowseFolderId(f.id)}>
                          {f.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>

                  {browseSubfolders.map(folder => (
                    <button
                      key={folder.id}
                      className="folder-picker-item"
                      onClick={() => setBrowseFolderId(folder.id)}
                    >
                      <Folder size={13} /> {folder.name}
                    </button>
                  ))}
                  {browseDocsHere.map(doc => (
                    <button
                      key={doc.id}
                      className={`folder-picker-item${doc.id === docIdRef.current ? ' active' : ''}`}
                      onClick={() => switchToDocument(doc.id)}
                    >
                      <FileText size={13} /> {doc.title || 'Untitled Document'}
                      {doc.id === docIdRef.current && <span className="folder-picker-current">current</span>}
                    </button>
                  ))}
                  {browseSubfolders.length === 0 && browseDocsHere.length === 0 && (
                    <div className="folder-picker-empty">Empty</div>
                  )}

                  <button
                    className="folder-picker-move-here"
                    disabled={browseFolderId === currentFolderId}
                    onClick={() => moveToFolder(browseFolderId)}
                  >
                    Move this document to {browseFolderName === '/' ? '/' : `"${browseFolderName}"`}
                  </button>
                </div>
              );
            })(),
            document.body
          )}

          {showTablePicker && tableButtonRef.current && createPortal(
            (() => {
              const rect = tableButtonRef.current.getBoundingClientRect();
              return (
                <div
                  className="table-picker table-picker-portal"
                  style={{ position: 'fixed', top: rect.bottom + 6, left: rect.left }}
                  onMouseLeave={() => setTableHover({ cols: 0, rows: 0 })}
                >
                  <div className="table-picker-grid">
                    {Array.from({ length: 6 }, (_, r) =>
                      Array.from({ length: 6 }, (_, c) => (
                        <div
                          key={`${r}-${c}`}
                          className={`table-picker-cell${r < tableHover.rows && c < tableHover.cols ? ' hovered' : ''}`}
                          onMouseEnter={() => setTableHover({ rows: r + 1, cols: c + 1 })}
                          onClick={() => {
                            const raw = defaultTableRaw(tableHover.rows, tableHover.cols);
                            const pos = editor.state.selection.from;
                            editor.chain().focus().insertLatexTable(raw).run();
                            setShowTablePicker(false);
                            setTableHover({ cols: 0, rows: 0 });
                            setTableModal({ open: true, raw, getPos: () => pos });
                          }}
                        />
                      ))
                    )}
                  </div>
                  <div className="table-picker-label">
                    {tableHover.rows > 0
                      ? `${tableHover.rows} × ${tableHover.cols}`
                      : 'Hover to select size'}
                  </div>
                </div>
              );
            })(),
            document.body
          )}

          {showOutline && (
            <OutlineSidebar
              headings={outlineHeadings}
              onSelect={goToHeading}
              onClose={() => setShowOutline(false)}
            />
          )}

          {showVersions && (
            <VersionHistorySidebar
              versions={versions}
              onRestore={restoreVersion}
              onViewChanges={setDiffVersion}
              onClose={() => setShowVersions(false)}
            />
          )}

          {diffVersion && (
            <VersionDiffView
              version={diffVersion}
              currentContent={{ ...editor.getJSON(), pageSettings: pageSettingsRef.current, commentThreads: commentThreadsRef.current }}
              onRestore={restoreVersion}
              onClose={() => setDiffVersion(null)}
            />
          )}

          {showComments && (
            <CommentSidebar
              threads={commentThreads}
              activeId={activeCommentId}
              onSelect={id => { setActiveCommentId(id); scrollToComment(id); }}
              onReply={(id, value) => setCommentThreads(prev => prev.map(t =>
                t.id === id
                  ? t.text ? { ...t, replies: [...t.replies, value] } : { ...t, text: value }
                  : t
              ))}
              onResolve={id => { removeCommentMark(id); setCommentThreads(prev => prev.map(t => t.id === id ? { ...t, resolved: true } : t)); }}
              onDelete={id => { removeCommentMark(id); setCommentThreads(prev => prev.filter(t => t.id !== id)); }}
              onClose={() => setShowComments(false)}
            />
          )}
        </>
      )}
      {pageIndicator.total > 1 && (
        <div
          className={`page-indicator${pageIndicator.show ? ' page-indicator--visible' : ''}`}
          style={{ top: pageIndicator.top }}
        >
          {pageIndicator.current} / {pageIndicator.total}
        </div>
      )}
      {showLoading && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, transition: 'opacity 0.5s ease', opacity: fadeOut ? 0 : 1 }}>
          <LoadingScreen />
        </div>
      )}
      {!showLoading && paginatingImport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
          <LoadingScreen message="Laying out your document…" />
        </div>
      )}
    </>
  );
};

export default Editor;