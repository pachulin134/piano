import { useRef, useState } from 'react';
import { parseMidi } from '../core/parseMidi';
import type { Song } from '../core/types';

interface Props {
  songs: Song[];
  onAdd: (song: Song, midi: ArrayBuffer) => void | Promise<void>;
  onRemove: (id: string) => void;
  onOpen: (song: Song) => void;
  onBack?: () => void;
}

const SONG_ICONS = ['🎵', '🎼', '🎹', '🎶', '🎷', '🌙', '⭐', '🎺'];
const ICON_BGS = ['#ffe9c7', '#dcedde', '#dbe9f7', '#f3e3f5', '#fde2d9', '#e6f0d8', '#e3e9f8', '#fbe8c8'];

function songIcon(id: string): { icon: string; bg: string } {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { icon: SONG_ICONS[h % SONG_ICONS.length], bg: ICON_BGS[h % ICON_BGS.length] };
}

export default function LibraryScreen({ songs, onAdd, onRemove, onOpen, onBack }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

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
      style={{ height: '100%', overflowY: 'auto', padding: '20px 16px' }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); importFiles(e.dataTransfer.files); }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <header style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {onBack && <button className="btn-ghost" onClick={onBack} style={{ fontSize: 18 }}>←</button>}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800 }}>¡Hola! 👋</h1>
              <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>
                {songs.length === 0 ? 'Tu biblioteca está vacía' : `${songs.length} ${songs.length === 1 ? 'canción' : 'canciones'} para practicar`}
              </p>
            </div>
            <button className="btn-primary" onClick={() => fileRef.current?.click()}>+ Añadir .mid</button>
            <input ref={fileRef} type="file" accept=".mid,.midi" multiple hidden
              onChange={e => { importFiles(e.target.files); e.target.value = ''; }} />
          </div>
        </header>

        {error && <div className="coach coach-err" style={{ marginBottom: 12 }}>⚠ {error}</div>}

        {dragging && (
          <div className="coach coach-warn" style={{ marginBottom: 12 }}>Suelta aquí tu archivo .mid 👇</div>
        )}

        {songs.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48 }}>🎹</div>
            <p style={{ fontWeight: 700, margin: '10px 0 4px' }}>Añade tu primera canción</p>
            <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Arrastra un archivo .mid a esta ventana o pulsa "+ Añadir".</p>
          </div>
        )}

        {([
          { key: 'claude', title: '✨ Creadas para ti', match: (s: Song) => s.id.startsWith('claude:') },
          { key: 'builtin', title: '🎁 Incluidas', match: (s: Song) => s.id.startsWith('builtin:') },
          { key: 'user', title: '📁 Tus canciones', match: (s: Song) => !s.id.startsWith('claude:') && !s.id.startsWith('builtin:') },
        ]).map(group => {
          const inGroup = songs.filter(group.match);
          if (inGroup.length === 0) return null;
          return (
            <section key={group.key} style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-2)', margin: '0 0 8px 2px', letterSpacing: 0.5 }}>
                {group.title}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {inGroup.map(s => {
            const { icon, bg } = songIcon(s.id);
            const pct = s.bestScore ?? 0;
            return (
              <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 14, background: bg, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>
                  {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                  <div style={{ color: 'var(--ink-3)', fontSize: 12, margin: '2px 0 6px' }}>
                    {'★'.repeat(s.difficulty)}{'☆'.repeat(5 - s.difficulty)} · {Math.round(s.duration)}s
                    {s.bestScore !== null && ` · mejor: ${s.bestScore}%`}
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-chip)', borderRadius: 3 }}>
                    <div style={{
                      width: `${pct}%`, height: 6, borderRadius: 3,
                      background: pct >= 80 ? 'linear-gradient(90deg, #7bc47f, #4a9e50)' : 'linear-gradient(90deg, #f5a623, #e8734a)',
                    }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button className="btn-primary" onClick={() => onOpen(s)} style={{ padding: '8px 14px' }}>Aprender</button>
                  {group.key === 'user' && (
                    <button className="btn-ghost" onClick={() => { if (confirm(`¿Borrar "${s.title}"?`)) onRemove(s.id); }}>🗑</button>
                  )}
                </div>
              </div>
            );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
