import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Keyboard from '../components/Keyboard';
import NoteFall from '../components/NoteFall';
import { PracticeEngine, type EngineConfig } from '../core/practiceEngine';
import { fitRange } from '../core/keyLayout';
import { initPiano, playNote } from '../audio/piano';
import { useMidiInput } from '../input/useMidiInput';
import { useComputerKeys } from '../input/useComputerKeys';
import type { Song } from '../core/types';

interface Props {
  song: Song;
  onExit: (score: number | null) => void; // score final o null si no hay puntuación válida
}

export default function PracticeScreen({ song, onExit }: Props) {
  const [config, setConfig] = useState<EngineConfig>({ waitMode: true, speed: 1, hand: 'both' });
  const [running, setRunning] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [time, setTime] = useState(0);
  const [pressed, setPressed] = useState(new Set<number>());
  const [expected, setExpected] = useState(new Set<number>());
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const engineRef = useRef<PracticeEngine | undefined>(undefined);

  const [loMidi, hiMidi] = useMemo(() => fitRange(song.notes), [song]);
  const practicedNotes = useMemo(
    () => config.hand === 'both' ? song.notes : song.notes.filter(n => n.hand === config.hand),
    [song, config.hand],
  );

  // (Re)crear el motor al cambiar la configuración
  useEffect(() => {
    engineRef.current = new PracticeEngine(song, config);
    setTime(0);
    setExpected(new Set());
    setRunning(false);
  }, [song, config]);

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Actualiza expected solo si cambió de verdad (evita re-render del teclado a 60fps)
  const syncExpected = useCallback(() => {
    const notes = engineRef.current?.expectedNotes() ?? [];
    setExpected(prev => {
      if (prev.size === notes.length && notes.every(n => prev.has(n))) return prev;
      return new Set(notes);
    });
  }, []);

  // Bucle de animación
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const engine = engineRef.current!;
      const dt = (now - last) / 1000;
      last = now;
      for (const n of engine.tick(dt)) playNote(n.midi, n.duration);
      setTime(engine.time);
      syncExpected();
      if (engine.finished) {
        setRunning(false);
        onExit(engine.config.waitMode && engine.attempted ? engine.score() : null);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, onExit, syncExpected]);

  const handleKey = useCallback((midi: number, down: boolean) => {
    setPressed(prev => {
      const next = new Set(prev);
      if (down) next.add(midi); else next.delete(midi);
      return next;
    });
    if (down) {
      engineRef.current?.onKeyDown(midi);
      syncExpected();
    }
  }, [syncExpected]);

  // Entradas: piano MIDI, teclado de ordenador y (vía <Keyboard/>) táctil
  const midiDevice = useMidiInput(handleKey);
  useComputerKeys(handleKey);
  // En táctil/teclado no hay piano real que suene: sonar nosotros
  const handleScreenKey = useCallback((midi: number, down: boolean) => {
    if (down) playNote(midi, 0.6);
    handleKey(midi, down);
  }, [handleKey]);

  const start = async () => {
    try {
      setAudioError(false);
      await initPiano();
      setRunning(true);
    } catch {
      setAudioError(true);
    }
  };

  const keyboardH = Math.max(90, Math.round(size.h * 0.22));
  const barH = 52;
  const fallH = size.h - keyboardH - barH;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: barH, display: 'flex', gap: 8, alignItems: 'center', padding: '0 10px', flexWrap: 'nowrap', overflowX: 'auto' }}>
        <button onClick={() => onExit(null)}>← Salir</button>
        <strong style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</strong>
        <button onClick={running ? () => setRunning(false) : start}>{running ? '⏸ Pausa' : '▶ Tocar'}</button>
        <label><input type="checkbox" checked={config.waitMode}
          onChange={e => setConfig(c => ({ ...c, waitMode: e.target.checked }))} /> Espera</label>
        <select value={config.hand}
          onChange={e => setConfig(c => ({ ...c, hand: e.target.value as EngineConfig['hand'] }))}>
          <option value="both">Ambas manos</option>
          <option value="right">Mano derecha</option>
          <option value="left">Mano izquierda</option>
        </select>
        <select value={config.speed}
          onChange={e => setConfig(c => ({ ...c, speed: Number(e.target.value) }))}>
          <option value={0.25}>25%</option><option value={0.5}>50%</option>
          <option value={0.75}>75%</option><option value={1}>100%</option>
        </select>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {audioError ? '⚠ Sin sonido (revisa conexión)' :
            midiDevice === 'unsupported' ? 'Sin MIDI (usa pantalla)' : midiDevice ?? 'Piano no conectado'}
        </span>
      </div>
      <NoteFall notes={practicedNotes} currentTime={time}
        loMidi={loMidi} hiMidi={hiMidi} width={size.w} height={fallH} />
      <Keyboard loMidi={loMidi} hiMidi={hiMidi} width={size.w} height={keyboardH}
        pressed={pressed} expected={expected} onKey={handleScreenKey} />
    </div>
  );
}
