import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Keyboard from '../components/Keyboard';
import NoteFall from '../components/NoteFall';
import { PracticeEngine, type EngineConfig } from '../core/practiceEngine';
import { fitRange } from '../core/keyLayout';
import { initPiano, playNote } from '../audio/piano';
import { matchExpected, midiToName, nearestExpected } from '../audio/pitchDetect';
import { useMidiInput } from '../input/useMidiInput';
import { useMicPitch } from '../input/useMicPitch';
import { useComputerKeys } from '../input/useComputerKeys';
import type { GuidedPhase } from '../core/practiceEngine';
import { simplifySong, LEVEL_LABELS, type Level } from '../core/simplifySong';
import { resolveEngineMode, INPUT_LABELS, type SessionConfig } from '../core/sessionModes';
import CoachBar, { type CoachTone } from '../components/CoachBar';
import Countdown from '../components/Countdown';
import SettingsSheet from '../components/SettingsSheet';
import EndOverlay from '../components/EndOverlay';
import type { Song } from '../core/types';

interface Props {
  song: Song;
  initialConfig: SessionConfig;
  onFinish: (score: number | null) => void; // guarda récord sin salir
  onExit: () => void;
  onChangeMode: () => void;
}

export default function PracticeScreen({ song, initialConfig, onFinish, onExit, onChangeMode }: Props) {
  const resolved = useMemo(() => resolveEngineMode(initialConfig), [initialConfig]);
  const [config, setConfig] = useState<EngineConfig>(resolved.engine);
  const micMode = resolved.micMode;
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
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [countingDown, setCountingDown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [ended, setEnded] = useState<null | { score: number | null }>(null);
  const engineRef = useRef<PracticeEngine | undefined>(undefined);
  const feedbackTimer = useRef<number | undefined>(undefined);

  const listenMode = !!config.listenMode;
  const guidedMode = !!config.guidedMode;
  const playAlongMode = !!config.playAlongMode;
  const wantsPiano = playAlongMode;
  const interactive = !listenMode;
  const effectiveSong = useMemo(() => simplifySong(song, level), [song, level]);

  useEffect(() => { document.title = song.title; }, [song.title]);

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
    setStreak(0);
    setMaxStreak(0);
    setEnded(null);
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
        setStreak(s => { const n = s + 1; setMaxStreak(m => Math.max(m, n)); return n; });
      } else if (result === 'wrong') {
        setWrong(prev => new Set(prev).add(midi));
        showFeedback('✗ Esa nota no es — inténtalo otra vez');
        setStreak(0);
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
  const screenInput = interactive && !micMode && (initialConfig.input === 'screen' || !hasMidi);

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

    // Coincidencia exacta o de clase de nota (los detectores confunden octavas
    // con el piano); tocar una tecla equivocada cercana ya NO cuenta como bien.
    const match = matchExpected(midi, expected);
    if (match !== null) {
      setPressed(prev => new Set(prev).add(match));
      const result = engine.onKeyDown(match);
      if (result === 'correct') {
        showFeedback(`✓ ¡Bien! Era ${midiToName(match)}`);
        setStreak(s => { const n = s + 1; setMaxStreak(m => Math.max(m, n)); return n; });
        window.setTimeout(() => setPressed(prev => {
          const next = new Set(prev); next.delete(match); return next;
        }), 300);
      } else if (result === 'wrong') {
        setWrong(prev => new Set(prev).add(match));
        showFeedback('✗ Casi — esa no era la nota');
        setStreak(0);
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
        const score = scored ? engine.score() : null;
        setEnded({ score });
        onFinish(score);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, onFinish, syncExpected, syncGuidedHint, flashKey, interactive, guidedMode, hasMidi, micMode, micReady]);

  const start = async () => {
    try {
      setAudioError(false);
      await initPiano();
    } catch {
      setAudioError(true);
    }
    setCountingDown(true); // con o sin sonido, se puede practicar
  };
  const beginAfterCountdown = useCallback(() => {
    setCountingDown(false);
    setRunning(true);
    if (micMode) showFeedback('Empezamos — escucha la primera nota');
  }, [micMode, showFeedback]);

  const coach: { text: string; tone: CoachTone; chip: string | null } = (() => {
    const chip = micMode
      ? (mic.status === 'active' || mic.status === 'hearing' || mic.status === 'quiet' ? `🎤 señal ${mic.signalPct}%` : null)
      : listenMode ? '🎧 escuchando'
      : hasMidi ? `🎹 ${midiDevice}`
      : screenInput ? `👆 ${INPUT_LABELS.screen}` : null;

    if (audioError) return { text: '⚠ Sin sonido (revisa conexión) — puedes practicar igualmente', tone: 'warn', chip };
    if (micMode) {
      if (mic.status === 'denied') return { text: 'Necesitas permitir el micrófono en el navegador', tone: 'err', chip };
      if (feedback) return { text: feedback, tone: feedback.startsWith('✓') ? 'ok' : 'err', chip };
      if (!running) return { text: guidedHint ?? 'Pulsa ▶ Empezar — el navegador pedirá permiso de micrófono', tone: 'info', chip };
      if (guidedPhase === 'demo') return { text: guidedHint ?? 'Escucha la nota… 🎧', tone: 'info', chip };
      if (guidedPhase === 'repeat' && !micReady) return { text: guidedHint ?? 'Un momento…', tone: 'warn', chip };
      if (guidedPhase === 'repeat' && mic.heardMidi !== null)
        return { text: `${guidedHint ?? ''} — escucho: ${midiToName(mic.heardMidi)}`, tone: 'ok', chip };
      if (guidedPhase === 'repeat' && mic.status === 'hearing')
        return { text: 'Oigo sonido pero no la nota — toca UNA nota clara y suelta', tone: 'warn', chip };
      if (guidedPhase === 'repeat' && mic.status === 'quiet')
        return { text: 'No escucho nada — acerca el portátil al piano', tone: 'warn', chip };
      return { text: guidedHint ?? '¡Te toca! 🎹', tone: 'ok', chip };
    }
    if (feedback) return { text: feedback, tone: feedback.startsWith('✓') ? 'ok' : 'err', chip };
    if (listenMode) return { text: running ? 'Disfruta — fíjate en los colores de cada mano' : 'Pulsa ▶ para escuchar la canción', tone: 'info', chip };
    if (!running) return { text: 'Pulsa ▶ Empezar cuando estés en posición', tone: 'info', chip };
    const names = [...expected].map(midiToName).join(' + ');
    if (names) return { text: `Toca: ${names} 👇`, tone: 'warn', chip };
    return { text: '¡Sigue así!', tone: 'ok', chip };
  })();

  const keyboardH = Math.max(90, Math.round(size.h * 0.22));
  const barH = 48;
  const coachH = 46;
  const fallH = Math.max(0, size.h - keyboardH - barH - coachH);
  const progressPct = effectiveSong.duration > 0 ? Math.min(100, (time / effectiveSong.duration) * 100) : 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ height: barH, display: 'flex', gap: 10, alignItems: 'center', padding: '0 12px' }}>
        <button className="btn-ghost" onClick={onExit} style={{ fontSize: 18 }}>✕</button>
        <div style={{ flex: 1, height: 8, background: 'var(--bg-chip)', borderRadius: 4 }}>
          <div style={{ width: `${progressPct}%`, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, var(--right-soft), var(--right))' }} />
        </div>
        {streak > 1 && <span className="chip" style={{ color: 'var(--left)', fontWeight: 800 }}>✓ {streak} seguidas</span>}
        {liveScore !== null && (playAlongMode || micMode) && (
          <span className="chip" style={{ fontWeight: 800 }}>{liveScore}%</span>
        )}
        <button className="btn-ghost" onClick={() => setShowSettings(true)} style={{ fontSize: 18 }}>⚙</button>
        <button className="btn-primary" style={{ minHeight: 36, padding: '6px 14px' }}
          onClick={running ? () => setRunning(false) : start} disabled={countingDown}>
          {running ? '⏸' : '▶'}
        </button>
      </div>

      <CoachBar text={coach.text} tone={coach.tone} chip={coach.chip} />

      <div style={{ position: 'relative' }}>
        <NoteFall notes={practicedNotes} currentTime={time}
          loMidi={loMidi} hiMidi={hiMidi} width={size.w} height={fallH} />
        {countingDown && <Countdown onDone={beginAfterCountdown} />}
      </div>
      <Keyboard loMidi={loMidi} hiMidi={hiMidi} width={size.w} height={keyboardH}
        pressed={pressed} expected={expected} wrong={wrong} onKey={handleScreenKey}
        interactive={screenInput && !micMode} />

      {showSettings && (
        <SettingsSheet
          level={level} speed={config.speed} hand={config.hand} waitMode={config.waitMode}
          showWaitMode={initialConfig.door === 'learn' && !micMode}
          showHand={!listenMode}
          onChange={patch => {
            if (patch.level !== undefined) setLevel(patch.level);
            if (patch.speed !== undefined) setConfig(c => ({ ...c, speed: patch.speed! }));
            if (patch.hand !== undefined) setConfig(c => ({ ...c, hand: patch.hand! }));
            if (patch.waitMode !== undefined) setConfig(c => ({ ...c, waitMode: patch.waitMode! }));
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {ended && (
        <EndOverlay
          score={ended.score}
          maxStreak={maxStreak}
          isRecord={ended.score !== null && ended.score > (song.bestScore ?? -1)}
          onRepeat={() => { setConfig(c => ({ ...c })); void start(); }}
          onChangeMode={onChangeMode}
          onLibrary={onExit}
        />
      )}
    </div>
  );
}
