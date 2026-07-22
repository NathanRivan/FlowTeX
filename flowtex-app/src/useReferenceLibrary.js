import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import { notifyValidationChange } from './validationBus';

// No existing sync/offline pattern fits a plain Supabase table (the document
// body syncs via a hand-rolled Yjs broadcast provider — see
// SupabaseYjsProvider.js — which doesn't apply to flat CRUD rows). Personal
// reference libraries are small (tens to hundreds of rows), so a JSON blob in
// localStorage is enough; IndexedDB would be solving a scale problem this
// doesn't have. Offline mutations queue in localStorage too and flush on
// reconnect.

function cacheKey(userId) { return `flumenwrite.referenceLibrary.${userId}`; }
function queueKey(userId) { return `flumenwrite.referenceLibraryQueue.${userId}`; }

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full/unavailable — cache is best-effort */ }
}

export function useReferenceLibrary(session) {
  const userId = session?.user?.id || null;
  const [references, setReferences] = useState(() => (userId ? readJSON(cacheKey(userId), []) : []));
  const [online, setOnline] = useState(navigator.onLine);
  const queueRef = useRef(userId ? readJSON(queueKey(userId), []) : []);

  // Every mutation (local or remote-fetched) republishes the full list to the
  // window global CitationExtension/DocBibliographyNode read from, and pings
  // the same validationBus other node views already use to react to
  // out-of-band state changes.
  const publish = useCallback((refs) => {
    setReferences(refs);
    if (userId) writeJSON(cacheKey(userId), refs);
    window.flumenwriteReferenceLibrary = new Map(refs.map(r => [r.id, r]));
    notifyValidationChange();
  }, [userId]);

  const flushQueue = useCallback(async () => {
    if (!supabase || !userId || !queueRef.current.length) return;
    const remaining = [];
    for (const op of queueRef.current) {
      try {
        if (op.type === 'upsert') {
          const { error } = await supabase.from('reference_library').upsert(op.row);
          if (error) throw error;
        } else if (op.type === 'delete') {
          const { error } = await supabase.from('reference_library').delete().eq('id', op.id);
          if (error) throw error;
        }
      } catch {
        remaining.push(op); // keep it queued, try again next flush
      }
    }
    queueRef.current = remaining;
    writeJSON(queueKey(userId), remaining);
  }, [userId]);

  // Serve the cache immediately (instant, works offline), then reconcile
  // with Supabase in the background.
  useEffect(() => {
    if (!userId) return;
    publish(readJSON(cacheKey(userId), []));
    flushQueue();
    if (!supabase) return;
    supabase.from('reference_library').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      .then(({ data, error }) => { if (!error && data) publish(data); });
  }, [userId, publish, flushQueue]);

  useEffect(() => {
    const goOnline = () => { setOnline(true); flushQueue(); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [flushQueue]);

  const enqueue = useCallback((op) => {
    queueRef.current = [...queueRef.current, op];
    if (userId) writeJSON(queueKey(userId), queueRef.current);
    if (navigator.onLine) flushQueue();
  }, [userId, flushQueue]);

  const addReference = useCallback((fields) => {
    if (!userId) return null;
    const row = { id: crypto.randomUUID(), user_id: userId, created_at: new Date().toISOString(), ...fields };
    publish([row, ...references]);
    enqueue({ type: 'upsert', row });
    return row;
  }, [userId, references, publish, enqueue]);

  const updateReference = useCallback((id, fields) => {
    const existing = references.find(r => r.id === id);
    if (!existing) return;
    const updated = { ...existing, ...fields };
    publish(references.map(r => (r.id === id ? updated : r)));
    enqueue({ type: 'upsert', row: updated });
  }, [references, publish, enqueue]);

  const deleteReference = useCallback((id) => {
    publish(references.filter(r => r.id !== id));
    enqueue({ type: 'delete', id });
  }, [references, publish, enqueue]);

  return { references, online, addReference, updateReference, deleteReference };
}
