import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LibraryScreen from './screens/LibraryScreen';
import SongSetupScreen from './screens/SongSetupScreen';
import PracticeScreen from './screens/PracticeScreen';
import TheoryPathScreen from './screens/TheoryPathScreen';
import LessonScreen from './screens/LessonScreen';
import { createSongStore } from './storage/songStore';
import { createTheoryStore } from './storage/theoryStore';
import { LEVELS } from './core/theory/content';
import type { SessionConfig } from './core/sessionModes';
import type { Song } from './core/types';
import type { Lesson } from './core/theory/types';

interface PracticeSession {
  song: Song;
  config: SessionConfig;
}

export default function App() {
  const store = useMemo(() => createSongStore(), []);
  const [songs, setSongs] = useState<Song[]>([]);
  const [setupSong, setSetupSong] = useState<Song | null>(null);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const sessionRef = useRef<PracticeSession | null>(null);
  useEffect(() => { sessionRef.current = session; }, [session]);

  useEffect(() => {
    store.list().then(setSongs);
  }, [store]);

  const refresh = useCallback(() => store.list().then(setSongs), [store]);

  /** Guarda la puntuación al terminar la canción, sin salir de la pantalla. */
  const handleFinish = useCallback((score: number | null) => {
    const prev = sessionRef.current;
    if (score !== null && prev) {
      store.recordScore(prev.song.id, score).then(refresh);
    }
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

  const theoryStore = useMemo(() => createTheoryStore(), []);
  const [area, setArea] = useState<'home' | 'songs' | 'theory'>('home');
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [lesson, setLesson] = useState<{ levelId: string; lesson: Lesson } | null>(null);

  useEffect(() => { theoryStore.listCompleted().then(ids => setCompleted(new Set(ids))); }, [theoryStore]);
  const refreshTheory = useCallback(() => theoryStore.listCompleted().then(ids => setCompleted(new Set(ids))), [theoryStore]);

  const flatLessons = useMemo(() => LEVELS.flatMap(lv => lv.lessons.map(ls => ({ levelId: lv.id, lesson: ls }))), []);
  const nextOf = (lessonId: string) => {
    const idx = flatLessons.findIndex(x => x.lesson.id === lessonId);
    return idx >= 0 && idx + 1 < flatLessons.length ? flatLessons[idx + 1] : null;
  };

  if (session) {
    return (
      <PracticeScreen
        song={session.song}
        initialConfig={session.config}
        onFinish={handleFinish}
        onExit={handleExit}
        onChangeMode={() => setSession(null)}
      />
    );
  }
  if (setupSong) {
    return (
      <SongSetupScreen
        song={setupSong}
        onBack={() => setSetupSong(null)}
        onStart={config => setSession({ song: setupSong, config })}
      />
    );
  }
  if (lesson) {
    const nxt = nextOf(lesson.lesson.id);
    return (
      <LessonScreen
        lesson={lesson.lesson}
        hasNext={!!nxt}
        onCompleted={() => theoryStore.markCompleted(lesson.lesson.id).then(refreshTheory)}
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
        onOpen={setSetupSong}
        onBack={() => setArea('home')}
      />
    );
  }
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Piano Trainer</h1>
        <p style={{ color: 'var(--ink-3)', marginBottom: 22 }}>¿Qué quieres hacer hoy?</p>
        <button className="card" style={{ width: '100%', display: 'flex', gap: 14, alignItems: 'center', textAlign: 'left', marginBottom: 12 }}
          onClick={() => setArea('songs')}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--right-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🎵</div>
          <div><div style={{ fontWeight: 800, fontSize: 18 }}>Canciones</div><div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Aprende y practica tus canciones</div></div>
        </button>
        <button className="card" style={{ width: '100%', display: 'flex', gap: 14, alignItems: 'center', textAlign: 'left' }}
          onClick={() => setArea('theory')}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--listen-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📚</div>
          <div><div style={{ fontWeight: 800, fontSize: 18 }}>Teoría</div><div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Entiende el piano paso a paso</div></div>
        </button>
      </div>
    </div>
  );
}
