'use client';

import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', background: '#fef2f2', minHeight: '100vh' }}>
          <h1 style={{ color: '#dc2626', fontSize: 20, marginBottom: 12 }}>
            Something crashed
          </h1>
          <pre style={{ color: '#991b1b', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, marginBottom: 16 }}>
            {this.state.error?.toString()}
          </pre>
          <details open style={{ marginBottom: 16 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: 8 }}>
              Stack trace
            </summary>
            <pre style={{ color: '#6b7280', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11 }}>
              {this.state.error?.stack}
            </pre>
          </details>
          {this.state.errorInfo && (
            <details style={{ marginBottom: 16 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: 8 }}>
                Component stack
              </summary>
              <pre style={{ color: '#6b7280', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11 }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
            }}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
