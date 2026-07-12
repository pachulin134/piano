# Niveles de dificultad — Plan (Fase 2a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Selector Fácil/Medio/Original en la pantalla de práctica que simplifica al vuelo cualquier canción.

**Architecture:** Función pura `simplifySong` en `src/core` (TDD) + estado `level` en `PracticeScreen` que alimenta un `effectiveSong` memoizado; el motor, la cascada y el rango del teclado consumen `effectiveSong`.

**Spec:** `docs/superpowers/specs/2026-07-12-niveles-dificultad-design.md`

---

### Task A: `src/core/simplifySong.ts` (TDD)

**Files:** Create `src/core/simplifySong.ts`; Test `src/core/simplifySong.test.ts`

- [ ] Test primero (FAIL → implementar → PASS):

```ts
import { describe, it, expect } from 'vitest';
import { simplifySong } from './simplifySong';
import type { Song, SongNote } from './types';

const n = (midi: number, time: number, hand: SongNote['hand']): SongNote =>
  ({ midi, time, duration: 0.4, hand });

function song(notes: SongNote[]): Song {
  return { id: 's', title: 's', notes, duration: 2, difficulty: 3, bestScore: null };
}

describe('simplifySong', () => {
  const base = song([
    n(60, 0, 'right'), n(64, 0.01, 'right'), n(67, 0.02, 'right'), // acorde derecha → aguda 67
    n(36, 0, 'left'), n(43, 0.01, 'left'),                          // acorde izquierda → grave 36
    n(72, 1, 'right'),
    n(40, 1, 'left'),
  ]);

  it('original devuelve la canción idéntica', () => {
    expect(simplifySong(base, 'original')).toBe(base);
  });

  it('easy: solo derecha y solo la nota más aguda de cada acorde', () => {
    const s = simplifySong(base, 'easy');
    expect(s.notes.map(x => x.midi)).toEqual([67, 72]);
    expect(s.notes.every(x => x.hand === 'right')).toBe(true);
    expect(s.duration).toBe(base.duration);
  });

  it('medium: derecha íntegra e izquierda reducida al bajo de cada acorde', () => {
    const s = simplifySong(base, 'medium');
    expect(s.notes.filter(x => x.hand === 'right').map(x => x.midi)).toEqual([60, 64, 67, 72]);
    expect(s.notes.filter(x => x.hand === 'left').map(x => x.midi)).toEqual([36, 40]);
  });

  it('easy con canción sin mano derecha devuelve la izquierda melodizada (no vacía)', () => {
    const onlyLeft = song([n(36, 0, 'left'), n(43, 0.01, 'left')]);
    const s = simplifySong(onlyLeft, 'easy');
    expect(s.notes.length).toBeGreaterThan(0); // fallback: usa la izquierda
    expect(s.notes.map(x => x.midi)).toEqual([43]); // la más aguda del acorde
  });

  it('las notas resultantes quedan ordenadas por tiempo', () => {
    const s = simplifySong(base, 'medium');
    const times = s.notes.map(x => x.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
```

- [ ] Implementación:

```ts
import { groupNotes } from './groupNotes';
import type { Song, SongNote } from './types';

export type Level = 'easy' | 'medium' | 'original';

export const LEVEL_LABELS: Record<Level, string> = {
  easy: 'Fácil', medium: 'Medio', original: 'Original',
};

/**
 * Versión simplificada de una canción para practicar por niveles.
 * easy: solo melodía (derecha; la nota más aguda de cada acorde). Si la canción
 *       no tiene mano derecha, se usa la izquierda como fuente de melodía.
 * medium: derecha íntegra + izquierda reducida a su nota más grave por acorde.
 * original: la canción tal cual (misma referencia).
 */
export function simplifySong(song: Song, level: Level): Song {
  if (level === 'original') return song;

  const right = song.notes.filter(nt => nt.hand === 'right');
  const left = song.notes.filter(nt => nt.hand === 'left');

  let notes: SongNote[];
  if (level === 'easy') {
    const source = right.length > 0 ? right : left;
    notes = topNotePerGroup(source);
  } else {
    notes = [...right, ...bottomNotePerGroup(left)]
      .sort((a, b) => a.time - b.time || a.midi - b.midi);
  }
  return { ...song, notes };
}

function topNotePerGroup(notes: SongNote[]): SongNote[] {
  return groupNotes(notes).map(g =>
    g.notes.reduce((top, nt) => (nt.midi > top.midi ? nt : top)));
}

function bottomNotePerGroup(notes: SongNote[]): SongNote[] {
  return groupNotes(notes).map(g =>
    g.notes.reduce((low, nt) => (nt.midi < low.midi ? nt : low)));
}
```

- [ ] `npm test` todo verde (30 + 5 = 35). Commit: `feat: simplificación de canciones por nivel (fácil/medio/original)`

### Task B: selector de nivel en `src/screens/PracticeScreen.tsx`

- [ ] Añadir estado y canción efectiva:

```tsx
import { simplifySong, LEVEL_LABELS, type Level } from '../core/simplifySong';
// ...
const [level, setLevel] = useState<Level>('original');
const effectiveSong = useMemo(() => simplifySong(song, level), [song, level]);
```

- [ ] Sustituir usos de `song` por `effectiveSong` en: `fitRange(effectiveSong.notes)`, `practicedNotes` (filtra sobre `effectiveSong.notes`), y el efecto de recreación del motor (`new PracticeEngine(effectiveSong, config)`, deps `[effectiveSong, config]`). El título mostrado sigue siendo `song.title`.
- [ ] Añadir el selector en la barra, entre el de manos y el de velocidad:

```tsx
<select value={level} onChange={e => setLevel(e.target.value as Level)}>
  {(Object.keys(LEVEL_LABELS) as Level[]).map(l =>
    <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
</select>
```

- [ ] `npm test` (35/35) + `npm run build` limpio + dev server responde. Commit: `feat: selector de nivel fácil/medio/original en la práctica`

### Verificación final

- [ ] Suite completa + build. Revisión (spec + calidad) y merge a main.
