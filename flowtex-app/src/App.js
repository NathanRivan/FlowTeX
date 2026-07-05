import React, { useState, useEffect } from 'react';
import Editor from './Editor';
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
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeDocument, setActiveDocument] = useState(null);

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
          <Editor
            session={session}
            document={activeDocument}
            onBack={() => setActiveDocument(null)}
          />
        </div>
      );
    }
    return (
      <div className="App">
        <FlumenWriteDashboard
          session={session}
          onOpenDocument={setActiveDocument}
          onBack={() => setActiveProduct(null)}
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
