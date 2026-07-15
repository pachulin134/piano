# Aprender teoría interactiva — Plan de implementación (Fase 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apartado "Teoría" con sendero de niveles y lecciones interactivas sobre el teclado real de la app; motor de lecciones + niveles 1-3 de contenido.

**Architecture:** Lecciones como datos tipados (`content.ts`); lógica de desbloqueo y persistencia puras y con tests; reproductor de lecciones (`LessonScreen`) que reutiliza el componente `Keyboard`, `playNote` y el estilo Luminoso; `App` gana una navegación de inicio entre 🎵 Canciones y 📚 Teoría. No se toca nada del motor de canciones ni de la detección.

**Tech Stack:** React 18 + TS estricto, CSS puro, Vitest, idb-keyval.

**Spec:** `docs/superpowers/specs/2026-07-15-teoria-interactiva-design.md`

**Regla de oro:** los 80 tests actuales siguen verdes. No tocar `src/core/practiceEngine.*`, `pitchDetect` (solo se importa `matchExpected`), `useMidiInput`, `useMicPitch`, `parseMidi`, `songStore`, `simplifySong`, ni las pantallas de canciones.

## Estructura de archivos

```
src/core/theory/types.ts        — CREAR: Step/Lesson/Level
src/core/theory/progress.ts     — CREAR: desbloqueo (puro, TDD)
src/core/theory/progress.test.ts— CREAR
src/core/theory/content.ts      — CREAR: niveles 1-3 (datos)
src/core/theory/content.test.ts — CREAR: validador de contenido
src/storage/theoryStore.ts      — CREAR: persistencia (TDD)
src/storage/theoryStore.test.ts — CREAR
src/components/lesson/TeachStep.tsx  — CREAR
src/components/lesson/PlayStep.tsx   — CREAR
src/components/lesson/ChooseStep.tsx — CREAR
src/screens/LessonScreen.tsx    — CREAR: reproductor de pasos
src/screens/TheoryPathScreen.tsx— CREAR: sendero de niveles
src/App.tsx                     — MODIFICAR: navegación inicio (Canciones/Teoría)
```

Rango de teclado fijo para todas las lecciones: **MIDI 48..83** (Do3..Si5, 3 octavas). Todo `keys` del contenido debe caer en ese rango.

---

### Task 1: Tipos + motor de progreso (TDD)

**Files:** Create `src/core/theory/types.ts`, `src/core/theory/progress.ts`, `src/core/theory/progress.test.ts`

- [ ] **Step 1: `src/core/theory/types.ts`**

```ts
export interface StepTeach { kind: 'teach'; text: string; keys: number[]; play?: boolean }
export interface StepPlay { kind: 'play'; text: string; keys: number[]; anyOctave?: boolean }
export interface StepChoose { kind: 'choose'; text: string; options: string[]; answer: number }
export type LessonStep = StepTeach | StepPlay | StepChoose;

export interface Lesson { id: string; title: string; steps: LessonStep[] }
export interface Level { id: string; index: number; title: string; subtitle: string; lessons: Lesson[] }
```

- [ ] **Step 2: Test que falla — `src/core/theory/progress.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { isLessonUnlocked, isLevelUnlocked, levelProgress } from './progress';
import type { Level } from './types';

const levels: Level[] = [
  { id: 'n1', index: 1, title: 'N1', subtitle: '', lessons: [
    { id: 'n1l1', title: 'a', steps: [] },
    { id: 'n1l2', title: 'b', steps: [] },
  ]},
  { id: 'n2', index: 2, title: 'N2', subtitle: '', lessons: [
    { id: 'n2l1', title: 'c', steps: [] },
  ]},
];

describe('progress', () => {
  it('la primera lección siempre está desbloqueada', () => {
    expect(isLessonUnlocked(levels, new Set(), 'n1', 'n1l1')).toBe(true);
  });
  it('la segunda lección se desbloquea al completar la primera', () => {
    expect(isLessonUnlocked(levels, new Set(), 'n1', 'n1l2')).toBe(false);
    expect(isLessonUnlocked(levels, new Set(['n1l1']), 'n1', 'n1l2')).toBe(true);
  });
  it('el nivel 2 se desbloquea al completar todas las lecciones del nivel 1', () => {
    expect(isLevelUnlocked(levels, new Set(['n1l1']), 'n2')).toBe(false);
    expect(isLevelUnlocked(levels, new Set(['n1l1', 'n1l2']), 'n2')).toBe(true);
  });
  it('la primera lección del nivel 2 se desbloquea con el nivel 1 completo', () => {
    expect(isLessonUnlocked(levels, new Set(['n1l1', 'n1l2']), 'n2', 'n2l1')).toBe(true);
  });
  it('levelProgress cuenta completadas del nivel', () => {
    expect(levelProgress(levels[0], new Set(['n1l1']))).toEqual({ done: 1, total: 2 });
  });
  it('ignora ids completados inexistentes', () => {
    expect(isLevelUnlocked(levels, new Set(['fantasma']), 'n2')).toBe(false);
  });
});
```

- [ ] **Step 3:** `npx vitest run src/core/theory/progress.test.ts` → FAIL.

- [ ] **Step 4: `src/core/theory/progress.ts`**

```ts
import type { Level } from './types';

/** Lista plana [levelId, lessonId] en orden de recorrido. */
function order(levels: Level[]): { levelId: string; lessonId: string }[] {
  return levels.flatMap(lv => lv.lessons.map(ls => ({ levelId: lv.id, lessonId: ls.id })));
}

export function isLessonUnlocked(levels: Level[], completed: Set<string>, levelId: string, lessonId: string): boolean {
  const flat = order(levels);
  const idx = flat.findIndex(x => x.levelId === levelId && x.lessonId === lessonId);
  if (idx <= 0) return idx === 0; // la primera siempre; -1 (no existe) → false
  return completed.has(flat[idx - 1].lessonId);
}

export function isLevelUnlocked(levels: Level[], completed: Set<string>, levelId: string): boolean {
  const i = levels.findIndex(l => l.id === levelId);
  if (i <= 0) return i === 0;
  return levels[i - 1].lessons.every(ls => completed.has(ls.id));
}

export function levelProgress(level: Level, completed: Set<string>): { done: number; total: number } {
  return {
    done: level.lessons.filter(ls => completed.has(ls.id)).length,
    total: level.lessons.length,
  };
}
```

- [ ] **Step 5:** `npm test` → 86/86 (80 + 6). **Step 6: Commit** — `git add src/core/theory && git commit -m "feat(teoria): tipos y motor de desbloqueo de lecciones"`

---

### Task 2: Persistencia (TDD)

**Files:** Create `src/storage/theoryStore.ts`, `src/storage/theoryStore.test.ts`

- [ ] **Step 1: Test que falla — `src/storage/theoryStore.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { createTheoryStore, type KV } from './theoryStore';

function memoryKV(): KV {
  const m = new Map<string, unknown>();
  return { get: async k => m.get(k), set: async (k, v) => { m.set(k, v); } };
}

describe('theoryStore', () => {
  it('marca y lista completadas, idempotente', async () => {
    const s = createTheoryStore(memoryKV());
    expect(await s.listCompleted()).toEqual([]);
    await s.markCompleted('n1l1');
    await s.markCompleted('n1l1'); // idempotente
    await s.markCompleted('n1l2');
    expect(new Set(await s.listCompleted())).toEqual(new Set(['n1l1', 'n1l2']));
  });
});
```

- [ ] **Step 2:** correr → FAIL.

- [ ] **Step 3: `src/storage/theoryStore.ts`**

```ts
import { get, set } from 'idb-keyval';

export interface KV {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

const KEY = 'theory-completed-v1';

export function createTheoryStore(kv: KV = { get, set }) {
  const read = async (): Promise<string[]> => ((await kv.get(KEY)) as string[] | undefined) ?? [];
  return {
    listCompleted: read,
    async markCompleted(lessonId: string): Promise<void> {
      const done = await read();
      if (done.includes(lessonId)) return;
      await kv.set(KEY, [...done, lessonId]);
    },
  };
}

export type TheoryStore = ReturnType<typeof createTheoryStore>;
```

- [ ] **Step 4:** `npm test` → 87/87. **Step 5: Commit** — `git add src/storage/theoryStore* && git commit -m "feat(teoria): persistencia de lecciones completadas"`

---

### Task 3: Contenido de los niveles 1-3 + validador (TDD)

**Files:** Create `src/core/theory/content.ts`, `src/core/theory/content.test.ts`

- [ ] **Step 1: Validador que falla — `src/core/theory/content.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { LEVELS } from './content';

describe('content', () => {
  it('hay 3 niveles con lecciones', () => {
    expect(LEVELS).toHaveLength(3);
    for (const lv of LEVELS) expect(lv.lessons.length).toBeGreaterThanOrEqual(3);
  });
  it('ids de lección únicos', () => {
    const ids = LEVELS.flatMap(l => l.lessons.map(ls => ls.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('todas las teclas están en 48..83; play exige teclas; choose válido', () => {
    for (const lv of LEVELS) for (const ls of lv.lessons) for (const st of ls.steps) {
      if (st.kind === 'teach' || st.kind === 'play') {
        if (st.kind === 'play') expect(st.keys.length).toBeGreaterThan(0); // teach puede ser conceptual (0 teclas)
        for (const k of st.keys) { expect(k).toBeGreaterThanOrEqual(48); expect(k).toBeLessThanOrEqual(83); }
      } else {
        expect(st.options.length).toBeGreaterThanOrEqual(2);
        expect(st.answer).toBeGreaterThanOrEqual(0);
        expect(st.answer).toBeLessThan(st.options.length);
      }
    }
  });
  it('cada lección tiene al menos un paso', () => {
    for (const lv of LEVELS) for (const ls of lv.lessons) expect(ls.steps.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2:** correr → FAIL (content no existe).

- [ ] **Step 3: `src/core/theory/content.ts`** — Nivel 1 EXACTO (patrón canónico); niveles 2 y 3 siguen la misma forma con el contenido concreto indicado. Notas de referencia: Do3=48, Do4(central)=60, Do5=72; Do4-Si4 = 60..71; Fa#4=66.

```ts
import type { Level } from './types';

export const LEVELS: Level[] = [
  {
    id: 'n1', index: 1, title: 'Conoce el teclado',
    subtitle: 'blancas, negras y los nombres de las notas',
    lessons: [
      { id: 'n1l1', title: 'Blancas y negras', steps: [
        { kind: 'teach', text: 'El piano tiene teclas blancas y teclas negras. Las negras van en grupos de 2 y de 3, y ese dibujo se repite por todo el teclado.', keys: [61, 63, 66, 68, 70] },
        { kind: 'choose', text: '¿En qué grupos se colocan las teclas negras?', options: ['De 2 y de 3', 'Todas seguidas', 'De 4 en 4'], answer: 0 },
      ]},
      { id: 'n1l2', title: 'Encuentra el Do', steps: [
        { kind: 'teach', text: 'El DO es la tecla blanca justo a la izquierda del grupo de 2 negras. Escúchalos: hay varios DO por el teclado.', keys: [48, 60, 72], play: true },
        { kind: 'play', text: 'Toca un DO (el que quieras).', keys: [60], anyOctave: true },
        { kind: 'choose', text: 'El DO está a la izquierda del grupo de…', options: ['2 negras', '3 negras'], answer: 0 },
      ]},
      { id: 'n1l3', title: 'Re, Mi y el grupo de 2', steps: [
        { kind: 'teach', text: 'Dentro del grupo de 2 negras: a la izquierda el DO, en medio el RE, y a la derecha el MI.', keys: [60, 62, 64], play: true },
        { kind: 'play', text: 'Toca un RE.', keys: [62], anyOctave: true },
        { kind: 'play', text: 'Ahora toca un MI.', keys: [64], anyOctave: true },
      ]},
      { id: 'n1l4', title: 'Fa, Sol, La, Si y el grupo de 3', steps: [
        { kind: 'teach', text: 'El grupo de 3 negras empieza en FA. Las blancas son FA, SOL, LA, SI. Después vuelve el DO.', keys: [65, 67, 69, 71], play: true },
        { kind: 'play', text: 'Toca un FA (a la izquierda del grupo de 3).', keys: [65], anyOctave: true },
        { kind: 'play', text: 'Toca un SOL.', keys: [67], anyOctave: true },
        { kind: 'choose', text: '¿Cuántas notas blancas hay antes de repetirse (Do a Si)?', options: ['5', '7', '8'], answer: 1 },
      ]},
      { id: 'n1l5', title: 'Octavas: agudo y grave', steps: [
        { kind: 'teach', text: 'De un DO al siguiente DO hay una OCTAVA. A la derecha el sonido es más AGUDO; a la izquierda, más GRAVE.', keys: [48, 60, 72], play: true },
        { kind: 'play', text: 'Toca el DO más agudo que veas.', keys: [72] },
        { kind: 'play', text: 'Toca el DO más grave que veas.', keys: [48] },
        { kind: 'choose', text: 'A la derecha del teclado el sonido es…', options: ['Más grave', 'Más agudo'], answer: 1 },
      ]},
    ],
  },
  {
    id: 'n2', index: 2, title: 'Ritmo y pulso',
    subtitle: 'la duración de las notas y el compás',
    lessons: [
      { id: 'n2l1', title: 'El pulso', steps: [
        { kind: 'teach', text: 'La música tiene un PULSO regular, como los pasos al andar. Sobre ese pulso colocamos las notas.', keys: [60] },
        { kind: 'play', text: 'Toca un DO cuatro veces, marcando un pulso regular.', keys: [60], anyOctave: true },
        { kind: 'choose', text: 'El pulso es…', options: ['Un latido regular', 'El nombre de una tecla'], answer: 0 },
      ]},
      { id: 'n2l2', title: 'Negra, blanca y redonda', steps: [
        { kind: 'teach', text: 'La NEGRA dura 1 pulso, la BLANCA 2 y la REDONDA 4. Cuanto más larga, más suena la nota.', keys: [60] },
        { kind: 'choose', text: '¿Qué dura más?', options: ['La negra', 'La blanca', 'La redonda'], answer: 2 },
        { kind: 'choose', text: 'Una blanca dura…', options: ['1 pulso', '2 pulsos', '4 pulsos'], answer: 1 },
      ]},
      { id: 'n2l3', title: 'Los silencios', steps: [
        { kind: 'teach', text: 'Los SILENCIOS son pausas: momentos sin tocar que también tienen duración. La música también respira.', keys: [] as number[] },
        { kind: 'choose', text: 'Un silencio es…', options: ['Una nota muy grave', 'Una pausa sin tocar'], answer: 1 },
      ]},
      { id: 'n2l4', title: 'El compás de 4/4', steps: [
        { kind: 'teach', text: 'El COMPÁS agrupa los pulsos. En 4/4 hay 4 pulsos por compás; es el más común en las canciones.', keys: [60] },
        { kind: 'play', text: 'Marca un compás de 4/4: toca un DO 4 veces.', keys: [60], anyOctave: true },
        { kind: 'choose', text: 'En 4/4 hay… pulsos por compás.', options: ['2', '3', '4'], answer: 2 },
      ]},
    ],
  },
  {
    id: 'n3', index: 3, title: 'Sostenidos y bemoles',
    subtitle: 'las teclas negras tienen nombre',
    lessons: [
      { id: 'n3l1', title: 'Semitono y tono', steps: [
        { kind: 'teach', text: 'De una tecla a la de justo al lado (contando negras) hay un SEMITONO, la distancia más pequeña. Dos semitonos son un TONO.', keys: [60, 61, 62], play: true },
        { kind: 'choose', text: 'La distancia más pequeña entre dos teclas es…', options: ['Un tono', 'Un semitono'], answer: 1 },
      ]},
      { id: 'n3l2', title: 'El sostenido (#)', steps: [
        { kind: 'teach', text: 'Subir un semitono es un SOSTENIDO (#). La negra a la derecha del DO es DO# (do sostenido).', keys: [60, 61], play: true },
        { kind: 'play', text: 'Toca el DO# (la negra a la derecha del DO).', keys: [61], anyOctave: true },
      ]},
      { id: 'n3l3', title: 'El bemol (♭)', steps: [
        { kind: 'teach', text: 'Bajar un semitono es un BEMOL (♭). Esa misma negra, vista desde el RE, es RE♭. ¡La misma tecla tiene dos nombres!', keys: [62, 61], play: true },
        { kind: 'choose', text: 'DO# y RE♭ son…', options: ['La misma tecla', 'Teclas distintas'], answer: 0 },
      ]},
      { id: 'n3l4', title: 'Las 5 negras', steps: [
        { kind: 'teach', text: 'Las negras son DO#, RE#, FA#, SOL# y LA#. Fíjate: no hay negra entre MI-FA ni entre SI-DO.', keys: [61, 63, 66, 68, 70], play: true },
        { kind: 'play', text: 'Toca el FA# (la primera negra del grupo de 3).', keys: [66], anyOctave: true },
        { kind: 'choose', text: '¿Entre qué notas NO hay tecla negra?', options: ['Entre MI y FA', 'Entre DO y RE'], answer: 0 },
      ]},
    ],
  },
];
```

- [ ] **Step 4:** `npm test` → 91/91. **Step 5: Commit** — `git add src/core/theory/content* && git commit -m "feat(teoria): contenido de los niveles 1-3"`

---

### Task 4: Componentes de paso + LessonScreen

**Files:** Create `src/components/lesson/TeachStep.tsx`, `PlayStep.tsx`, `ChooseStep.tsx`, `src/screens/LessonScreen.tsx`

- [ ] **Step 1: `src/components/lesson/TeachStep.tsx`**

```tsx
import Keyboard from '../Keyboard';
import { initPiano, playNote } from '../../audio/piano';
import type { StepTeach } from '../../core/theory/types';

interface Props { step: StepTeach; width: number; kbHeight: number; onNext: () => void }

export default function TeachStep({ step, width, kbHeight, onNext }: Props) {
  const expected = new Set(step.keys);
  const sound = async () => {
    await initPiano();
    step.keys.forEach((m, i) => window.setTimeout(() => playNote(m, 0.8), i * 350));
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
        <p style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--ink)' }}>{step.text}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {step.play && step.keys.length > 0 && (
            <button className="btn-primary" onClick={sound}>▶ Escuchar</button>
          )}
          <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={onNext}>Siguiente →</button>
        </div>
      </div>
      <Keyboard loMidi={48} hiMidi={83} width={width} height={kbHeight}
        pressed={new Set()} expected={expected} wrong={new Set()} onKey={() => {}} interactive={false} />
    </div>
  );
}
```

- [ ] **Step 2: `src/components/lesson/PlayStep.tsx`**

```tsx
import { useMemo, useState } from 'react';
import Keyboard from '../Keyboard';
import { playNote } from '../../audio/piano';
import { matchExpected } from '../../audio/pitchDetect';
import type { StepPlay } from '../../core/theory/types';

interface Props { step: StepPlay; width: number; kbHeight: number; onDone: () => void }

export default function PlayStep({ step, width, kbHeight, onDone }: Props) {
  const target = useMemo(() => step.keys, [step]);
  const [hit, setHit] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<Set<number>>(new Set());

  const expected = new Set(target.filter(k => !hit.has(k)));

  const onKey = (midi: number, down: boolean) => {
    if (!down) return;
    playNote(midi, 0.6);
    const remaining = target.filter(k => !hit.has(k));
    const match = step.anyOctave ? matchExpected(midi, remaining) : (remaining.includes(midi) ? midi : null);
    if (match !== null) {
      const nextHit = new Set(hit).add(match);
      setHit(nextHit);
      if (target.every(k => nextHit.has(k))) window.setTimeout(onDone, 250);
    } else {
      setWrong(prev => new Set(prev).add(midi));
      window.setTimeout(() => setWrong(prev => { const n = new Set(prev); n.delete(midi); return n; }), 350);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{ fontSize: 17, lineHeight: 1.5 }}>{step.text}</p>
        {hit.size > 0 && <div className="coach coach-ok" style={{ marginTop: 12 }}>✓ ¡Bien!</div>}
      </div>
      <Keyboard loMidi={48} hiMidi={83} width={width} height={kbHeight}
        pressed={hit} expected={expected} wrong={wrong} onKey={onKey} interactive />
    </div>
  );
}
```

Nota: `matchExpected(midi, expected)` (de `pitchDetect.ts`) devuelve la nota esperada emparejada por clase (misma nota en otra octava) o `null`. Para `anyOctave` acepta cualquier octava; sin él, exige la tecla exacta.

- [ ] **Step 3: `src/components/lesson/ChooseStep.tsx`**

```tsx
import { useState } from 'react';
import type { StepChoose } from '../../core/theory/types';

interface Props { step: StepChoose; onDone: () => void }

export default function ChooseStep({ step, onDone }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const choose = (i: number) => {
    setPicked(i);
    if (i === step.answer) window.setTimeout(onDone, 500);
    else window.setTimeout(() => setPicked(null), 600);
  };
  const bg = (i: number) => {
    if (picked === null) return 'var(--bg-card)';
    if (i === step.answer && picked === i) return 'var(--left-pale)';
    if (i === picked) return 'var(--error-pale)';
    return 'var(--bg-card)';
  };
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: 12 }}>
      <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4 }}>{step.text}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {step.options.map((opt, i) => (
          <button key={i} className="card" style={{ textAlign: 'left', background: bg(i), fontSize: 16 }}
            onClick={() => choose(i)}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `src/screens/LessonScreen.tsx`**

```tsx
import { useEffect, useState } from 'react';
import TeachStep from '../components/lesson/TeachStep';
import PlayStep from '../components/lesson/PlayStep';
import ChooseStep from '../components/lesson/ChooseStep';
import EndOverlay from '../components/EndOverlay';
import type { Lesson } from '../core/theory/types';

interface Props {
  lesson: Lesson;
  hasNext: boolean;
  onCompleted: () => void;   // marca la lección como completada (persistencia)
  onNextLesson: () => void;
  onExit: () => void;
}

export default function LessonScreen({ lesson, hasNext, onCompleted, onNextLesson, onExit }: Props) {
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => { setI(0); setDone(false); }, [lesson]);

  const advance = () => {
    if (i + 1 >= lesson.steps.length) { setDone(true); onCompleted(); }
    else setI(i + 1);
  };

  const step = lesson.steps[i];
  const kbHeight = Math.max(90, Math.round(size.h * 0.24));
  const barH = 48;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: barH, display: 'flex', gap: 10, alignItems: 'center', padding: '0 12px' }}>
        <button className="btn-ghost" onClick={onExit} style={{ fontSize: 18 }}>✕</button>
        <div style={{ flex: 1, height: 8, background: 'var(--bg-chip)', borderRadius: 4 }}>
          <div style={{ width: `${((i + (done ? 1 : 0)) / lesson.steps.length) * 100}%`, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, var(--right-soft), var(--right))' }} />
        </div>
        <span className="chip">{Math.min(i + 1, lesson.steps.length)}/{lesson.steps.length}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {step.kind === 'teach' && <TeachStep step={step} width={size.w} kbHeight={kbHeight} onNext={advance} />}
        {step.kind === 'play' && <PlayStep step={step} width={size.w} kbHeight={kbHeight} onDone={advance} />}
        {step.kind === 'choose' && <ChooseStep step={step} onDone={advance} />}
      </div>
      {done && (
        <EndOverlay
          score={null} maxStreak={0} isRecord={false}
          onRepeat={hasNext ? onNextLesson : onExit}
          onChangeMode={onExit}
          onLibrary={onExit}
        />
      )}
    </div>
  );
}
```

Nota: `EndOverlay` (existente) muestra "¡Canción terminada!" con `score=null`. Aceptable para v1 reutilizándolo; el botón "Repetir" se reetiqueta funcionalmente como "siguiente/volver". (Si se quiere un overlay propio con textos de lección, es un componente trivial aparte; no obligatorio para este plan.)

- [ ] **Step 5:** `npm run build` limpio (los componentes aún no se enlazan; TS los compila por el include). Commit — `git add src/components/lesson src/screens/LessonScreen.tsx && git commit -m "feat(teoria): reproductor de lecciones y pasos"`

---

### Task 5: Sendero de niveles

**Files:** Create `src/screens/TheoryPathScreen.tsx`

- [ ] **Step 1: `src/screens/TheoryPathScreen.tsx`**

```tsx
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
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** `npm run build` limpio. Commit — `git add src/screens/TheoryPathScreen.tsx && git commit -m "feat(teoria): sendero de niveles con progreso y desbloqueo"`

---

### Task 6: Navegación de inicio (Canciones / Teoría) en App

**Files:** Modify `src/App.tsx`

- [ ] **Step 1:** Añadir el estado de área y la pantalla de teoría, conservando TODO el flujo de canciones. Cambios sobre el archivo actual:

(a) Imports nuevos:
```tsx
import TheoryPathScreen from './screens/TheoryPathScreen';
import LessonScreen from './screens/LessonScreen';
import { createTheoryStore } from './storage/theoryStore';
import { LEVELS } from './core/theory/content';
import type { Lesson } from './core/theory/types';
```

(b) Estado nuevo (junto al de canciones):
```tsx
const theoryStore = useMemo(() => createTheoryStore(), []);
const [area, setArea] = useState<'home' | 'songs' | 'theory'>('home');
const [completed, setCompleted] = useState<Set<string>>(new Set());
const [lesson, setLesson] = useState<{ levelId: string; lesson: Lesson } | null>(null);

useEffect(() => { theoryStore.listCompleted().then(ids => setCompleted(new Set(ids))); }, [theoryStore]);
const refreshTheory = useCallback(() => theoryStore.listCompleted().then(ids => setCompleted(new Set(ids))), [theoryStore]);
```

(c) Cálculo de "siguiente lección" (para el botón del final):
```tsx
const flatLessons = useMemo(() => LEVELS.flatMap(lv => lv.lessons.map(ls => ({ levelId: lv.id, lesson: ls }))), []);
const nextOf = (lessonId: string) => {
  const idx = flatLessons.findIndex(x => x.lesson.id === lessonId);
  return idx >= 0 && idx + 1 < flatLessons.length ? flatLessons[idx + 1] : null;
};
```

(d) Reemplazar el `return` final. Orden de prioridad de pantallas: sesión de canción → setup de canción → **lección de teoría** → **sendero de teoría** → biblioteca de canciones → **inicio (dos áreas)**. Los dos primeros `if (session)` y `if (setupSong)` quedan igual. Añadir después:

```tsx
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
      <LibraryScreen songs={songs} onAdd={handleAdd} onRemove={handleRemove} onOpen={setSetupSong} />
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
```

(e) La biblioteca ahora se llega desde el inicio; su botón "✕/atrás" no existía. Añadir a `LibraryScreen` un modo de volver: pasar `onExit={() => setArea('home')}` — pero para no modificar `LibraryScreen` en este plan, en su lugar el inicio es accesible con el botón atrás del propio flujo. SIMPLIFICACIÓN: dejar que `LibraryScreen` gane una prop opcional `onBack?`. Modificar `LibraryScreen.tsx`: añadir `onBack?: () => void` a Props y, si viene, un botón `←` al principio de la cabecera:
```tsx
{onBack && <button className="btn-ghost" onClick={onBack} style={{ fontSize: 18 }}>←</button>}
```
y en `App`, `area === 'songs'` pasa `onBack={() => setArea('home')}`.

- [ ] **Step 2: Verificar** — `npm test` (91/91), `npm run build` limpio, dev server `curl -k https://localhost:5173/` → 200.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat(teoria): apartado Teoría integrado en el inicio (Canciones/Teoría)"`

---

### Task 7: Verificación final

- [ ] `npm test` → 91/91; `npm run build` limpio.
- [ ] Manual (dev server): inicio con dos tarjetas; Teoría abre el sendero; Nivel 1 desbloqueado, resto 🔒; abrir "Blancas y negras" → pasos teach (teclas iluminadas, botón escuchar suena) / play (tocar la tecla correcta = verde y avanza, incorrecta = roja + sacudida) / choose (respuesta correcta avanza, incorrecta se marca y reintenta); completar la lección → overlay → siguiente lección; al completar todas las del Nivel 1, el Nivel 2 se desbloquea; recargar la página conserva el progreso; volver a Canciones sigue funcionando igual que antes.
- [ ] iPhone (`npm run dev:mobile`): teclado táctil con nombres legible, textos y opciones cómodos en horizontal, safe areas.
- [ ] Commit final si hay retoques.

## Fuera de alcance (spec)

Niveles 4+ (intervalos, escalas, acordes, lectura…), micrófono en teoría, overlay de fin propio, metrónomo real. Todo ello es ampliación posterior sobre este mismo motor.
