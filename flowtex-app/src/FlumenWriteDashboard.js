import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { TEMPLATES } from './templates';
import './FlumenWriteDashboard.css';

const INITIAL_DOC = {
  type: 'doc',
  content: [{ type: 'page', content: [{ type: 'paragraph' }] }],
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

// Document card with page-thumbnail preview
function DocCard({ doc, onOpen, onDelete, formatDate }) {
  const preview = extractDocText(doc.content);
  const isEmpty = !preview;

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
      <p className="fw-doc-card-title">{doc.title || 'Untitled Document'}</p>
      <p className="fw-doc-card-date">Edited {formatDate(doc.updated_at)}</p>
      <button
        className="fw-doc-card-del"
        onClick={e => onDelete(e, doc.id)}
        title="Delete document"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 2.5h10M3.5 2.5V1.5h5v1M3.5 5V9.5M8.5 5V9.5M2 2.5l.65 8h6.7l.65-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

export default function FlumenWriteDashboard({ session, onOpenDocument, onBack }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'there';

  const loadDocuments = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select('id, title, updated_at, content')
      .order('updated_at', { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const createDocument = async (templateKey = null) => {
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
      })
      .select()
      .single();
    if (!error && data) {
      onOpenDocument({
        id: data.id,
        title: data.title,
        content: data.content,
        pageSettings: tpl?.pageSettings ?? null,
      });
    }
  };

  const openDocument = async (docId) => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', docId)
      .single();
    if (!error && data) {
      onOpenDocument({ id: data.id, title: data.title, content: data.content, pageSettings: null });
    }
  };

  const deleteDocument = async (e, docId) => {
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

  const filteredDocs = search.trim()
    ? documents.filter(doc => {
        const q = search.toLowerCase();
        return (
          (doc.title || '').toLowerCase().includes(q) ||
          extractDocText(doc.content).toLowerCase().includes(q)
        );
      })
    : documents;

  return (
    <div className="fw-dash">
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
          <button className="fw-new-btn" onClick={() => createDocument(null)}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            New Document
          </button>
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
          <div className="fw-section-header">
            <h2 className="fw-section-label">Your documents</h2>
            {!loading && documents.length > 0 && (
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
          {loading ? (
            <p className="fw-empty">Loading…</p>
          ) : documents.length === 0 ? (
            <p className="fw-empty">No documents yet — create one above to get started.</p>
          ) : filteredDocs.length === 0 ? (
            <p className="fw-empty">No documents match "{search}".</p>
          ) : (
            <div className="fw-doc-grid">
              {filteredDocs.map(doc => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  onOpen={openDocument}
                  onDelete={deleteDocument}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
