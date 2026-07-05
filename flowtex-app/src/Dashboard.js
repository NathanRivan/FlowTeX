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

function AboutView() {
  return (
    <div className="dash-view">
      <div className="dash-view-header">
        <p className="dash-view-eyebrow">Who we are</p>
        <h1 className="dash-view-title">About FlumenWorks</h1>
      </div>

      <div className="dash-about-hero">
        <p className="dash-about-mission">
          "We build software for people who do serious intellectual work."
        </p>
      </div>

      <div className="dash-about-body">
        <div className="dash-about-block">
          <h3 className="dash-about-block-title">What we believe</h3>
          <p className="dash-about-block-text">
            The tools you think with shape the quality of your thinking. Most software
            is designed for speed of onboarding, not depth of use. FlumenWorks is different —
            we build for the long session, the serious draft, the idea that needs room to breathe.
          </p>
        </div>

        <div className="dash-about-block">
          <h3 className="dash-about-block-title">What we're building</h3>
          <p className="dash-about-block-text">
            FlumenWorks is a suite of focused, opinionated tools for researchers, writers,
            academics, and anyone who works with complex ideas. Each product does one thing
            exceptionally well and integrates seamlessly with the rest of the ecosystem.
          </p>
        </div>

        <div className="dash-about-pillars">
          <div className="dash-pillar">
            <span className="dash-pillar-icon">✦</span>
            <span className="dash-pillar-label">Precision</span>
            <p className="dash-pillar-desc">Every feature earns its place. No bloat, no noise.</p>
          </div>
          <div className="dash-pillar">
            <span className="dash-pillar-icon">~</span>
            <span className="dash-pillar-label">Flow</span>
            <p className="dash-pillar-desc">Software that gets out of your way so ideas can move.</p>
          </div>
          <div className="dash-pillar">
            <span className="dash-pillar-icon">∞</span>
            <span className="dash-pillar-label">Depth</span>
            <p className="dash-pillar-desc">Built for experts, not for onboarding screenshots.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FoundersView() {
  const founders = [
    {
      name: 'Clement Rivan',
      role: 'Founder & CEO',
      initials: 'CR',
      bio: 'Clement started FlumenWorks with a simple frustration: the tools for serious intellectual work were either too simple or too complex. FlumenWorks is his answer — software that respects the user\'s intelligence.',
    },
  ];

  return (
    <div className="dash-view">
      <div className="dash-view-header">
        <p className="dash-view-eyebrow">The people behind it</p>
        <h1 className="dash-view-title">Founders</h1>
      </div>

      <div className="dash-founders">
        {founders.map(f => (
          <div key={f.name} className="dash-founder-card">
            <div className="dash-founder-avatar">{f.initials}</div>
            <div className="dash-founder-info">
              <p className="dash-founder-name">{f.name}</p>
              <p className="dash-founder-role">{f.role}</p>
              <p className="dash-founder-bio">{f.bio}</p>
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
    { id: 'about',    label: 'About Us' },
    { id: 'founders', label: 'Founders' },
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
        {page === 'about'    && <AboutView />}
        {page === 'founders' && <FoundersView />}
      </main>

    </div>
  );
}
