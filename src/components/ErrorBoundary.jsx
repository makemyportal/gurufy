import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App crashed:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            Oops! Something went wrong
          </h1>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '400px' }}>
            The app ran into an unexpected error. Please refresh the page to try again.
          </p>
          <details style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', maxWidth: '600px', textAlign: 'left', marginBottom: '1.5rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#475569' }}>Error Details</summary>
            <pre style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '0.75rem 2rem',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
