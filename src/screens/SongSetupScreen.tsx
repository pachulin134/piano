import { useEffect, useState } from 'react';
import { useMidiInput } from '../input/useMidiInput';
import { LEVEL_LABELS, type Level } from '../core/simplifySong';
import {
  DOOR_LABELS, INPUT_LABELS, pickDefaultInput,
  type Door, type InputKind, type SessionConfig,
} from '../core/sessionModes';
import type { EngineConfig } from '../core/practiceEngine';
import type { Song } from '../core/types';

interface Props {
  song: Song;
  onBack: () => void;
  onStart: (config: SessionConfig) => void;
  initialValues?: SessionConfig | null;
}

const DOOR_COLORS: Record<Door, { border: string; bg: string }> = {
  listen: { border: 'var(--listen)', bg: 'var(--listen-pale)' },
  follow: { border: '#b48ead', bg: '#f3e3f5' },
  learn: { border: 'var(--right-soft)', bg: 'var(--right-pale)' },
  play: { border: 'var(--left-soft)', bg: 'var(--left-pale)' },
};

export default function SongSetupScreen({ song, onBack, onStart, initialValues }: Props) {
  const [door, setDoor] = useState<Door>(initialValues?.door ?? 'learn');
  const [input, setInput] = useState<InputKind | null>(initialValues?.input ?? null); // null = automático
  const [changingInput, setChangingInput] = useState(false);
  const [level, setLevel] = useState<Level>(initialValues?.level ?? 'easy');
  const [speed, setSpeed] = useState(initialValues?.speed ?? 0.6);
  const [hand, setHand] = useState<EngineConfig['hand']>(initialValues?.hand ?? 'both');
  const [appSound, setAppSound] = useState(initialValues?.appSound ?? true);
  const midiDevice = useMidiInput(() => {});
  const hasMidi = !!midiDevice && midiDevice !== 'unsupported';

  const effectiveInput: InputKind = input ?? pickDefaultInput(hasMidi, door);

  // "Tocar" no funciona con micrófono: si el usuario fijó mic y cambia a tocar, volvemos a automático
  useEffect(() => {
    if (door !== 'learn' && input === 'mic') setInput(null);
  }, [door, input]);

  function start() {
    onStart({ door, input: effectiveInput, level, speed, hand, waitMode: true, appSound });
  }

  const availableInputs: InputKind[] = [
    ...(hasMidi ? ['midi' as const] : []),
    ...(door === 'learn' ? ['mic' as const] : []),
    'screen' as const,
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 20 }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 10 }}>← Volver</button>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>¿Cómo quieres practicar «{song.title}»?</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          {(Object.keys(DOOR_LABELS) as Door[]).map(d => {
            const meta = DOOR_LABELS[d];
            const active = door === d;
            return (
              <button
                key={d}
                onClick={() => setDoor(d)}
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', padding: 10,
                  border: active ? `2px solid ${DOOR_COLORS[d].border}` : '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 20, flexShrink: 0 }}>{meta.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {meta.title}
                    {d === 'learn' && <span style={{ color: 'var(--right-soft)', fontSize: 16, lineHeight: 1 }}>●</span>}
                  </div>
                  <div style={{
                    color: 'var(--ink-3)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{meta.hint}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          {door !== 'listen' && (
            <span className="chip">
              {effectiveInput === 'midi' ? '🎹' : effectiveInput === 'mic' ? '🎤' : '👆'}
              {' '}<strong>{INPUT_LABELS[effectiveInput]}</strong>
              {availableInputs.length > 1 && (
                <button className="btn-ghost" style={{ padding: '0 4px', fontSize: 13 }}
                  onClick={() => setChangingInput(v => !v)}>
                  cambiar
                </button>
              )}
            </span>
          )}
          <label>Nivel{' '}
            <select value={level} onChange={e => setLevel(e.target.value as Level)}>
              {(Object.keys(LEVEL_LABELS) as Level[]).map(l =>
                <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Velocidad
            <input
              type="range" min={10} max={100} step={5}
              value={Math.round(speed * 100)}
              onChange={e => setSpeed(Number(e.target.value) / 100)}
            />
            <span style={{ fontWeight: 700 }}>{Math.round(speed * 100)}%</span>
          </label>
          {door !== 'listen' && door !== 'follow' && (
            <label>Mano{' '}
              <select value={hand} onChange={e => setHand(e.target.value as EngineConfig['hand'])}>
                <option value="both">Ambas</option>
                <option value="right">Derecha 🟠</option>
                <option value="left">Izquierda 🟢</option>
              </select>
            </label>
          )}
          {door === 'follow' && (
            <label className="chip" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={appSound} onChange={e => setAppSound(e.target.checked)} />
              🔊 Sonido de la app
            </label>
          )}
        </div>

        {changingInput && door !== 'listen' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {availableInputs.map(k => (
              <button key={k} className="chip"
                style={{ border: effectiveInput === k ? '2px solid var(--right)' : '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => { setInput(k); setChangingInput(false); }}>
                {INPUT_LABELS[k]}
              </button>
            ))}
          </div>
        )}
        {door !== 'listen' && effectiveInput === 'screen' && !hasMidi && (
          <p style={{ color: 'var(--ink-3)', fontSize: 11, marginBottom: 8 }}>
            Cuando conectes el cable MIDI-USB, tu piano aparecerá aquí automáticamente.
          </p>
        )}

        {door === 'learn' && effectiveInput === 'mic' && (
          <p style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 10 }}>
            🎤 Consejo: sitio tranquilo, micro cerca del piano, nivel <strong>Fácil</strong> y 50%.
          </p>
        )}

        <button className="btn-primary" onClick={start} style={{ width: '100%', fontSize: 16 }}>
          ▶ Empezar
        </button>
      </div>
    </div>
  );
}
