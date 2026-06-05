import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#1a1a2e', color: 'var(--ha-text-muted)', fontFamily: '"Century Gothic", sans-serif',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 500, padding: 32 }}>
            <h1 style={{ fontSize: 28, marginBottom: 12 }}>Une erreur est survenue</h1>
            <p style={{ color: '#999', marginBottom: 24 }}>
              L'application a rencontré un problème inattendu.
            </p>
            {this.state.error && (
              <pre style={{ color: '#ef4444', fontSize: 12, textAlign: 'left', background: '#111', padding: 16, borderRadius: 8, marginBottom: 16, maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error.message || String(this.state.error)}
                {'\n'}
                {this.state.error.stack}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 28px', fontSize: 15, cursor: 'pointer',
              }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
