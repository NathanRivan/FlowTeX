import React, { useState } from 'react';
import { supabase } from './supabase';
import './Dashboard.css';

function HomeView({ onLaunch }) {
  const products = [
    {
      id: 'flumenwrite',
      name: 'FlumenWrite',
      icon: 'f',
      desc: 'A document editor built for deep work — rich text, LaTeX math, and beautiful typesetting in one place.',
      available: true,
    },
    {
      id: 'soon',
      name: 'More coming soon',
      icon: '·',
      desc: 'New FlumenWorks products are in the works. Stay tuned.',
      available: false,
    },
  ];

  return (
    <div className="dash-view">
      <div className="dash-view-header">
        <p className="dash-view-eyebrow">FlumenWorks Dashboard</p>
        <h1 className="dash-view-title">Your products</h1>
      </div>
      <div className="dash-products">
        {products.map(p => (
          <div
            key={p.id}
            className={`dash-product-card ${p.available ? 'available' : ''}`}
            onClick={() => p.available && onLaunch(p.id)}
          >
            <div className={`dash-product-icon ${p.available ? '' : 'soon'}`}>{p.icon}</div>
            <div className="dash-product-name">{p.name}</div>
            <div className="dash-product-desc">{p.desc}</div>
            <div className="dash-product-footer">
              <span className={`dash-product-badge ${p.available ? 'live' : 'soon'}`}>
                {p.available ? 'Available' : 'Coming soon'}
              </span>
              {p.available && (
                <span className="dash-product-open">
                  Open
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 11L11 2M11 2H5M11 2V8" stroke="#2c3d54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ session, onLaunch }) {
  const [page, setPage] = useState('home');

  const isAuthed = !!session;

  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'there';

  const handleSignOut = async () => {
    if (isAuthed) {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } else {
      onLaunch();  /* ponytail: reuse onLaunch as "sign in" trigger for unauthed */
    }
  };

  const navItems = [
    { id: 'home',     label: 'Home' },
  ];

  return (
    <div className="dash-page">

      {/* ── SIDEBAR ── */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">FlumenWorks</div>

        <nav className="dash-sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`dash-nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <p className="dash-sidebar-user">{isAuthed ? displayName : 'Guest'}</p>
          <button className="dash-sidebar-signout" onClick={handleSignOut}>{isAuthed ? 'Sign out' : 'Sign in'}</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="dash-main">
        {page === 'home'     && <HomeView onLaunch={onLaunch} />}
      </main>

    </div>
  );
}
