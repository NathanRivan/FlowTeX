import React, { useState, useEffect } from 'react';
import Editor from './Editor';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
import FlumenWriteDashboard from './FlumenWriteDashboard';
import { supabase } from './supabase';
import './App.css';
import 'katex/dist/katex.min.css';

function App() {
  const [session, setSession] = useState(undefined);
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeDocument, setActiveDocument] = useState(null);

  useEffect(() => {
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

  if (!session) return <div className="App"><AuthPage /></div>;

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
