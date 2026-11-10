import React, { useState, useEffect } from 'react';
import Editor from './Editor';
import EditorErrorBoundary from './EditorErrorBoundary';
import AuthPage from './AuthPage';
import LandingPage from './LandingPage';
import Dashboard from './Dashboard';
import FlumenWriteDashboard from './FlumenWriteDashboard';
import { supabase } from './supabase';
import './App.css';
import 'katex/dist/katex.min.css';

function App() {
  const [session, setSession] = useState(undefined);
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

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) { setActiveProduct(null); setActiveDocument(null); }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;

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
