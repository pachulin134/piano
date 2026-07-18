import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LibraryScreen from './screens/LibraryScreen';
import SongSetupScreen from './screens/SongSetupScreen';
import PracticeScreen from './screens/PracticeScreen';
import TheoryPathScreen from './screens/TheoryPathScreen';
import LessonScreen from './screens/LessonScreen';
import { createSongStore } from './storage/songStore';
import { createTheoryStore } from './storage/theoryStore';
import { createPrefsStore } from './storage/prefsStore';
import { LEVELS } from './core/theory/content';
import { computeStreak } from './core/streak';
import { setVolume } from './audio/piano';
import type { SessionConfig } from './core/sessionModes';
import type { Song } from './core/types';
import type { Lesson } from './core/theory/types';

const todayISO = () => new Date().toISOString().slice(0, 10);

interface PracticeSession {
  song: Song;
  config: SessionConfig;
}

export default function App() {
  const store = useMemo(() => createSongStore(), []);
  const prefs = useMemo(() => createPrefsStore(), []);
  const [songs, setSongs] = useState<Song[]>([]);
  const [setupSong, setSetupSong] = useState<Song | null>(null);
  const [setupInitial, setSetupInitial] = useState<SessionConfig | null>(null);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [lastSession, setLastSession] = useState<{ songId: string; config: SessionConfig } | null>(null);
  const sessionRef = useRef<PracticeSession | null>(null);
  useEffect(() => { sessionRef.current = session; }, [session]);

  // Volumen global (no por canción): se aplica al montar y en cada cambio.
  const [volume, setVolumeState] = useState(80);
  useEffect(() => { setVolume(volume); }, [volume]);

  // Racha diaria de práctica.
  const [streak, setStreak] = useState(0);
  const refreshStreak = useCallback(() => {
    prefs.listPracticeDays().then(days => setStreak(computeStreak(days, todayISO())));
  }, [prefs]);
  useEffect(() => { refreshStreak(); }, [refreshStreak]);
  const recordToday = useCallback(() => {
    prefs.recordPracticeDay(todayISO()).then(refreshStreak);
  }, [prefs, refreshStreak]);

  useEffect(() => {
    store.list().then(setSongs);
  }, [store]);

  useEffect(() => { prefs.getLastSession().then(setLastSession); }, [prefs]);

  const openSong = useCallback((s: Song) => {
    prefs.getSongPrefs(s.id).then(cfg => { setSetupInitial(cfg); setSetupSong(s); });
  }, [prefs]);

  const refresh = useCallback(() => store.list().then(setSongs), [store]);

  /** Guarda la puntuación al terminar la canción, sin salir de la pantalla. */
  /** Ajustes cambiados en vivo (⚙): la sesión y la memoria por canción se actualizan. */
  const handleConfigChange = useCallback((config: SessionConfig) => {
    const prev = sessionRef.current;
    if (!prev) return;
    setSession(s => (s ? { ...s, config } : s));
    prefs.saveSongPrefs(prev.song.id, config);
    prefs.saveLastSession(prev.song.id, config);
    setLastSession({ songId: prev.song.id, config });
  }, [prefs]);

  const handleFinish = useCallback((score: number | null) => {
    const prev = sessionRef.current;
    if (score !== null && prev) {
      store.recordScore(prev.song.id, score).then(refresh);
    }
  }, [store, refresh]);

  /** % recorrido en modos sin puntuación (biblioteca lo muestra como barra azul). */
  const handleProgress = useCallback((pct: number) => {
    const prev = sessionRef.current;
    if (!prev) return;
    store.recordPlayed(prev.song.id, pct).then(refresh);
  }, [store, refresh]);

  const handleExit = useCallback(() => {
    setSession(null);
    setSetupSong(null);
  }, []);

  const handleAdd = useCallback(async (s: Song, midi: ArrayBuffer) => {
    await store.add(s, midi);
    refresh();
  }, [store, refresh]);
  const handleRemove = useCallback(async (id: string) => { await store.remove(id); refresh(); }, [store, refresh]);
  const handleRename = useCallback(async (id: string, title: string) => { await store.rename(id, title); refresh(); }, [store, refresh]);

  const theoryStore = useMemo(() => createTheoryStore(), []);
  const [area, setArea] = useState<'home' | 'songs' | 'theory'>('home');
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [lesson, setLesson] = useState<{ levelId: string; lesson: Lesson } | null>(null);

  useEffect(() => { theoryStore.listCompleted().then(ids => setCompleted(new Set(ids))); }, [theoryStore]);
  const refreshTheory = useCallback(() => theoryStore.listCompleted().then(ids => setCompleted(new Set(ids))), [theoryStore]);

  const flatLessons = useMemo(() => LEVELS.flatMap(lv => lv.lessons.map(ls => ({ levelId: lv.id, lesson: ls }))), []);
  const totalLessons = useMemo(() => LEVELS.reduce((a, l) => a + l.lessons.length, 0), []);
  const withScore = songs.filter(s => s.bestScore !== null).length;
  const nextOf = (lessonId: string) => {
    const idx = flatLessons.findIndex(x => x.lesson.id === lessonId);
    return idx >= 0 && idx + 1 < flatLessons.length ? flatLessons[idx + 1] : null;
  };

  /** Canción sugerida para el puente Teoría→Canciones: la más fácil sin récord;
   *  si todas tienen récord, la más fácil de todas. Null si la biblioteca está vacía. */
  const suggestSong = useCallback((): Song | null => {
    if (songs.length === 0) return null;
    const withoutScore = songs.filter(s => s.bestScore === null);
    const pool = withoutScore.length > 0 ? withoutScore : songs;
    return pool.reduce((best, s) => (s.difficulty < best.difficulty ? s : best), pool[0]);
  }, [songs]);

  const goPracticeSuggestion = useCallback(() => {
    const s = suggestSong();
    if (!s) return;
    // Navegación diferida hasta tener las prefs: evita el parpadeo de la
    // biblioteca entre la lección y el setup de la canción sugerida.
    prefs.getSongPrefs(s.id).then(cfg => {
      setSetupInitial(cfg);
      setSetupSong(s);
      setLesson(null);
      setArea('songs');
    });
  }, [suggestSong, prefs]);

  if (session) {
    return (
      <PracticeScreen
        song={session.song}
        initialConfig={session.config}
        onFinish={handleFinish}
        onConfigChange={handleConfigChange}
        onProgress={handleProgress}
        volume={volume}
        onVolume={setVolumeState}
        onExit={handleExit}
        onChangeMode={() => { setSetupInitial(session.config); setSession(null); }}
      />
    );
  }
  if (setupSong) {
    return (
      <SongSetupScreen
        song={setupSong}
        onBack={() => setSetupSong(null)}
        initialValues={setupInitial}
        theoryHint={!LEVELS[0].lessons.every(ls => completed.has(ls.id))}
        onGoTheory={() => { setSetupSong(null); setArea('theory'); }}
        onStart={config => {
          prefs.saveSongPrefs(setupSong.id, config);
          prefs.saveLastSession(setupSong.id, config);
          setLastSession({ songId: setupSong.id, config });
          recordToday();
          setSession({ song: setupSong, config });
        }}
      />
    );
  }
  if (lesson) {
    const nxt = nextOf(lesson.lesson.id);
    const lvl = LEVELS.find(l => l.id === lesson.levelId);
    const isLastOfLevel = !!lvl && lvl.lessons[lvl.lessons.length - 1].id === lesson.lesson.id;
    return (
      <LessonScreen
        lesson={lesson.lesson}
        hasNext={!!nxt}
        isPathEnd={!nxt}
        onPracticeSong={isLastOfLevel && songs.length > 0 ? goPracticeSuggestion : undefined}
        onCompleted={() => { theoryStore.markCompleted(lesson.lesson.id).then(refreshTheory); recordToday(); }}
        onNextLesson={() => { if (nxt) setLesson(nxt); }}
        onExit={() => setLesson(null)}
      />
    );
  }
  if (area === 'theory') {
    return (
      <TheoryPathScreen
        completed={completed}
        onOpen={(levelId, ls) => setLesson({ levelId, lesson: ls })}
        onExit={() => setArea('home')}
      />
    );
  }
  if (area === 'songs') {
    return (
      <LibraryScreen
        songs={songs}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onRename={handleRename}
        onOpen={openSong}
        onBack={() => setArea('home')}
      />
    );
  }
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Piano Trainer</h1>
          {streak >= 2 && <span className="chip">🔥 Racha: {streak} días</span>}
        </div>
        <p style={{ color: 'var(--ink-3)', marginBottom: 22 }}>¿Qué quieres hacer hoy?</p>
        {lastSession && (() => {
          const s = songs.find(x => x.id === lastSession.songId);
          if (!s) return null;
          return (
            <button className="card" style={{ width: '100%', display: 'flex', gap: 14, alignItems: 'center', textAlign: 'left', marginBottom: 12, border: '2px solid var(--right-soft)' }}
              onClick={() => { recordToday(); setSession({ song: s, config: lastSession.config }); }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--right-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>▶</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Seguir con {s.title}</div>
                <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Como la última vez — directo a tocar</div>
              </div>
            </button>
          );
        })()}
        <button className="card" style={{ width: '100%', display: 'flex', gap: 14, alignItems: 'center', textAlign: 'left', marginBottom: 12 }}
          onClick={() => setArea('songs')}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--right-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🎵</div>
          <div><div style={{ fontWeight: 800, fontSize: 18 }}>Canciones</div><div style={{ color: 'var(--ink-3)', fontSize: 13 }}>{songs.length} canciones · {withScore} con récord</div></div>
        </button>
        <button className="card" style={{ width: '100%', display: 'flex', gap: 14, alignItems: 'center', textAlign: 'left' }}
          onClick={() => setArea('theory')}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--listen-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📚</div>
          <div><div style={{ fontWeight: 800, fontSize: 18 }}>Teoría</div><div style={{ color: 'var(--ink-3)', fontSize: 13 }}>{completed.size >= totalLessons ? '¡Teoría básica completada! 🏆' : `${completed.size}/${totalLessons} lecciones completadas`}</div></div>
        </button>
      </div>
    </div>
  );
}
