import React from 'react';
import Editor from './Editor';
import './App.css';
import 'katex/dist/katex.min.css';

function App() {
  return (
    <div className="App">
      <h1>FlowTeX</h1>
      <Editor />
    </div>
  );
}

export default App;