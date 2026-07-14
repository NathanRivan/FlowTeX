import React, { useState } from 'react';
import { supabase } from './supabase';

const ShareModal = ({ docId, initialLinkShared, onClose }) => {
  const [linkShared, setLinkShared] = useState(!!initialLinkShared);
  const [email, setEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState([]);
  const [copied, setCopied] = useState(false);

  const shareLink = `${window.location.origin}${window.location.pathname}?doc=${docId}`;

  const toggleLinkShared = async () => {
    const next = !linkShared;
    setLinkShared(next);
    await supabase.from('documents').update({ link_shared: next }).eq('id', docId);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const invite = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setInviting(true);
    setInviteError('');
    const { error } = await supabase.rpc('invite_collaborator', { doc_id: docId, invitee_email: trimmed });
    setInviting(false);
    if (error) {
      setInviteError(error.message);
    } else {
      setInvitedEmails(prev => [...prev, trimmed]);
      setEmail('');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="source-modal" onClick={(e) => e.stopPropagation()}>
        <div className="source-modal-header">
          <h3>Share Document</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontFamily: '-apple-system, sans-serif', cursor: 'pointer' }}>
              <input type="checkbox" checked={linkShared} onChange={toggleLinkShared} />
              Anyone with the link can edit
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                className="math-textarea"
                readOnly
                value={shareLink}
                onClick={(e) => e.target.select()}
                style={{ flex: 1, fontSize: '12px', padding: '6px 8px' }}
              />
              <button onClick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
            </div>
          </div>

          <div>
            <p style={{ margin: '0 0 8px', fontSize: '13px', fontFamily: '-apple-system, sans-serif', color: 'var(--text-secondary)' }}>
              Invite a specific person by email
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="math-textarea"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') invite(); }}
                style={{ flex: 1, fontSize: '13px', padding: '6px 8px' }}
              />
              <button onClick={invite} disabled={inviting}>Invite</button>
            </div>
            {inviteError && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#d32f2f' }}>{inviteError}</p>
            )}
            {invitedEmails.length > 0 && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Invited: {invitedEmails.join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
