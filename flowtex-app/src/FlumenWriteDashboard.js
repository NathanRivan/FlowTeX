import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './supabase';
import { TEMPLATES } from './templates';
import { flattenFolders } from './folderUtils';
import './FlumenWriteDashboard.css';

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

const FEATURED_TEMPLATE_KEYS = ['blank', 'ieee', 'thesis', 'cv'];

// Walk ProseMirror JSON and collect all text nodes
function extractDocText(content, maxChars = 400) {
  if (!content) return '';
  const parts = [];
  function walk(node) {
    if (node.text) parts.push(node.text);
    if (node.content) node.content.forEach(walk);
  }
  walk(content);
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

// Mini page thumbnail for each template layout
function TemplateThumb({ tplKey, columns }) {
  if (columns === 2) {
    // IEEE / ACM: centered title + abstract line, then two columns
    return (
      <div className="fw-tpl-thumb">
        <div className="fw-tl fw-tl-title-c" />
        <div className="fw-tl fw-tl-sub-c" />
        <div className="fw-tl fw-tl-sub-c fw-tl-xs" style={{ marginBottom: 6 }} />
        <div className="fw-tl-two-col">
          <div className="fw-tl-col">
            <div className="fw-tl fw-tl-hdr" />
            <div className="fw-tl fw-tl-body" />
            <div className="fw-tl fw-tl-body fw-tl-s" />
            <div className="fw-tl fw-tl-body" />
            <div className="fw-tl fw-tl-body fw-tl-s" />
            <div className="fw-tl fw-tl-body" />
          </div>
          <div className="fw-tl-col">
            <div className="fw-tl fw-tl-hdr" />
            <div className="fw-tl fw-tl-body" />
            <div className="fw-tl fw-tl-body fw-tl-s" />
            <div className="fw-tl fw-tl-body" />
            <div className="fw-tl fw-tl-body fw-tl-s" />
            <div className="fw-tl fw-tl-body" />
          </div>
        </div>
      </div>
    );
  }
  if (tplKey === 'thesis') {
    // Thesis: large centered title, lots of spacing, double-spaced body
    return (
      <div className="fw-tpl-thumb">
        <div style={{ marginTop: 8 }} />
        <div className="fw-tl fw-tl-title-c fw-tl-lg" />
        <div className="fw-tl fw-tl-sub-c" style={{ marginBottom: 10 }} />
        <div className="fw-tl fw-tl-hdr" style={{ marginBottom: 6 }} />
        <div className="fw-tl fw-tl-body" style={{ marginBottom: 4 }} />
        <div className="fw-tl fw-tl-body" style={{ marginBottom: 4 }} />
        <div className="fw-tl fw-tl-body fw-tl-s" />
      </div>
    );
  }
  if (tplKey === 'cv') {
    // CV: name centered, role, divider, sections with indented bullets
    return (
      <div className="fw-tpl-thumb">
        <div className="fw-tl fw-tl-title-c fw-tl-lg" />
        <div className="fw-tl fw-tl-sub-c" style={{ marginBottom: 5 }} />
        <div className="fw-tl-divider" />
        <div className="fw-tl fw-tl-hdr" style={{ marginBottom: 3 }} />
        <div className="fw-tl fw-tl-body" />
        <div className="fw-tl fw-tl-body fw-tl-s" style={{ marginBottom: 5 }} />
        <div className="fw-tl fw-tl-hdr" style={{ marginBottom: 3 }} />
        <div className="fw-tl fw-tl-body" />
        <div className="fw-tl fw-tl-body fw-tl-m" />
      </div>
    );
  }
  // Blank
  return (
    <div className="fw-tpl-thumb">
      <div style={{ marginTop: 14 }} />
      <div className="fw-tl fw-tl-body" style={{ marginBottom: 5 }} />
      <div className="fw-tl fw-tl-body" style={{ marginBottom: 5 }} />
      <div className="fw-tl fw-tl-body fw-tl-m" />
    </div>
  );
}

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M1 2.5h10M3.5 2.5V1.5h5v1M3.5 5V9.5M8.5 5V9.5M2 2.5l.65 8h6.7l.65-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MoveIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M1 3.5a1 1 0 0 1 1-1h2.3l1 1H10a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-5.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
  </svg>
);

const RenameIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M8.5 1.5l2 2L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Document card with page-thumbnail preview
function DocCard({ doc, isShared, onOpen, onDelete, formatDate, folderOptions, isMoveMenuOpen, onToggleMove, onMoveTo }) {
  const preview = extractDocText(doc.content);
  const isEmpty = !preview;
  const moveBtnRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);

  const handleToggleMove = (e) => {
    e.stopPropagation();
    if (!isMoveMenuOpen && moveBtnRef.current) {
      const rect = moveBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, left: Math.max(8, rect.right - 180) });
    }
    onToggleMove(doc.id);
  };

  return (
    <div className="fw-doc-card" onClick={() => onOpen(doc.id)}>
      <div className="fw-doc-page-thumb">
        {isEmpty ? (
          <div className="fw-doc-thumb-empty">
            <div className="fw-tl fw-tl-body" />
            <div className="fw-tl fw-tl-body fw-tl-m" />
            <div className="fw-tl fw-tl-body fw-tl-s" />
          </div>
        ) : (
          <div className="fw-doc-thumb-text">{preview}</div>
        )}
      </div>
      <p className="fw-doc-card-title">
        {doc.title || 'Untitled Document'}
        {isShared && <span className="fw-doc-shared-pill">Shared</span>}
      </p>
      <p className="fw-doc-card-date">Edited {formatDate(doc.updated_at)}</p>
      {!isShared && (
        <div className={`fw-card-actions${isMoveMenuOpen ? ' fw-card-actions--open' : ''}`}>
          <button
            ref={moveBtnRef}
            className="fw-card-action-btn"
            onClick={handleToggleMove}
            title="Move to folder"
          >
            <MoveIcon />
          </button>
          <button
            className="fw-card-action-btn fw-card-action-del"
            onClick={e => onDelete(e, doc.id)}
            title="Delete document"
          >
            <TrashIcon />
          </button>
        </div>
      )}
      {isMoveMenuOpen && menuPos && createPortal(
        <div
          className="fw-move-menu"
          style={{ top: menuPos.top, left: menuPos.left }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="fw-move-menu-item"
            disabled={doc.folder_id === null}
            onClick={() => onMoveTo(doc.id, null)}
          >
            /
          </button>
          {folderOptions.map(({ folder, depth }) => (
            <button
              key={folder.id}
              className="fw-move-menu-item"
              style={{ paddingLeft: 10 + depth * 14 }}
              disabled={doc.folder_id === folder.id}
              onClick={() => onMoveTo(doc.id, folder.id)}
            >
              {folder.name}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// Folder card: same shell as a document card, folder icon instead of a page preview
function FolderCard({ folder, isRenaming, onOpen, onStartRename, onCommitRename, onCancelRename, onDelete }) {
  const [draft, setDraft] = useState(folder.name);
  useEffect(() => { setDraft(folder.name); }, [folder.name, isRenaming]);

  return (
    <div className="fw-doc-card fw-folder-card" onClick={() => !isRenaming && onOpen(folder.id)}>
      <div className="fw-doc-page-thumb">
        <div className="fw-folder-thumb">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="fw-folder-icon">
            <path d="M3 6.5a2 2 0 0 1 2-2h4.2l1.8 2H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {isRenaming ? (
        <input
          className="fw-folder-rename-input"
          value={draft}
          autoFocus
          onClick={e => e.stopPropagation()}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => onCommitRename(folder.id, draft)}
          onKeyDown={e => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') onCancelRename();
          }}
        />
      ) : (
        <p className="fw-doc-card-title">{folder.name}</p>
      )}
      <p className="fw-doc-card-date">Folder</p>
      <div className="fw-card-actions">
        <button
          className="fw-card-action-btn"
          onClick={e => { e.stopPropagation(); onStartRename(folder.id); }}
          title="Rename folder"
        >
          <RenameIcon />
        </button>
        <button
          className="fw-card-action-btn fw-card-action-del"
          onClick={e => onDelete(e, folder.id)}
          title="Delete folder"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

export default function FlumenWriteDashboard({ session, onOpenDocument, onBack, initialDocId }) {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [accessError, setAccessError] = useState(null);
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [moveMenuDocId, setMoveMenuDocId] = useState(null);

  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'there';

  const loadDocuments = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const [{ data: docs }, { data: fld }] = await Promise.all([
      supabase
        .from('documents')
        .select('id, title, updated_at, content, user_id, folder_id')
        .order('updated_at', { ascending: false }),
      supabase.from('folders').select('*').order('name'),
    ]);
    setDocuments(docs || []);
    setFolders(fld || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  useEffect(() => {
    if (initialDocId) openDocument(initialDocId);
  }, [initialDocId]); // eslint-disable-line react-hooks/exhaustive-deps

  const folderMap = useMemo(() => new Map(folders.map(f => [f.id, f])), [folders]);

  const breadcrumbs = useMemo(() => {
    const path = [];
    let f = currentFolderId ? folderMap.get(currentFolderId) : null;
    while (f) {
      path.unshift(f);
      f = f.parent_id ? folderMap.get(f.parent_id) : null;
    }
    return path;
  }, [currentFolderId, folderMap]);

  const foldersInView = useMemo(
    () => folders.filter(f => f.parent_id === currentFolderId),
    [folders, currentFolderId]
  );

  const folderOptions = useMemo(() => flattenFolders(folders), [folders]);

  // Shared-with-me documents carry another user's folder_id, which we can't
  // resolve (their folders aren't visible to us) — surface them at the top level only.
  const docsInView = useMemo(
    () => documents.filter(doc =>
      doc.user_id === session.user.id
        ? doc.folder_id === currentFolderId
        : currentFolderId === null
    ),
    [documents, currentFolderId, session.user.id]
  );

  const openFolder = (folderId) => {
    setCurrentFolderId(folderId);
    setSearch('');
    setMoveMenuDocId(null);
  };

  const createDocument = async (templateKey = null) => {
    if (!supabase) return;
    const tpl = templateKey ? TEMPLATES.find(t => t.key === templateKey) : null;
    const baseContent = tpl?.content ?? INITIAL_DOC;
    const content = tpl?.pageSettings
      ? { ...baseContent, pageSettings: tpl.pageSettings }
      : baseContent;
    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: session.user.id,
        title: tpl ? tpl.label : 'Untitled Document',
        content,
        folder_id: currentFolderId,
      })
      .select()
      .single();
    if (!error && data) {
      onOpenDocument({
        id: data.id,
        title: data.title,
        content: data.content,
        pageSettings: tpl?.pageSettings ?? null,
        user_id: data.user_id,
        link_shared: data.link_shared,
        folder_id: data.folder_id,
      });
    }
  };

  const createFolder = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('folders')
      .insert({ user_id: session.user.id, parent_id: currentFolderId, name: 'Untitled Folder' })
      .select()
      .single();
    if (!error && data) {
      setFolders(prev => [...prev, data]);
      setRenamingFolderId(data.id);
    }
  };

  const commitFolderRename = async (folderId, name) => {
    setRenamingFolderId(null);
    const trimmed = name.trim() || 'Untitled Folder';
    setFolders(prev => prev.map(f => (f.id === folderId ? { ...f, name: trimmed } : f)));
    if (!supabase) return;
    await supabase.from('folders').update({ name: trimmed }).eq('id', folderId);
  };

  const deleteFolder = async (e, folderId) => {
    e.stopPropagation();
    if (!supabase) return;
    if (!window.confirm('Delete this folder? Subfolders are deleted too; documents inside move to the top level.')) return;
    const isAncestorOfCurrent = folderId === currentFolderId || breadcrumbs.some(b => b.id === folderId);
    await supabase.from('folders').delete().eq('id', folderId);
    if (isAncestorOfCurrent) setCurrentFolderId(null);
    loadDocuments();
  };

  const toggleMoveMenu = (docId) => {
    setMoveMenuDocId(prev => (prev === docId ? null : docId));
  };

  const moveDocumentTo = async (docId, folderId) => {
    setMoveMenuDocId(null);
    setDocuments(prev => prev.map(d => (d.id === docId ? { ...d, folder_id: folderId } : d)));
    if (!supabase) return;
    await supabase.from('documents').update({ folder_id: folderId }).eq('id', docId);
  };

  const openDocument = async (docId) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', docId)
      .single();
    if (!error && data) {
      setAccessError(null);
      onOpenDocument({
        id: data.id,
        title: data.title,
        content: data.content,
        pageSettings: null,
        user_id: data.user_id,
        link_shared: data.link_shared,
        folder_id: data.folder_id,
      });
    } else {
      setAccessError("This document doesn't exist or you don't have access to it.");
    }
  };

  const deleteDocument = async (e, docId) => {
    if (!supabase) return;
    e.stopPropagation();
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    await supabase.from('documents').delete().eq('id', docId);
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const formatDate = (str) => {
    const d = new Date(str);
    const diffMs = Date.now() - d;
    const days = Math.floor(diffMs / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      year: days > 365 ? 'numeric' : undefined,
    });
  };

  const quickTemplates = TEMPLATES.filter(t => FEATURED_TEMPLATE_KEYS.includes(t.key));

  const isSearching = search.trim().length > 0;
  const filteredDocs = isSearching
    ? documents.filter(doc => {
        const q = search.toLowerCase();
        return (
          (doc.title || '').toLowerCase().includes(q) ||
          extractDocText(doc.content).toLowerCase().includes(q)
        );
      })
    : docsInView;
  const visibleFolders = isSearching ? [] : foldersInView;

  return (
    <div className="fw-dash">
      {moveMenuDocId && <div className="fw-move-backdrop" onClick={() => setMoveMenuDocId(null)} />}

      <header className="fw-header">
        <button className="fw-back-btn" onClick={onBack}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M9.5 3L4.5 7.5 9.5 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>

        </button>
        <div className="fw-header-brand">
          <span className="fw-header-f">f</span>
          FlumenWrite
        </div>
        <div className="fw-header-user">{displayName}</div>
      </header>

      <main className="fw-main">

        {/* Welcome + CTA */}
        <section className="fw-top">
          <div>
            <h1 className="fw-welcome">Welcome back, <strong>{displayName}</strong>.</h1>
            <p className="fw-welcome-sub">Continue writing or start something new.</p>
          </div>
          <div className="fw-top-actions">
            <button className="fw-new-folder-btn" onClick={createFolder}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M1.5 4.2a1.2 1.2 0 0 1 1.2-1.2h2.7l1.2 1.2h6.2a1.2 1.2 0 0 1 1.2 1.2v6.1a1.2 1.2 0 0 1-1.2 1.2H2.7a1.2 1.2 0 0 1-1.2-1.2V4.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
              New Folder
            </button>
            <button className="fw-new-btn" onClick={() => createDocument(null)}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              New Document
            </button>
          </div>
        </section>

        {/* Templates */}
        <section className="fw-section">
          <h2 className="fw-section-label">Start from a template</h2>
          <div className="fw-templates">
            {quickTemplates.map(tpl => (
              <button key={tpl.key} className="fw-template-card" onClick={() => createDocument(tpl.key)}>
                <TemplateThumb tplKey={tpl.key} columns={tpl.pageSettings?.columns ?? 1} />
                <span className="fw-tpl-name">{tpl.label}</span>
                <span className="fw-tpl-desc">{tpl.description}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Documents */}
        <section className="fw-section">
          {breadcrumbs.length > 0 && (
            <nav className="fw-breadcrumbs" aria-label="Folder path">
              <button className="fw-breadcrumb-item" onClick={() => openFolder(null)}>Documents</button>
              {breadcrumbs.map((f, i) => (
                <React.Fragment key={f.id}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="fw-breadcrumb-sep">
                    <path d="M3.5 2L7 5l-3.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {i === breadcrumbs.length - 1 ? (
                    <span className="fw-breadcrumb-current">{f.name}</span>
                  ) : (
                    <button className="fw-breadcrumb-item" onClick={() => openFolder(f.id)}>{f.name}</button>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          <div className="fw-section-header">
            <h2 className="fw-section-label">Your documents</h2>
            {!loading && (documents.length > 0 || folders.length > 0) && (
              <div className="fw-search-wrap">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="fw-search-icon">
                  <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M8.5 8.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <input
                  className="fw-search"
                  type="text"
                  placeholder="Search documents…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button className="fw-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
          {accessError && <p className="fw-empty">{accessError}</p>}
          {loading ? (
            <p className="fw-empty">Loading…</p>
          ) : visibleFolders.length === 0 && filteredDocs.length === 0 ? (
            <p className="fw-empty">
              {isSearching
                ? `No documents match "${search}".`
                : currentFolderId
                ? 'This folder is empty.'
                : 'No documents yet — create one above to get started.'}
            </p>
          ) : (
            <div className="fw-doc-grid">
              {visibleFolders.map(folder => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  isRenaming={renamingFolderId === folder.id}
                  onOpen={openFolder}
                  onStartRename={setRenamingFolderId}
                  onCommitRename={commitFolderRename}
                  onCancelRename={() => setRenamingFolderId(null)}
                  onDelete={deleteFolder}
                />
              ))}
              {filteredDocs.map(doc => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  isShared={doc.user_id !== session.user.id}
                  onOpen={openDocument}
                  onDelete={deleteDocument}
                  formatDate={formatDate}
                  folderOptions={folderOptions}
                  isMoveMenuOpen={moveMenuDocId === doc.id}
                  onToggleMove={toggleMoveMenu}
                  onMoveTo={moveDocumentTo}
                />
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
