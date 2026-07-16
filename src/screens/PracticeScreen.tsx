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
import { simplifySong, type Level } from '../core/simplifySong';
import { resolveEngineMode, INPUT_LABELS, type SessionConfig } from '../core/sessionModes';
import CoachBar, { type CoachTone } from '../components/CoachBar';
import Countdown from '../components/Countdown';
import SettingsSheet from '../components/SettingsSheet';
import EndOverlay from '../components/EndOverlay';
import LoopBar from '../components/LoopBar';
import TimeBar from '../components/TimeBar';
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
  const [speed, setSpeedState] = useState(resolved.engine.speed);
  const speedRef = useRef(speed);
  const [appSound, setAppSound] = useState(initialConfig.appSound ?? true);
  const [loop, setLoopState] = useState<{ start: number; end: number } | null>(null);
  const loopRef = useRef(loop);
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
  const lastTimeRef = useRef(0);
  const songIdRef = useRef(song.id);

  const listenMode = !!config.listenMode;
  const guidedMode = !!config.guidedMode;
  const playAlongMode = !!config.playAlongMode;
  const freeMode = !!config.freeMode;
  const interactive = !listenMode;
  const effectiveSong = useMemo(() => simplifySong(song, level), [song, level]);

  useEffect(() => { document.title = song.title; }, [song.title]);

  const [loMidi, hiMidi] = useMemo(() => fitRange(effectiveSong.notes), [effectiveSong]);
  const practicedNotes = useMemo(
    () => listenMode || guidedMode || playAlongMode || freeMode || config.hand === 'both'
      ? effectiveSong.notes
      : effectiveSong.notes.filter(n => n.hand === config.hand),
    [effectiveSong, config.hand, listenMode, guidedMode, playAlongMode, freeMode],
  );

  const showFeedback = useCallback((msg: string, ms = 2000) => {
    setFeedback(msg);
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), ms);
  }, []);

  useEffect(() => {
    engineRef.current = new PracticeEngine(effectiveSong, config);
    engineRef.current.setSpeed(speedRef.current);
    if (loopRef.current) engineRef.current.setLoop(loopRef.current.start, loopRef.current.end);
    setTime(0);
    if (songIdRef.current === song.id && lastTimeRef.current > 0 && !micMode) {
      engineRef.current.seek(lastTimeRef.current);
      setTime(lastTimeRef.current);
    } else {
      lastTimeRef.current = 0;
    }
    songIdRef.current = song.id;
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

  // Velocidad viva: se aplica al motor sin recrearlo
  useEffect(() => {
    speedRef.current = speed;
    engineRef.current?.setSpeed(speed);
  }, [speed]);

  // Bucle: se aplica/limpia sin recrear el motor
  useEffect(() => {
    loopRef.current = loop;
    const engine = engineRef.current;
    if (!engine) return;
    if (loop) engine.setLoop(loop.start, loop.end);
    else engine.clearLoop();
  }, [loop]);

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
    if (down && running) {
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
  }, [syncExpected, interactive, showFeedback, running]);

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
      // tope: una pestaña en segundo plano acumula segundos y los soltaría de golpe
      const dt = Math.min((now - last) / 1000, 0.25);
      last = now;
      for (const n of engine.tick(dt)) {
        const dur = n.duration / engine.speed;
        if (!freeMode || appSound) playNote(n.midi, dur);
        if (engine.config.listenMode || engine.config.guidedMode || freeMode) flashKey(n.midi, dur);
      }
      if (engine.time < lastTimeRef.current - 0.5 && loopRef.current) showFeedback('🔁 Otra vez desde A', 1200);
      setTime(engine.time);
      lastTimeRef.current = engine.time;
      if (interactive) syncExpected();
      if (guidedMode) syncGuidedHint(hasMidi, micMode, micReady);
      if (engine.attempted) setLiveScore(engine.score());
      if (engine.finished) {
        setRunning(false);
        lastTimeRef.current = 0; // terminada: "Repetir" y cambios de ajustes deben partir de 0
        const scored = (engine.config.guidedMode
          || engine.config.playAlongMode
          || (engine.config.waitMode && !engine.config.listenMode && !engine.config.freeMode))
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
  }, [running, onFinish, syncExpected, syncGuidedHint, flashKey, interactive, guidedMode, hasMidi, micMode, micReady, freeMode, appSound, showFeedback]);

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
    const inputChip = micMode
      ? (mic.status === 'active' || mic.status === 'hearing' || mic.status === 'quiet' ? `🎤 señal ${mic.signalPct}%` : null)
      : listenMode ? '🎧 escuchando'
      : hasMidi ? `🎹 ${midiDevice}`
      : screenInput ? `👆 ${INPUT_LABELS.screen}` : null;
    const statsChip = streak > 1 ? `✓ ${streak} seguidas` : (liveScore !== null && (playAlongMode || micMode)) ? `${liveScore}%` : null;
    const chip = statsChip ?? inputChip;

    if (audioError) return { text: '⚠ Sin sonido (revisa conexión) — puedes practicar igualmente', tone: 'warn', chip };
    if (!running && !countingDown && time > 0 && !ended) return { text: '⏸ En pausa — pulsa ▶ para seguir', tone: 'info', chip: statsChip ?? chip };
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
    if (freeMode) return {
      text: running ? 'Modo libre — toca a tu aire 🎵' : 'Pulsa ▶ y sigue la cascada a tu ritmo',
      tone: 'info', chip,
    };
    if (!running) return { text: 'Pulsa ▶ Empezar cuando estés en posición', tone: 'info', chip };
    const names = [...expected].map(midiToName).join(' + ');
    if (names) return { text: `Toca: ${names} 👇`, tone: 'warn', chip };
    return { text: '¡Sigue así!', tone: 'ok', chip };
  })();

  const coachAction = micMode && guidedPhase === 'repeat'
    ? { label: 'Saltar →', onClick: () => { engineRef.current?.skipPending(); syncExpected(); syncGuidedHint(hasMidi, micMode, micReady); } }
    : (!micMode && !listenMode && !freeMode && running && expected.size > 0)
      ? { label: '🔊 ¿Cómo suena?', onClick: () => { [...expected].forEach((m, i) => window.setTimeout(() => playNote(m, 0.8), i * 300)); } }
      : null;

  const keyboardH = Math.max(90, Math.round(size.h * 0.22));
  const barH = 48;
  const coachH = 46;
  const loopH = loop ? 56 : 0;
  const fallH = Math.max(0, size.h - keyboardH - barH - coachH - loopH);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ height: barH, display: 'flex', gap: 10, alignItems: 'center', padding: '0 12px' }}>
        <button className="btn-ghost" style={{ fontSize: 18, flexShrink: 0 }}
          onClick={() => { if (time > 0 && !ended && !confirm('¿Salir? Perderás la posición actual.')) return; onExit(); }}>✕</button>
        <TimeBar time={time} duration={effectiveSong.duration} seekable={!micMode}
          onSeek={t => { engineRef.current?.seek(t); setTime(t); lastTimeRef.current = t; }} />
        {!micMode && (
          <button className="btn-ghost" style={{ fontSize: 16, flexShrink: 0, whiteSpace: 'nowrap' }}
            onClick={() => {
              if (loop) { setLoopState(null); return; }
              const engine = engineRef.current;
              const dur = effectiveSong.duration;
              const a = Math.min(engine?.time ?? 0, Math.max(0, dur - 1));
              const b = Math.min(dur, a + 8);
              setLoopState({ start: a, end: b });
            }}>
            {loop ? '🔁✓' : '🔁 Bucle'}
          </button>
        )}
        <button className="btn-ghost" onClick={() => setShowSettings(true)} style={{ fontSize: 18, flexShrink: 0 }}>⚙</button>
        <button className="btn-primary" style={{ minHeight: 36, padding: '6px 14px', flexShrink: 0 }}
          onClick={running ? () => setRunning(false) : start} disabled={countingDown}>
          {running ? '⏸' : '▶'}
        </button>
      </div>

      <CoachBar text={coach.text} tone={coach.tone} chip={coach.chip} action={coachAction} />

      {loop && (
        <LoopBar
          duration={effectiveSong.duration}
          start={loop.start} end={loop.end} currentTime={time}
          onChange={(s, e2) => setLoopState({ start: Math.max(0, s), end: Math.min(effectiveSong.duration, e2) })}
          onSetAHere={() => setLoopState(l => l && { start: Math.min(time, l.end - 1), end: l.end })}
          onSetBHere={() => setLoopState(l => l && { start: l.start, end: Math.max(time, l.start + 1) })}
          onClear={() => setLoopState(null)}
        />
      )}

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
          level={level} speed={speed} hand={config.hand} waitMode={config.waitMode}
          showWaitMode={initialConfig.door === 'learn' && !micMode}
          showHand={!listenMode && !freeMode}
          appSound={freeMode ? appSound : null}
          onAppSound={setAppSound}
          onChange={patch => {
            if (patch.level !== undefined) setLevel(patch.level);
            if (patch.speed !== undefined) setSpeedState(patch.speed);
            if (patch.hand !== undefined) setConfig(c => ({ ...c, hand: patch.hand! }));
            if (patch.waitMode !== undefined) setConfig(c => ({ ...c, waitMode: patch.waitMode! }));
          }}
          onClose={() => setShowSettings(false)}
          onRestart={() => { engineRef.current?.seek(0); setTime(0); lastTimeRef.current = 0; setStreak(0); setMaxStreak(0); setShowSettings(false); }}
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
