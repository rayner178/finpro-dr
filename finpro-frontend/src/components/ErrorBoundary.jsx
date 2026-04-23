// src/components/ErrorBoundary.jsx
// React class component — error boundaries must be class-based.
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // In production you'd send this to an error tracking service
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '60vh', gap: '16px', padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px' }}>💥</div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '18px', fontWeight: 700 }}>
            Algo salió mal en este módulo
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: '13px', maxWidth: '420px' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '8px 20px', background: 'var(--blue)', color: '#fff',
              border: 'none', borderRadius: 'var(--r)', cursor: 'pointer',
              fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '13px',
            }}
          >
            Reintentar
          </button>
          {import.meta.env.DEV && (
            <pre style={{
              fontSize: '11px', color: 'var(--text3)', background: 'var(--surface2)',
              padding: '12px', borderRadius: 'var(--r)', maxWidth: '600px',
              overflow: 'auto', textAlign: 'left', maxHeight: '200px',
            }}>
              {this.state.error.stack}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
