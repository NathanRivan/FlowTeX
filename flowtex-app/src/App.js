import React, { useState, useEffect } from 'react';
import Editor from './Editor';
import EditorErrorBoundary from './EditorErrorBoundary';
import AuthPage from './AuthPage';
import LandingPage from './LandingPage';
import Dashboard from './Dashboard';
import FlumenWriteDashboard from './FlumenWriteDashboard';
import LoadingScreen from './LoadingScreen';
import { supabase } from './supabase';
import './App.css';
import 'katex/dist/katex.min.css';

function App() {
  const [session, setSession] = useState(undefined);
  const [sessionError, setSessionError] = useState(null);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const [initialDocId] = useState(() => new URLSearchParams(window.location.search).get('doc'));
  const [activeProduct, setActiveProduct] = useState(() => (initialDocId ? 'flumenwrite' : null));
  const [activeDocument, setActiveDocument] = useState(null);

  const openDoc = (doc) => { setActiveDocument(doc); window.history.pushState(null, '', `?doc=${doc.id}`); };
  const closeDoc = () => { setActiveDocument(null); window.history.replaceState(null, '', window.location.pathname); };

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }

    let active = true;
    let authEventReceived = false;
    let subscription;
    const showError = (error) => {
      if (!active || authEventReceived) return;
      clearTimeout(timeout);
      setSessionError(error);
    };
    const timeout = setTimeout(() => {
      showError(new Error('Restoring your session took too long. Check your connection and try again.'));
    }, 15000);
    const applySession = (session) => {
      if (!active) return;
      clearTimeout(timeout);
      setSessionError(null);
      setSession(session);
    };

    try {
      ({ data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        authEventReceived = true;
        applySession(session);
        if (active && !session) { setActiveProduct(null); setActiveDocument(null); }
      }));
      supabase.auth.getSession().then(({ data, error }) => {
        if (!active || authEventReceived) return;
        if (error) showError(error);
        else applySession(data.session);
      }).catch(showError);
    } catch (error) {
      showError(error);
    }

    return () => {
      active = false;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, [sessionAttempt]);

  if (session === undefined) {
    if (sessionError) {
      return (
        <main className="app-startup-error" role="alert">
          <h1>Couldn’t restore your session</h1>
          <p>Try again to continue to your documents.</p>
          <details><summary>Error details</summary><p>{sessionError.message || String(sessionError)}</p></details>
          <button type="button" onClick={() => { setSessionError(null); setSessionAttempt(attempt => attempt + 1); }}>Try again</button>
        </main>
      );
    }
    return <LoadingScreen message="Restoring your session…" />;
  }

  if (!session) {
    if (showAuth) return <div className="App"><AuthPage onBack={() => setShowAuth(false)} /></div>;
    return <div className="App"><LandingPage onGetStarted={() => setShowAuth(true)} /></div>;
  }

  if (activeProduct === 'flumenwrite') {
    if (activeDocument !== null) {
      return (
        <div className="App">
          <EditorErrorBoundary key={activeDocument.id} onBack={closeDoc}>
            <Editor
              session={session}
              document={activeDocument}
              onBack={closeDoc}
              onOpenDocument={openDoc}
            />
          </EditorErrorBoundary>
        </div>
      );
    }
    return (
      <div className="App">
        <FlumenWriteDashboard
          session={session}
          onOpenDocument={openDoc}
          onBack={() => setActiveProduct(null)}
          initialDocId={initialDocId}
        />
      </div>
    );
  }

  return (
    <div className="App">
      <Dashboard session={session} onLaunch={setActiveProduct} />
    </div>
  );
}

export default App;
