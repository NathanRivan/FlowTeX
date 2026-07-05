import React, { useState } from 'react';
import { supabase } from './supabase';
import './AuthPage.css';

export default function AuthPage({ onBack }) {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!supabase) {
      setError('Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY environment variables.');
      setLoading(false);
      return;
    }

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: window.location.origin } });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for a confirmation link.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }

    setLoading(false);
  };

  const handleGoogle = async () => {
    if (!supabase) {
      setError('Supabase is not configured. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY environment variables.');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">

      {onBack && (
        <button className="auth-back-btn" onClick={onBack} aria-label="Back to landing page">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M15 9H3M3 9L7.5 13.5M3 9L7.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
      )}

      {/* ── LEFT PANEL ── */}
      <div className="auth-brand">
        <div className="auth-brand-f" aria-hidden="true">f</div>

        <div className="auth-brand-logo">
          <span className="auth-brand-logo-text">FlumenWorks</span>
        </div>

        <div className="auth-brand-body">
          {mode === 'signin' ? (
            <div className="auth-brand-text" key="signin">
              <h2 className="auth-brand-headline">
                Everything flows<br />
                <strong>from here.</strong>
              </h2>
              <p className="auth-brand-desc">
                Sign in to your FlumenWorks account to access all your products in one place.
              </p>
            </div>
          ) : (
            <div className="auth-brand-text" key="signup">
              <h2 className="auth-brand-headline">
                One account,<br />
                <strong>one ecosystem.</strong>
              </h2>
              <p className="auth-brand-desc">
                Create a FlumenWorks account to access FlumenWrite and all future products.
              </p>
            </div>
          )}
        </div>

        <div className="auth-brand-footer">
          <div className="auth-brand-footer-line" />
          <span className="auth-brand-footer-text">est. 2026</span>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={`auth-tab ${mode === 'signin' ? 'active' : ''}`} onClick={() => { setMode('signin'); setError(''); setMessage(''); setName(''); }}>Sign in</button>
            <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Sign up</button>
          </div>

          <div className="auth-form-body">
          <button className="auth-google-btn" onClick={handleGoogle}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider"><span>or</span></div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className={`auth-name-field ${mode === 'signup' ? 'visible' : ''}`}>
              <div className="auth-name-field-inner">
                <div className="auth-field">
                  <label>Display name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="How should we call you?"
                    required={mode === 'signup'}
                  />
                </div>
              </div>
            </div>

            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && <p className="auth-error">{error}</p>}
            {message && <p className="auth-message">{message}</p>}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Loading…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          </form>

          </div>{/* end auth-form-body */}
        </div>
      </div>

      </div>{/* end auth-container */}
    </div>
  );
}
