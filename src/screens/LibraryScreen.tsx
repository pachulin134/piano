import { useRef, useState } from 'react';
import { parseMidi } from '../core/parseMidi';
import type { Song } from '../core/types';

interface Props {
  songs: Song[];
  onAdd: (song: Song, midi: ArrayBuffer) => void | Promise<void>;
  onRemove: (id: string) => void;
  onOpen: (song: Song) => void;
}

export default function LibraryScreen({ songs, onAdd, onRemove, onOpen }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function importFiles(files: FileList | null) {
    setError(null);
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        // await: los add van en serie; en paralelo cada add hace leer-y-escribir
        // sobre la misma clave y el último pisaría a los demás (se perderían canciones).
        const buf = await file.arrayBuffer();
        await onAdd(parseMidi(buf, file.name.replace(/\.midi?$/i, '')), buf);
      } catch (e) {
        setError(`${file.name}: ${e instanceof Error ? e.message : 'error desconocido'}`);
      }
    }
  }

  return (
    <div
      style={{ height: '100%', overflowY: 'auto', padding: 16 }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); importFiles(e.dataTransfer.files); }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={{ flex: 1, fontSize: 22 }}>🎹 Mis canciones</h1>
        <button onClick={() => fileRef.current?.click()}>+ Añadir .mid</button>
        <input ref={fileRef} type="file" accept=".mid,.midi" multiple hidden
          onChange={e => { importFiles(e.target.files); e.target.value = ''; }} />
      </header>
      {error && <p style={{ color: '#ff8a8a', marginBottom: 12 }}>⚠ {error}</p>}
      {songs.length === 0 && <p>Arrastra un archivo .mid aquí o pulsa "+ Añadir".</p>}
      {songs.map(s => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 8, background: '#1d2029', borderRadius: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
            <small>
              {Math.round(s.duration)}s · {'★'.repeat(s.difficulty)}{'☆'.repeat(5 - s.difficulty)}
              {s.bestScore !== null && ` · mejor: ${s.bestScore}%`}
            </small>
          </div>
          <button onClick={() => onOpen(s)}>Aprender</button>
          {!s.id.startsWith('builtin:') && (
            <button onClick={() => { if (confirm(`¿Borrar "${s.title}"?`)) onRemove(s.id); }}>🗑</button>
          )}
        </div>
      ))}
    </div>
  );
}
