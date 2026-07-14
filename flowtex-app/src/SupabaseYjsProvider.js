import * as Y from 'yjs';

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const PERSIST_DEBOUNCE_MS = 2000;

// Hand-rolled Yjs transport over a Supabase Realtime broadcast channel.
// Broadcast is fire-and-forget with no replay, so `load()` re-runs on every
// reconnect (not just the initial mount) to self-heal from anything missed
// while disconnected — Y.applyUpdate is idempotent, so re-applying a known
// snapshot is harmless.
export class SupabaseYjsProvider {
  constructor(supabase, docId, ydoc) {
    this.supabase = supabase;
    this.docId = docId;
    this.ydoc = ydoc;
    this.channel = null;
    this.persistTimer = null;
    this._onUpdate = this._onUpdate.bind(this);
  }

  async load() {
    try {
      const { data } = await this.supabase
        .from('documents')
        .select('yjs_state')
        .eq('id', this.docId)
        .single();
      if (data?.yjs_state) {
        Y.applyUpdate(this.ydoc, base64ToBytes(data.yjs_state), 'initial-load');
      }
    } catch {
      // Column not migrated yet, or row doesn't exist (e.g. dev-bypass fake id) — start empty.
    }
  }

  connect() {
    this.channel = this.supabase
      .channel('yjs-doc-' + this.docId, { config: { broadcast: { self: false, ack: false } } })
      .on('broadcast', { event: 'update' }, ({ payload }) => {
        Y.applyUpdate(this.ydoc, base64ToBytes(payload.u), 'remote');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') this.load();
      });
    this.ydoc.on('update', this._onUpdate);
  }

  _onUpdate(update, origin) {
    if (origin === 'remote' || origin === 'initial-load') return;
    this.channel?.send({ type: 'broadcast', event: 'update', payload: { u: bytesToBase64(update) } });
    this._schedulePersist();
  }

  _schedulePersist() {
    clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(async () => {
      try {
        await this.supabase
          .from('documents')
          .update({ yjs_state: bytesToBase64(Y.encodeStateAsUpdate(this.ydoc)) })
          .eq('id', this.docId);
      } catch {
        // Same tolerances as load() — non-fatal, just means this snapshot didn't land.
      }
    }, PERSIST_DEBOUNCE_MS);
  }

  destroy() {
    clearTimeout(this.persistTimer);
    this.ydoc.off('update', this._onUpdate);
    if (this.channel) this.supabase.removeChannel(this.channel);
  }
}
