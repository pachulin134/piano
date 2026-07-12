import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Keyboard from '../components/Keyboard';
import NoteFall from '../components/NoteFall';
import { PracticeEngine, type EngineConfig } from '../core/practiceEngine';
import { fitRange } from '../core/keyLayout';
import { initPiano, playNote } from '../audio/piano';
import { midiToName, nearestExpected } from '../audio/pitchDetect';
import { useMidiInput } from '../input/useMidiInput';
import { useMicPitch } from '../input/useMicPitch';
import { useComputerKeys } from '../input/useComputerKeys';
import type { GuidedPhase } from '../core/practiceEngine';
import { simplifySong, LEVEL_LABELS, type Level } from '../core/simplifySong';
import type { SessionConfig } from './SongSetupScreen';
import type { Song } from '../core/types';

interface Props {
  song: Song;
  initialConfig: SessionConfig;
  onExit: (score: number | null) => void;
  onChangeMode: () => void;
}

export default function PracticeScreen({ song, initialConfig, onExit, onChangeMode }: Props) {
  const [config, setConfig] = useState<EngineConfig>({
    waitMode: initialConfig.mode === 'practice' ? initialConfig.waitMode : true,
    speed: initialConfig.speed,
    hand: initialConfig.hand,
    listenMode: initialConfig.mode === 'listen',
    guidedMode: initialConfig.mode === 'guided' || initialConfig.mode === 'mic',
    playAlongMode: initialConfig.mode === 'playalong',
  });
  const micMode = initialConfig.mode === 'mic';
  const [level, setLevel] = useState<Level>(initialConfig.level);
  const [running, setRunning] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [time, setTime] = useState(0);
  const [pressed, setPressed] = useState(new Set<number>());
  const [expected, setExpected] = useState(new Set<number>());
  const [wrong, setWrong] = useState(new Set<number>());
  const [guidedHint, setGuidedHint] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const [guidedPhase, setGuidedPhase] = useState<GuidedPhase | null>(null);
  const [micReady, setMicReady] = useState(false);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const engineRef = useRef<PracticeEngine | undefined>(undefined);
  const feedbackTimer = useRef<number | undefined>(undefined);

  const listenMode = !!config.listenMode;
  const guidedMode = !!config.guidedMode;
  const playAlongMode = !!config.playAlongMode;
  const wantsPiano = (guidedMode && !micMode) || playAlongMode;
  const interactive = !listenMode;
  const effectiveSong = useMemo(() => simplifySong(song, level), [song, level]);

  const [loMidi, hiMidi] = useMemo(() => fitRange(effectiveSong.notes), [effectiveSong]);
  const practicedNotes = useMemo(
    () => listenMode || guidedMode || playAlongMode || config.hand === 'both'
      ? effectiveSong.notes
      : effectiveSong.notes.filter(n => n.hand === config.hand),
    [effectiveSong, config.hand, listenMode, guidedMode, playAlongMode],
  );

  const showFeedback = useCallback((msg: string, ms = 2000) => {
    setFeedback(msg);
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), ms);
  }, []);

  useEffect(() => {
    engineRef.current = new PracticeEngine(effectiveSong, config);
    setTime(0);
    setExpected(new Set());
    setPressed(new Set());
    setWrong(new Set());
    setGuidedHint(null);
    setFeedback(null);
    setLiveScore(null);
    setRunning(false);
  }, [effectiveSong, config]);

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!running || !micMode || guidedPhase !== 'repeat') {
      setMicReady(false);
      return;
    }
    setMicReady(false);
    const t = window.setTimeout(() => setMicReady(true), 500);
    return () => window.clearTimeout(t);
  }, [running, micMode, guidedPhase]);

  const syncExpected = useCallback(() => {
    const notes = engineRef.current?.expectedNotes() ?? [];
    setExpected(prev => {
      if (prev.size === notes.length && notes.every(n => prev.has(n))) return prev;
      return new Set(notes);
    });
  }, []);

  const syncGuidedHint = useCallback((hasMidi: boolean, mic: boolean, ready: boolean) => {
    const engine = engineRef.current;
    const phase = engine?.guidedPhase ?? null;
    const notes = engine?.expectedNotes() ?? [];
    const noteNames = notes.map(midiToName).join(' + ');

    if (phase === 'demo') {
      setGuidedHint('Paso 1: escucha esta nota en los altavoces ↑');
    } else if (phase === 'repeat') {
      if (mic) {
        setGuidedHint(ready
          ? `Paso 2: toca ${noteNames || 'la nota azul'} en tu piano 🎤`
          : 'Paso 2: en un momento… (espera a que termine el sonido)');
      } else if (hasMidi) {
        setGuidedHint(`Toca ${noteNames || 'la nota'} en tu piano`);
      } else {
        setGuidedHint(`Toca ${noteNames || 'la nota'} en pantalla o A–L`);
      }
    } else {
      setGuidedHint(mic && !running ? 'Pulsa ▶ Empezar (acepta el permiso del micrófono)' : null);
    }
    setGuidedPhase(phase);
  }, []);

  const flashKey = useCallback((midi: number, durationSec: number) => {
    setPressed(prev => new Set(prev).add(midi));
    window.setTimeout(() => {
      setPressed(prev => {
        if (!prev.has(midi)) return prev;
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
    }, durationSec * 1000);
  }, []);

  const handleKey = useCallback((midi: number, down: boolean) => {
    if (!interactive) return;
    setPressed(prev => {
      const next = new Set(prev);
      if (down) next.add(midi); else next.delete(midi);
      return next;
    });
    if (down) {
      const result = engineRef.current?.onKeyDown(midi);
      if (result === 'correct') {
        showFeedback('✓ ¡Correcto! Sigue así');
      } else if (result === 'wrong') {
        setWrong(prev => new Set(prev).add(midi));
        showFeedback('✗ Esa nota no es — inténtalo otra vez');
        window.setTimeout(() => setWrong(prev => {
          if (!prev.has(midi)) return prev;
          const next = new Set(prev); next.delete(midi); return next;
        }), 400);
      }
      syncExpected();
    }
  }, [syncExpected, interactive, showFeedback]);

  const midiDevice = useMidiInput(interactive && !micMode ? handleKey : () => {});
  const hasMidi = !!midiDevice && midiDevice !== 'unsupported';
  const screenInput = interactive && (!wantsPiano || !hasMidi);

  const handleScreenKey = useCallback((midi: number, down: boolean) => {
    if (!screenInput) return;
    if (down) playNote(midi, 0.6);
    handleKey(midi, down);
    if (down && guidedMode) syncGuidedHint(hasMidi, micMode, micReady);
  }, [handleKey, screenInput, guidedMode, syncGuidedHint, hasMidi, micMode, micReady]);

  const handleMicNote = useCallback((midi: number) => {
    const engine = engineRef.current;
    if (!engine || !micMode) return;
    const expected = engine.expectedNotes();
    if (expected.length === 0) return;

    const match = nearestExpected(midi, expected, 2);
    if (match !== null) {
      setPressed(prev => new Set(prev).add(match));
      const result = engine.onKeyDown(match);
      if (result === 'correct') {
        showFeedback(`✓ ¡Bien! Era ${midiToName(match)}`);
        window.setTimeout(() => setPressed(prev => {
          const next = new Set(prev); next.delete(match); return next;
        }), 300);
      } else if (result === 'wrong') {
        setWrong(prev => new Set(prev).add(match));
        showFeedback('✗ Casi — esa no era la nota');
        window.setTimeout(() => setWrong(prev => {
          const next = new Set(prev); next.delete(match); return next;
        }), 400);
      }
      syncExpected();
      return;
    }

    const near = nearestExpected(midi, expected, 6);
    if (near !== null) {
      setWrong(prev => new Set(prev).add(near));
      showFeedback(`✗ Tocaste ${midiToName(midi)} — necesitas ${midiToName(near)}`);
      window.setTimeout(() => setWrong(prev => {
        const next = new Set(prev); next.delete(near); return next;
      }), 400);
    }
  }, [micMode, showFeedback, syncExpected]);

  const mic = useMicPitch({
    active: micMode,
    listening: running && micMode && guidedPhase === 'repeat' && micReady,
    onNote: handleMicNote,
  });

  useComputerKeys(screenInput ? handleScreenKey : () => {});

  useEffect(() => {
    if (micMode) syncGuidedHint(hasMidi, true, micReady);
  }, [micMode, hasMidi, micReady, running, syncGuidedHint]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const engine = engineRef.current!;
      const dt = (now - last) / 1000;
      last = now;
      for (const n of engine.tick(dt)) {
        const dur = n.duration / engine.config.speed;
        playNote(n.midi, dur);
        if (engine.config.listenMode || engine.config.guidedMode) flashKey(n.midi, dur);
      }
      setTime(engine.time);
      if (interactive) syncExpected();
      if (guidedMode) syncGuidedHint(hasMidi, micMode, micReady);
      if (engine.attempted) setLiveScore(engine.score());
      if (engine.finished) {
        setRunning(false);
        const scored = (engine.config.guidedMode
          || engine.config.playAlongMode
          || (engine.config.waitMode && !engine.config.listenMode))
          && engine.attempted;
        if (scored) onExit(engine.score());
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, onExit, syncExpected, syncGuidedHint, flashKey, interactive, guidedMode, hasMidi, micMode, micReady]);

  const start = async () => {
    try {
      setAudioError(false);
      await initPiano();
      setRunning(true);
      if (micMode) showFeedback('Empezamos — escucha la primera nota');
    } catch {
      setAudioError(true);
      setRunning(true);
    }
  };

  const modeBadge = listenMode
    ? '🎧 Escuchar'
    : micMode
      ? '🎤 Micrófono'
      : guidedMode
        ? '🎧→🎹 Escuchar y tocar'
        : playAlongMode
          ? '🎹 Toca y corrígeme'
          : '🎹 Practicar';

  const micBanner = micMode ? (() => {
    if (mic.status === 'denied') return { text: '⚠ Necesitas permitir el micrófono en el navegador', color: '#e88080' };
    if (feedback) return { text: feedback, color: feedback.startsWith('✓') ? '#7dcea0' : '#e8a060' };
    if (!running) return { text: guidedHint ?? 'Pulsa ▶ Empezar — el navegador pedirá permiso de micrófono', color: '#b8bcc8' };
    if (guidedPhase === 'demo') return { text: guidedHint ?? 'Escucha la nota…', color: '#7fb4ff' };
    if (guidedPhase === 'repeat' && !micReady) return { text: guidedHint ?? 'Espera un momento…', color: '#e8c060' };
    if (guidedPhase === 'repeat' && mic.heardMidi !== null) {
      return {
        text: `${guidedHint ?? ''} — Escucho: ${midiToName(mic.heardMidi)}`,
        color: '#7dcea0',
      };
    }
    if (guidedPhase === 'repeat' && mic.status === 'hearing') {
      return {
        text: `${guidedHint ?? ''} — Oigo sonido pero no la nota; toca UNA nota clara y suelta`,
        color: '#e8c060',
      };
    }
    if (guidedPhase === 'repeat' && mic.status === 'quiet') {
      return {
        text: `${guidedHint ?? ''} — No escucho nada (señal ${mic.signalPct}%) — acerca el portátil al piano`,
        color: '#e8a060',
      };
    }
    if (guidedPhase === 'repeat') return { text: guidedHint ?? 'Toca la nota en tu piano', color: '#7dcea0' };
    return { text: guidedHint ?? 'Activando micrófono…', color: '#b8bcc8' };
  })() : null;

  const midiLabel = listenMode
    ? 'Modo escucha'
    : micMode
      ? (liveScore !== null ? `${liveScore}% aciertos` : '')
    : playAlongMode
      ? midiDevice === 'unsupported'
        ? 'Navegador sin MIDI — usa Chrome o Edge'
        : liveScore !== null
          ? `${liveScore}% bien${hasMidi ? ' · tu piano' : ' · pantalla'}`
          : hasMidi
            ? `Escuchando tu piano · ${midiDevice}`
            : 'Sin cable: toca en pantalla o A–L'
    : guidedMode
      ? midiDevice === 'unsupported'
        ? 'Navegador sin MIDI — usa Chrome o Edge'
        : hasMidi
          ? `${guidedHint ?? 'Piano conectado'} · ${midiDevice}`
          : (guidedHint ?? 'Sin cable: pantalla o teclas A–L')
      : audioError
        ? '⚠ Sin sonido (revisa conexión)'
        : midiDevice === 'unsupported'
          ? 'Sin MIDI'
          : midiDevice ?? 'Piano no conectado';

  const keyboardH = Math.max(90, Math.round(size.h * 0.22));
  const barH = 52;
  const micBannerH = micBanner ? 56 : 0;
  const fallH = Math.max(0, size.h - keyboardH - barH - micBannerH);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: barH, display: 'flex', gap: 8, alignItems: 'center', padding: '0 10px', flexWrap: 'nowrap', overflowX: 'auto' }}>
        <button onClick={() => onExit(null)}>← Salir</button>
        <button onClick={onChangeMode}>Cambiar modo</button>
        <strong style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</strong>
        <span style={{
          fontSize: 12,
          padding: '4px 8px',
          borderRadius: 6,
          background: listenMode ? '#2d4a6e'
            : micMode ? '#4a2d6e'
            : guidedMode ? '#5c4a2a'
            : playAlongMode ? '#1e4d32' : '#2d5e44',
          whiteSpace: 'nowrap',
        }}>
          {modeBadge}
        </span>
        <button onClick={running ? () => setRunning(false) : start}>
          {running ? '⏸ Pausa' : listenMode ? '▶ Escuchar' : '▶ Empezar'}
        </button>
        {!listenMode && !micMode && !guidedMode && !playAlongMode && (
          <label><input type="checkbox" checked={config.waitMode}
            onChange={e => setConfig(c => ({ ...c, waitMode: e.target.checked }))} /> Espera</label>
        )}
        {!listenMode && (
          <select value={config.hand}
            onChange={e => setConfig(c => ({ ...c, hand: e.target.value as EngineConfig['hand'] }))}>
            <option value="both">Ambas manos</option>
            <option value="right">Mano derecha</option>
            <option value="left">Mano izquierda</option>
          </select>
        )}
        <select value={level} onChange={e => setLevel(e.target.value as Level)}>
          {(Object.keys(LEVEL_LABELS) as Level[]).map(l =>
            <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
        </select>
        <select value={config.speed}
          onChange={e => setConfig(c => ({ ...c, speed: Number(e.target.value) }))}>
          <option value={0.25}>25%</option><option value={0.5}>50%</option>
          <option value={0.75}>75%</option><option value={1}>100%</option>
        </select>
        {liveScore !== null && (playAlongMode || micMode) && (
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: liveScore >= 80 ? '#7dcea0' : liveScore >= 50 ? '#e8c060' : '#e88080',
          }}>
            {liveScore}%
          </span>
        )}
        {midiLabel && (
          <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, whiteSpace: 'nowrap' }}>
            {midiLabel}
          </span>
        )}
      </div>
      {micBanner && (
        <div style={{
          height: micBannerH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          background: '#1a1525',
          borderBottom: '1px solid #3d3152',
          color: micBanner.color,
          fontSize: 15,
          fontWeight: 600,
          textAlign: 'center',
        }}>
          {micBanner.text}
        </div>
      )}
      <NoteFall notes={practicedNotes} currentTime={time}
        loMidi={loMidi} hiMidi={hiMidi} width={size.w} height={fallH} />
      <Keyboard loMidi={loMidi} hiMidi={hiMidi} width={size.w} height={keyboardH}
        pressed={pressed} expected={expected} wrong={wrong} onKey={handleScreenKey}
        interactive={screenInput && !micMode} />
    </div>
  );
}
