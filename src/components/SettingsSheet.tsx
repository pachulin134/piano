import { LEVEL_LABELS, type Level } from '../core/simplifySong';
import type { EngineConfig } from '../core/practiceEngine';

interface Props {
  level: Level;
  speed: number;
  hand: EngineConfig['hand'];
  waitMode: boolean;
  /** Enseñar el interruptor de espera solo cuando aplica (aprender sin micrófono). */
  showWaitMode: boolean;
  showHand: boolean;
  /** Solo en modo libre: interruptor "la app toca las notas". null = no mostrar. */
  appSound: boolean | null;
  onAppSound?: (on: boolean) => void;
  onChange: (patch: Partial<{ level: Level; speed: number; hand: EngineConfig['hand']; waitMode: boolean }>) => void;
  onClose: () => void;
}

/** Hoja inferior de ajustes. Cambiar nivel/mano reinicia la canción (lo gestiona el padre); velocidad y sonido se aplican al momento. */
export default function SettingsSheet({ level, speed, hand, waitMode, showWaitMode, showHand, appSound, onAppSound, onChange, onClose }: Props) {
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="sheet">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <strong style={{ flex: 1, fontSize: 17 }}>⚙ Ajustes</strong>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 20 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 90, color: 'var(--ink-2)' }}>Nivel</span>
            <select value={level} onChange={e => onChange({ level: e.target.value as Level })}>
              {(Object.keys(LEVEL_LABELS) as Level[]).map(l =>
                <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 90, color: 'var(--ink-2)' }}>Velocidad</span>
            <input
              type="range" min={10} max={100} step={5}
              value={Math.round(speed * 100)}
              onChange={e => onChange({ speed: Number(e.target.value) / 100 })}
              style={{ flex: 1 }}
            />
            <span style={{ width: 44, fontWeight: 700, textAlign: 'right' }}>{Math.round(speed * 100)}%</span>
          </label>
          {showHand && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 90, color: 'var(--ink-2)' }}>Mano</span>
              <select value={hand} onChange={e => onChange({ hand: e.target.value as EngineConfig['hand'] })}>
                <option value="both">Ambas</option>
                <option value="right">Derecha 🟠</option>
                <option value="left">Izquierda 🟢</option>
              </select>
            </label>
          )}
          {showWaitMode && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 90, color: 'var(--ink-2)' }}>Espera</span>
              <input type="checkbox" checked={waitMode} onChange={e => onChange({ waitMode: e.target.checked })} />
              <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>pausa hasta que toques la nota</span>
            </label>
          )}
          {appSound !== null && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 90, color: 'var(--ink-2)' }}>Sonido</span>
              <input type="checkbox" checked={appSound} onChange={e => onAppSound?.(e.target.checked)} />
              <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>la app toca las notas</span>
            </label>
          )}
          <p style={{ color: 'var(--ink-3)', fontSize: 12 }}>Cambiar nivel o mano reinicia la canción; la velocidad y el sonido se aplican al momento.</p>
        </div>
      </div>
    </>
  );
}
