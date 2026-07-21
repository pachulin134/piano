import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * Red de seguridad: sin esto, un fallo inesperado deja pantalla en blanco
 * (justo lo que pasó en un navegador MIDI no estándar) sin ninguna pista
 * de qué ocurrió, ni para el usuario ni para nosotros.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 40 }}>😵</div>
          <p style={{ fontWeight: 700, fontSize: 17 }}>Algo se ha roto</p>
          <p style={{ color: 'var(--ink-3)', fontSize: 13, maxWidth: 320 }}>{this.state.error.message}</p>
          <button className="btn-primary" onClick={() => { this.setState({ error: null }); location.reload(); }}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
