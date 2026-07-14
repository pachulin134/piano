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
}

const DOOR_COLORS: Record<Door, { border: string; bg: string }> = {
  listen: { border: 'var(--listen)', bg: 'var(--listen-pale)' },
  follow: { border: '#b48ead', bg: '#f3e3f5' },
  learn: { border: 'var(--right-soft)', bg: 'var(--right-pale)' },
  play: { border: 'var(--left-soft)', bg: 'var(--left-pale)' },
};

export default function SongSetupScreen({ song, onBack, onStart }: Props) {
  const [door, setDoor] = useState<Door>('learn');
  const [input, setInput] = useState<InputKind | null>(null); // null = automático
  const [changingInput, setChangingInput] = useState(false);
  const [level, setLevel] = useState<Level>('original');
  const [speed, setSpeed] = useState(1);
  const [hand, setHand] = useState<EngineConfig['hand']>('both');
  const [appSound, setAppSound] = useState(true);
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
        <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 12 }}>← Volver</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{song.title}</h1>
        <p style={{ color: 'var(--ink-3)', marginBottom: 18 }}>¿Qué quieres hacer hoy?</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {(Object.keys(DOOR_LABELS) as Door[]).map(d => {
            const meta = DOOR_LABELS[d];
            const active = door === d;
            return (
              <button
                key={d}
                onClick={() => setDoor(d)}
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                  border: active ? `2px solid ${DOOR_COLORS[d].border}` : '1px solid var(--border)',
                }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: 14, background: DOOR_COLORS[d].bg, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>
                  {meta.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800 }}>
                    {meta.title}
                    {d === 'learn' && <span className="chip" style={{ marginLeft: 8, fontSize: 11 }}>Recomendado</span>}
                  </div>
                  <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>{meta.hint}</div>
                </div>
              </button>
            );
          })}
        </div>

        {door !== 'listen' && (
          <div className="chip" style={{ marginBottom: 6 }}>
            {effectiveInput === 'midi' ? '🎹' : effectiveInput === 'mic' ? '🎤' : '👆'}
            {' '}Te escucho por: <strong>{INPUT_LABELS[effectiveInput]}</strong>
            {availableInputs.length > 1 && (
              <button className="btn-ghost" style={{ padding: '0 4px', fontSize: 13 }}
                onClick={() => setChangingInput(v => !v)}>
                cambiar
              </button>
            )}
          </div>
        )}
        {changingInput && door !== 'listen' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
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
          <p style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 10 }}>
            Cuando conectes el cable MIDI-USB, tu piano aparecerá aquí automáticamente.
          </p>
        )}

        {door === 'follow' && (
          <label className="chip" style={{ marginBottom: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={appSound} onChange={e => setAppSound(e.target.checked)} />
            🔊 La app toca las notas (apágalo para tocar solo tú)
          </label>
        )}

        <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
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
        </div>

        {door === 'learn' && effectiveInput === 'mic' && (
          <p style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 14 }}>
            🎤 Consejos: sitio tranquilo, micrófono cerca del piano, nivel <strong>Fácil</strong> y velocidad 50%.
            El navegador pedirá permiso.
          </p>
        )}

        <button className="btn-primary" onClick={start} style={{ width: '100%', fontSize: 16 }}>
          ▶ Empezar
        </button>
      </div>
    </div>
  );
}
