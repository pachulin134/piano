import { useState } from 'react';
import { useMidiInput } from '../input/useMidiInput';
import { LEVEL_LABELS, type Level } from '../core/simplifySong';
import type { EngineConfig } from '../core/practiceEngine';
import type { Song } from '../core/types';

export type LearningMode = 'listen' | 'guided' | 'mic' | 'playalong' | 'practice';

export interface SessionConfig {
  mode: LearningMode;
  waitMode: boolean;
  hand: EngineConfig['hand'];
  level: Level;
  speed: number;
}

interface Props {
  song: Song;
  onBack: () => void;
  onStart: (config: SessionConfig) => void;
}

const SPEEDS = [0.25, 0.5, 0.75, 1] as const;

export default function SongSetupScreen({ song, onBack, onStart }: Props) {
  const [mode, setMode] = useState<LearningMode>('mic');
  const [waitMode, setWaitMode] = useState(true);
  const [hand, setHand] = useState<EngineConfig['hand']>('both');
  const [level, setLevel] = useState<Level>('original');
  const [speed, setSpeed] = useState(1);
  const midiDevice = useMidiInput(() => {});

  const midiLabel = midiDevice === 'unsupported'
    ? 'Tu navegador no soporta MIDI — usa Chrome o Edge en el PC'
    : midiDevice
      ? `✓ Piano conectado: ${midiDevice}`
      : 'Sin cable MIDI: usa el teclado en pantalla o A–L del PC';

  const midiReady = !!midiDevice && midiDevice !== 'unsupported';

  function start() {
    onStart({ mode, waitMode, hand, level, speed });
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 20, maxWidth: 560, margin: '0 auto' }}>
      <button onClick={onBack} style={{ marginBottom: 16 }}>← Volver</button>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>{song.title}</h1>
      <p style={{ color: '#9aa0b4', marginBottom: 24 }}>
        Elige cómo quieres aprender esta canción.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => setMode('mic')}
          style={{
            textAlign: 'left',
            padding: 16,
            border: mode === 'mic' ? '2px solid #b57bee' : '1px solid #3d4152',
            background: mode === 'mic' ? '#261e33' : '#1d2029',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>🎤 Corrígeme con micrófono</div>
          <div style={{ color: '#b8bcc8', fontSize: 14, lineHeight: 1.45 }}>
            Sin cable MIDI. Funciona en 2 pasos: (1) la app toca una nota en los altavoces,
            (2) tú la repites en tu piano y el micrófono te dice si está bien.
            Una nota cada vez, sitio tranquilo.
          </div>
        </button>

        <button
          onClick={() => setMode('playalong')}
          style={{
            textAlign: 'left',
            padding: 16,
            border: mode === 'playalong' ? '2px solid #4caf7d' : '1px solid #3d4152',
            background: mode === 'playalong' ? '#1a2e24' : '#1d2029',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>🎹 Toca y corrígeme</div>
          <div style={{ color: '#b8bcc8', fontSize: 14, lineHeight: 1.45 }}>
            Toca mientras las notas caen; la app te corrige al momento.
            Con cable MIDI escucha tu Privia; sin cable, usa el teclado en pantalla.
            (No usa micrófono.)
          </div>
          <div style={{
            marginTop: 10,
            fontSize: 13,
            color: midiReady ? '#7dcea0' : '#e8a060',
          }}>
            {midiLabel}
          </div>
        </button>

        <button
          onClick={() => setMode('guided')}
          style={{
            textAlign: 'left',
            padding: 16,
            border: mode === 'guided' ? '2px solid #c9a66b' : '1px solid #3d4152',
            background: mode === 'guided' ? '#2a2418' : '#1d2029',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>🎧→🎹 Escuchar y tocar</div>
          <div style={{ color: '#b8bcc8', fontSize: 14, lineHeight: 1.45 }}>
            La app toca cada nota en los altavoces; luego la repites tú.
            Con cable MIDI en tu Privia; sin cable, en el teclado de pantalla.
          </div>
          <div style={{
            marginTop: 10,
            fontSize: 13,
            color: midiReady ? '#7dcea0' : '#e8a060',
          }}>
            {midiLabel}
          </div>
        </button>

        <button
          onClick={() => setMode('listen')}
          style={{
            textAlign: 'left',
            padding: 16,
            border: mode === 'listen' ? '2px solid #7fb4ff' : '1px solid #3d4152',
            background: mode === 'listen' ? '#1e2a3d' : '#1d2029',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>🎧 Solo escuchar</div>
          <div style={{ color: '#b8bcc8', fontSize: 14, lineHeight: 1.45 }}>
            La app toca la canción sola. Mira las notas caer y escucha cómo suena antes de practicar.
          </div>
        </button>

        <button
          onClick={() => setMode('practice')}
          style={{
            textAlign: 'left',
            padding: 16,
            border: mode === 'practice' ? '2px solid #4caf7d' : '1px solid #3d4152',
            background: mode === 'practice' ? '#1a2e24' : '#1d2029',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>🎹 Practicar</div>
          <div style={{ color: '#b8bcc8', fontSize: 14, lineHeight: 1.45 }}>
            Toca libremente en tu piano Privia. La app te guía con las notas que caen y te corrige.
          </div>
          <div style={{
            marginTop: 10,
            fontSize: 13,
            color: midiReady ? '#7dcea0' : '#e8a060',
          }}>
            {midiLabel}
          </div>
        </button>
      </div>

      <section style={{ background: '#1d2029', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, marginBottom: 12 }}>Opciones</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <label>
            Nivel{' '}
            <select value={level} onChange={e => setLevel(e.target.value as Level)}>
              {(Object.keys(LEVEL_LABELS) as Level[]).map(l =>
                <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
            </select>
          </label>
          <label>
            Velocidad{' '}
            <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>
              {SPEEDS.map(v => <option key={v} value={v}>{v * 100}%</option>)}
            </select>
          </label>
          {mode !== 'listen' && (
            <>
              {mode === 'practice' && (
                <label>
                  <input type="checkbox" checked={waitMode} onChange={e => setWaitMode(e.target.checked)} />
                  {' '}Espera (pausa hasta que toques la nota)
                </label>
              )}
              <label>
                Mano{' '}
                <select value={hand} onChange={e => setHand(e.target.value as EngineConfig['hand'])}>
                  <option value="both">Ambas</option>
                  <option value="right">Derecha</option>
                  <option value="left">Izquierda</option>
                </select>
              </label>
            </>
          )}
        </div>
      </section>

      {mode === 'mic' && (
        <p style={{ color: '#9aa0b4', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
          Consejos: sitio tranquilo, micrófono del portátil cerca del piano, nivel <strong>Fácil</strong> y velocidad 50%.
          El navegador pedirá permiso para usar el micrófono.
        </p>
      )}

      {!midiReady && mode !== 'listen' && mode !== 'mic' && (
        <p style={{ color: '#9aa0b4', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
          Sin cable MIDI la app <em>no puede oír tu piano por el aire</em> (no hay micrófono).
          Mientras tanto puedes practicar tocando las teclas en pantalla o con A–L del teclado del PC.
          Cuando tengas el cable MIDI-USB, conectarás el Privia y funcionará con tu piano real.
        </p>
      )}

      <button
        onClick={start}
        style={{
          width: '100%',
          padding: '14px 16px',
          fontSize: 16,
          fontWeight: 600,
          background: mode === 'listen' ? '#2d4a6e'
            : mode === 'guided' ? '#5c4a2a'
            : mode === 'mic' ? '#4a2d6e'
            : mode === 'playalong' ? '#2d5e44' : '#2d5e44',
        }}
      >
        {mode === 'listen'
          ? '▶ Empezar a escuchar'
          : mode === 'guided'
            ? '▶ Empezar escuchar y tocar'
            : mode === 'mic'
              ? '▶ Empezar con micrófono'
              : mode === 'playalong'
                ? '▶ Empezar a tocar'
                : '▶ Empezar a practicar'}
      </button>
    </div>
  );
}
