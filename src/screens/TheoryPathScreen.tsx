import { LEVELS } from '../core/theory/content';
import { isLevelUnlocked, isLessonUnlocked, levelProgress } from '../core/theory/progress';
import type { Lesson } from '../core/theory/types';

interface Props {
  completed: Set<string>;
  onOpen: (levelId: string, lesson: Lesson) => void;
  onExit: () => void;
}

export default function TheoryPathScreen({ completed, onOpen, onExit }: Props) {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 16px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <button className="btn-ghost" onClick={onExit} style={{ fontSize: 18 }}>←</button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>📚 Teoría</h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Aprende paso a paso, tocando</p>
          </div>
        </header>

        {LEVELS.map(lv => {
          const unlockedLevel = isLevelUnlocked(LEVELS, completed, lv.id);
          const { done, total } = levelProgress(lv, completed);
          return (
            <div key={lv.id} className="card" style={{ marginBottom: 14, opacity: unlockedLevel ? 1 : 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ fontWeight: 800, flex: 1 }}>
                  {unlockedLevel ? '' : '🔒 '}Nivel {lv.index} · {lv.title}
                </div>
                <span className="chip">{done}/{total}</span>
              </div>
              <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 10 }}>{lv.subtitle}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {lv.lessons.map(ls => {
                  const isDone = completed.has(ls.id);
                  const unlocked = isLessonUnlocked(LEVELS, completed, lv.id, ls.id);
                  return (
                    <button key={ls.id}
                      className="chip"
                      style={{
                        cursor: unlocked ? 'pointer' : 'default',
                        border: isDone ? '1px solid var(--left)' : '1px solid var(--border)',
                        background: isDone ? 'var(--left-pale)' : 'var(--bg-chip)',
                        opacity: unlocked ? 1 : 0.5,
                      }}
                      disabled={!unlocked}
                      onClick={() => unlocked && onOpen(lv.id, ls)}>
                      {isDone ? '✓ ' : unlocked ? '' : '🔒 '}{ls.title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="card" style={{ opacity: 0.7, textAlign: 'center' }}>🚧 Más niveles en camino…</div>
      </div>
    </div>
  );
}
