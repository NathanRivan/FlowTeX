import React, { useEffect, useRef, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Quote, X } from 'lucide-react';

const EMPTY_FORM = { title: '', authors: '', year: '', source: '', url_doi: '', type: 'article' };

const ReferenceSidebar = ({ references, citedIds, activeId, online, onAdd, onUpdate, onDelete, onCite, onClose }) => {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const itemRefs = useRef({});

  useEffect(() => {
    if (activeId && itemRefs.current[activeId]) {
      itemRefs.current[activeId].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeId]);

  const filtered = references.filter(r => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return r.title?.toLowerCase().includes(q) || r.authors?.toLowerCase().includes(q);
  });

  const startAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setAdding(true); };
  const startEdit = (ref) => {
    setForm({ title: ref.title || '', authors: ref.authors || '', year: ref.year || '', source: ref.source || '', url_doi: ref.url_doi || '', type: ref.type || 'article' });
    setAdding(false);
    setEditingId(ref.id);
  };
  const cancelForm = () => { setAdding(false); setEditingId(null); };

  const saveForm = () => {
    if (!form.title.trim()) return;
    if (editingId) onUpdate(editingId, form);
    else onAdd(form);
    cancelForm();
  };

  const renderForm = () => (
    <div className="reference-form" onClick={e => e.stopPropagation()}>
      <input placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
      <input placeholder="Authors (Smith, John and Doe, Jane)" value={form.authors} onChange={e => setForm(f => ({ ...f, authors: e.target.value }))} />
      <div className="reference-form-row">
        <input placeholder="Year" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          <option value="article">Article</option>
          <option value="book">Book</option>
          <option value="conference">Conference</option>
          <option value="thesis">Thesis</option>
          <option value="report">Report</option>
          <option value="website">Website</option>
          <option value="other">Other</option>
        </select>
      </div>
      <input placeholder="Journal / Publisher / Site" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
      <input placeholder="URL or DOI" value={form.url_doi} onChange={e => setForm(f => ({ ...f, url_doi: e.target.value }))} />
      <div className="reference-form-actions">
        <button onClick={saveForm}>{editingId ? 'Save' : 'Add'}</button>
        <button onClick={cancelForm}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="comment-sidebar reference-sidebar">
      <div className="comment-sidebar-header">
        <h3>References{!online && <span className="reference-offline-badge" title="Offline — changes sync once you're back online">offline</span>}</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="close-btn" onClick={startAdd} title="Add reference" aria-label="Add reference"><Plus size={16} /></button>
          <button className="close-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
      </div>

      <div className="reference-search">
        <Search size={14} />
        <input placeholder="Search title or author…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      <div className="comment-threads-list">
        {adding && renderForm()}
        {filtered.length === 0 && !adding && (
          <div className="comment-threads-empty">
            <p>No references yet.</p>
            <p>Click <strong>+</strong> to add one.</p>
          </div>
        )}
        {filtered.map(ref => (
          <div
            key={ref.id}
            ref={el => (itemRefs.current[ref.id] = el)}
            className={`comment-thread reference-item${citedIds.has(ref.id) ? ' cited' : ''}${activeId === ref.id ? ' active' : ''}`}
          >
            {editingId === ref.id ? renderForm() : (
              <>
                <div className="comment-body">{ref.title}</div>
                <div className="comment-quote">{ref.authors}{ref.year ? ` (${ref.year})` : ''}</div>
                {citedIds.has(ref.id) && <span className="resolved-badge">Cited in this document</span>}
                <div className="comment-meta">
                  <div className="comment-actions">
                    <button onClick={() => onCite(ref.id)} title="Insert citation at cursor"><Quote size={13} /></button>
                    <button onClick={() => startEdit(ref)} title="Edit"><Pencil size={13} /></button>
                    <button onClick={() => { if (window.confirm('Delete this reference?')) onDelete(ref.id); }} title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReferenceSidebar;
