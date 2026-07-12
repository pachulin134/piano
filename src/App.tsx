import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LibraryScreen from './screens/LibraryScreen';
import SongSetupScreen, { type SessionConfig } from './screens/SongSetupScreen';
import PracticeScreen from './screens/PracticeScreen';
import { createSongStore } from './storage/songStore';
import type { Song } from './core/types';

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

  const handleExit = useCallback((score: number | null) => {
    const prev = sessionRef.current;
    if (score !== null && prev) {
      store.recordScore(prev.song.id, score).then(refresh);
    }
    setSession(null);
    setSetupSong(null);
  }, [store, refresh]);

  const handleAdd = useCallback(async (s: Song, midi: ArrayBuffer) => {
    await store.add(s, midi);
    refresh();
  }, [store, refresh]);
  const handleRemove = useCallback(async (id: string) => { await store.remove(id); refresh(); }, [store, refresh]);

  if (session) {
    return (
      <PracticeScreen
        song={session.song}
        initialConfig={session.config}
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
  return (
    <LibraryScreen
      songs={songs}
      onAdd={handleAdd}
      onRemove={handleRemove}
      onOpen={setSetupSong}
    />
  );
}
