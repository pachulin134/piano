import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LibraryScreen from './screens/LibraryScreen';
import PracticeScreen from './screens/PracticeScreen';
import { createSongStore } from './storage/songStore';
import { parseMidi } from './core/parseMidi';
import type { Song } from './core/types';

export default function App() {
  const store = useMemo(() => createSongStore(), []);
  const [songs, setSongs] = useState<Song[]>([]);
  const [current, setCurrent] = useState<Song | null>(null);
  const currentRef = useRef<Song | null>(null);
  useEffect(() => { currentRef.current = current; }, [current]);

  const seededRef = useRef(false);
  useEffect(() => {
    (async () => {
      if (seededRef.current) return;
      seededRef.current = true;
      let list = await store.list();
      if (list.length === 0) {
        try {
          const index: { file: string; title: string }[] =
            await (await fetch('songs/index.json')).json();
          for (const item of index) {
            const buf = await (await fetch(`songs/${item.file}`)).arrayBuffer();
            await store.add(parseMidi(buf, item.title));
          }
          list = await store.list();
        } catch { /* sin conexión o sin archivos: biblioteca vacía y ya */ }
      }
      setSongs(list);
    })();
  }, [store]);

  const refresh = useCallback(() => store.list().then(setSongs), [store]);

  // Nota: leemos la canción actual desde una ref (no desde el updater de setCurrent)
  // para mantener handleExit con identidad estable sin depender de `current` y sin
  // colar un efecto secundario (recordScore) dentro del updater de setState: con
  // React.StrictMode (activo en main.tsx) los updaters se invocan dos veces en
  // desarrollo, lo que duplicaría la escritura si el efecto viviera ahí.
  const handleExit = useCallback((score: number | null) => {
    const prev = currentRef.current;
    if (score !== null && prev) {
      store.recordScore(prev.id, score).then(refresh);
    }
    setCurrent(null);
  }, [store, refresh]);

  const handleAdd = useCallback(async (s: Song) => { await store.add(s); refresh(); }, [store, refresh]);
  const handleRemove = useCallback(async (id: string) => { await store.remove(id); refresh(); }, [store, refresh]);

  if (current) {
    return <PracticeScreen song={current} onExit={handleExit} />;
  }
  return (
    <LibraryScreen
      songs={songs}
      onAdd={handleAdd}
      onRemove={handleRemove}
      onOpen={setCurrent}
    />
  );
}
