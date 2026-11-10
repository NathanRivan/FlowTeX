import React from 'react';

export default class EditorErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Could not open document', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main role="alert" style={{ maxWidth: 560, margin: '80px auto', padding: 24, fontFamily: 'system-ui, sans-serif', color: 'var(--text-primary)' }}>
        <h1>Couldn’t open this document</h1>
        <p>Try again, or return to your documents.</p>
        <details style={{ margin: '16px 0', overflowWrap: 'anywhere' }}>
          <summary>Error details</summary>
          <p>{this.state.error.message || String(this.state.error)}</p>
        </details>
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" style={{ padding: '8px 16px' }} onClick={() => this.setState({ error: null })}>Try again</button>
          <button type="button" style={{ padding: '8px 16px' }} onClick={this.props.onBack}>Back to documents</button>
        </div>
      </main>
    );
  }
}
