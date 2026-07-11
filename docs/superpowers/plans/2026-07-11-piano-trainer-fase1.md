# Piano Trainer — Plan de implementación Fase 1 (MVP)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Webapp gratuita para practicar canciones de piano: importas un `.mid`, ves las notas caer sobre un teclado en pantalla y practicas en modo espera con tu piano MIDI (o tocando la pantalla), con manos separadas, control de velocidad, puntuación y biblioteca persistente.

**Architecture:** SPA estática (Vite + React + TypeScript). Lógica de dominio pura y testeada (parser MIDI → modelo `Song`, motor de práctica con modo espera, layout de teclado) separada de la UI (componentes React + canvas). Entrada por Web MIDI API con fallback táctil/teclado de ordenador. Persistencia en IndexedDB. Sin backend.

**Tech Stack:** Vite, React 18, TypeScript, Vitest (tests), `@tonejs/midi` (parseo MIDI), `smplr` (sonido de piano sampleado), `idb-keyval` (IndexedDB).

**Spec:** `docs/superpowers/specs/2026-07-11-piano-trainer-design.md`

## Estructura de archivos

```
package.json, vite.config.ts, tsconfig.json, index.html
src/main.tsx                  — arranque React
src/App.tsx                   — navegación Biblioteca ⇄ Práctica
src/core/types.ts             — Song, SongNote, Hand, NoteGroup
src/core/groupNotes.ts        — agrupar notas simultáneas (acordes)
src/core/parseMidi.ts         — ArrayBuffer .mid → Song (manos incluidas)
src/core/difficulty.ts        — estimación de dificultad 1..5
src/core/practiceEngine.ts    — reloj, modo espera, puntuación
src/core/keyLayout.ts         — geometría de teclas para un rango
src/input/useMidiInput.ts     — hook Web MIDI
src/input/useComputerKeys.ts  — hook teclado de ordenador
src/audio/piano.ts            — sonido con smplr
src/components/Keyboard.tsx   — teclado SVG táctil
src/components/NoteFall.tsx   — cascada de notas (canvas)
src/screens/PracticeScreen.tsx— pantalla de práctica (controles + bucle rAF)
src/screens/LibraryScreen.tsx — biblioteca (lista, importar, borrar)
src/storage/songStore.ts      — persistencia IndexedDB
scripts/makeSongs.mjs         — genera .mid libres de derechos en public/songs/
tests en src/**/*.test.ts junto a cada módulo
```

---

### Task 1: Andamiaje del proyecto

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `.gitignore`

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "piano-trainer",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "songs": "node scripts/makeSongs.mjs"
  },
  "dependencies": {
    "@tonejs/midi": "^2.0.28",
    "idb-keyval": "^6.2.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "smplr": "^0.16.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Crear `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  test: { environment: 'node' },
});
```

- [ ] **Step 3: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src", "scripts"]
}
```

- [ ] **Step 4: Crear `index.html`**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <title>Piano Trainer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Crear `src/main.tsx`, `src/App.tsx` y `src/styles.css`**

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`src/App.tsx` (provisional, se sustituye en Task 12):
```tsx
export default function App() {
  return <h1>Piano Trainer</h1>;
}
```

`src/styles.css`:
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #root { height: 100%; }
body {
  font-family: system-ui, sans-serif;
  background: #14161c;
  color: #e8e8ec;
  overflow: hidden;
  touch-action: manipulation;
}
button {
  font: inherit;
  color: inherit;
  background: #2a2e3a;
  border: 1px solid #3d4152;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
}
button:disabled { opacity: 0.4; }
```

- [ ] **Step 6: Crear `.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 7: Instalar y verificar**

Run: `npm install && npm run build`
Expected: build termina sin errores (aviso de chunk size es aceptable).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "chore: andamiaje Vite + React + TS + Vitest"
```

---

### Task 2: Tipos del dominio y agrupación de acordes

**Files:**
- Create: `src/core/types.ts`, `src/core/groupNotes.ts`
- Test: `src/core/groupNotes.test.ts`

- [ ] **Step 1: Crear `src/core/types.ts`**

```ts
export type Hand = 'left' | 'right';

export interface SongNote {
  midi: number;      // número MIDI 21..108 (A0..C8)
  time: number;      // segundos desde el inicio, al tempo original
  duration: number;  // segundos
  hand: Hand;
}

export interface Song {
  id: string;
  title: string;
  notes: SongNote[]; // ordenadas por time
  duration: number;  // segundos
  difficulty: 1 | 2 | 3 | 4 | 5;
  bestScore: number | null; // % 0..100
}

export interface NoteGroup {
  time: number;
  notes: SongNote[];
}
```

- [ ] **Step 2: Escribir el test que falla — `src/core/groupNotes.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { groupNotes } from './groupNotes';
import type { SongNote } from './types';

const n = (midi: number, time: number): SongNote =>
  ({ midi, time, duration: 0.5, hand: 'right' });

describe('groupNotes', () => {
  it('agrupa notas casi simultáneas en un acorde', () => {
    const groups = groupNotes([n(60, 0), n(64, 0.02), n(67, 0.04), n(72, 1)]);
    expect(groups).toHaveLength(2);
    expect(groups[0].notes.map(x => x.midi)).toEqual([60, 64, 67]);
    expect(groups[1].notes.map(x => x.midi)).toEqual([72]);
  });

  it('devuelve vacío para lista vacía', () => {
    expect(groupNotes([])).toEqual([]);
  });
});
```

- [ ] **Step 3: Verificar que falla**

Run: `npx vitest run src/core/groupNotes.test.ts`
Expected: FAIL — módulo `./groupNotes` no existe.

- [ ] **Step 4: Implementar `src/core/groupNotes.ts`**

```ts
import type { NoteGroup, SongNote } from './types';

/** Agrupa notas cuyo inicio dista <= epsilon del inicio del grupo (acordes). Asume notas ordenadas por time. */
export function groupNotes(notes: SongNote[], epsilon = 0.05): NoteGroup[] {
  const groups: NoteGroup[] = [];
  for (const note of notes) {
    const last = groups[groups.length - 1];
    if (last && note.time - last.time <= epsilon) last.notes.push(note);
    else groups.push({ time: note.time, notes: [note] });
  }
  return groups;
}
```

- [ ] **Step 5: Verificar que pasa**

Run: `npx vitest run src/core/groupNotes.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/core && git commit -m "feat: tipos del dominio y agrupación de acordes"
```

---

### Task 3: Parser MIDI → Song

**Files:**
- Create: `src/core/parseMidi.ts`
- Test: `src/core/parseMidi.test.ts`

- [ ] **Step 1: Escribir el test que falla — `src/core/parseMidi.test.ts`**

Se construyen MIDIs de prueba con la propia `@tonejs/midi` (sin binarios en el repo):

```ts
import { describe, it, expect } from 'vitest';
import { Midi } from '@tonejs/midi';
import { parseMidi } from './parseMidi';

function twoTrackMidi(): ArrayBuffer {
  const midi = new Midi();
  const right = midi.addTrack();
  right.addNote({ midi: 72, time: 0, duration: 0.5 });
  right.addNote({ midi: 74, time: 0.5, duration: 0.5 });
  const left = midi.addTrack();
  left.addNote({ midi: 48, time: 0, duration: 1 });
  return midi.toArray().buffer as ArrayBuffer;
}

function singleTrackMidi(): ArrayBuffer {
  const midi = new Midi();
  const t = midi.addTrack();
  t.addNote({ midi: 40, time: 0, duration: 0.5 }); // grave → izquierda
  t.addNote({ midi: 72, time: 0, duration: 0.5 }); // agudo → derecha
  return midi.toArray().buffer as ArrayBuffer;
}

describe('parseMidi', () => {
  it('con 2+ pistas: pista 0 = derecha, resto = izquierda', () => {
    const song = parseMidi(twoTrackMidi(), 'Test');
    expect(song.title).toBe('Test');
    expect(song.notes).toHaveLength(3);
    expect(song.notes.find(n => n.midi === 72)!.hand).toBe('right');
    expect(song.notes.find(n => n.midi === 48)!.hand).toBe('left');
    expect(song.duration).toBeCloseTo(1, 1);
  });

  it('con 1 pista: separa manos por el Do central (midi 60)', () => {
    const song = parseMidi(singleTrackMidi(), 'Mono');
    expect(song.notes.find(n => n.midi === 40)!.hand).toBe('left');
    expect(song.notes.find(n => n.midi === 72)!.hand).toBe('right');
  });

  it('lanza error si no hay notas', () => {
    const empty = new Midi().toArray().buffer as ArrayBuffer;
    expect(() => parseMidi(empty, 'Vacío')).toThrow(/notas/i);
  });

  it('las notas quedan ordenadas por tiempo', () => {
    const song = parseMidi(twoTrackMidi(), 'Orden');
    const times = song.notes.map(n => n.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/core/parseMidi.test.ts`
Expected: FAIL — módulo `./parseMidi` no existe.

- [ ] **Step 3: Implementar `src/core/parseMidi.ts`**

```ts
import { Midi } from '@tonejs/midi';
import { estimateDifficulty } from './difficulty';
import type { Hand, Song, SongNote } from './types';

/** Parsea un archivo .mid. Lanza Error con mensaje entendible si es inválido o no tiene notas. */
export function parseMidi(data: ArrayBuffer, title: string): Song {
  let midi: Midi;
  try {
    midi = new Midi(data);
  } catch {
    throw new Error('El archivo no es un MIDI válido');
  }
  const tracks = midi.tracks.filter(t => t.notes.length > 0);
  if (tracks.length === 0) throw new Error('El archivo MIDI no contiene notas');

  const notes: SongNote[] = tracks
    .flatMap((track, i) =>
      track.notes.map(n => ({
        midi: n.midi,
        time: n.time,
        duration: n.duration,
        hand: assignHand(tracks.length, i, n.midi),
      })),
    )
    .sort((a, b) => a.time - b.time || a.midi - b.midi);

  const duration = Math.max(...notes.map(n => n.time + n.duration));
  const song: Song = {
    id: crypto.randomUUID(),
    title,
    notes,
    duration,
    difficulty: 3,
    bestScore: null,
  };
  song.difficulty = estimateDifficulty(song);
  return song;
}

function assignHand(trackCount: number, trackIndex: number, midi: number): Hand {
  if (trackCount >= 2) return trackIndex === 0 ? 'right' : 'left';
  return midi >= 60 ? 'right' : 'left';
}
```

Nota: `estimateDifficulty` aún no existe; para que compile en este paso, crear `src/core/difficulty.ts` con un stub que se implementa de verdad en Task 4:

```ts
import type { Song } from './types';

export function estimateDifficulty(_song: Song): 1 | 2 | 3 | 4 | 5 {
  return 3;
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/core/parseMidi.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core && git commit -m "feat: parser MIDI a modelo Song con asignación de manos"
```

---

### Task 4: Estimación de dificultad

**Files:**
- Modify: `src/core/difficulty.ts`
- Test: `src/core/difficulty.test.ts`

- [ ] **Step 1: Escribir el test que falla — `src/core/difficulty.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { estimateDifficulty } from './difficulty';
import type { Song, SongNote } from './types';

function makeSong(notesPerSecond: number, seconds: number, chords: boolean): Song {
  const notes: SongNote[] = [];
  const total = Math.round(notesPerSecond * seconds);
  for (let i = 0; i < total; i++) {
    const time = i / notesPerSecond;
    notes.push({ midi: 60 + (i % 12), time, duration: 0.3, hand: 'right' });
    if (chords && i % 2 === 0) {
      notes.push({ midi: 48 + (i % 12), time, duration: 0.3, hand: 'left' });
    }
  }
  return { id: 'x', title: 'x', notes, duration: seconds, difficulty: 3, bestScore: null };
}

describe('estimateDifficulty', () => {
  it('pocas notas por segundo y sin acordes → fácil (1-2)', () => {
    expect(estimateDifficulty(makeSong(1, 30, false))).toBeLessThanOrEqual(2);
  });
  it('densidad media → medio (2-3)', () => {
    const d = estimateDifficulty(makeSong(3, 30, false));
    expect(d).toBeGreaterThanOrEqual(2);
    expect(d).toBeLessThanOrEqual(3);
  });
  it('muy denso y con acordes → difícil (4-5)', () => {
    expect(estimateDifficulty(makeSong(8, 30, true))).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/core/difficulty.test.ts`
Expected: FAIL — el stub devuelve siempre 3.

- [ ] **Step 3: Implementar `src/core/difficulty.ts` (sustituir el stub)**

```ts
import { groupNotes } from './groupNotes';
import type { Song } from './types';

/** Heurística: densidad de notas por segundo + proporción de acordes. */
export function estimateDifficulty(song: Song): 1 | 2 | 3 | 4 | 5 {
  const nps = song.notes.length / Math.max(song.duration, 1);
  const groups = groupNotes(song.notes);
  const chordRatio = groups.filter(g => g.notes.length > 1).length / Math.max(groups.length, 1);

  let level: number;
  if (nps < 1.5) level = 1;
  else if (nps < 3) level = 2;
  else if (nps < 5) level = 3;
  else if (nps < 8) level = 4;
  else level = 5;

  if (chordRatio > 0.3) level += 1;
  return Math.min(5, Math.max(1, level)) as 1 | 2 | 3 | 4 | 5;
}
```

- [ ] **Step 4: Verificar que pasan todos los tests**

Run: `npm test`
Expected: PASS (groupNotes, parseMidi y difficulty).

- [ ] **Step 5: Commit**

```bash
git add src/core && git commit -m "feat: estimación de dificultad por densidad y acordes"
```

---

### Task 5: Motor de práctica (modo espera, manos, velocidad, puntuación)

**Files:**
- Create: `src/core/practiceEngine.ts`
- Test: `src/core/practiceEngine.test.ts`

- [ ] **Step 1: Escribir el test que falla — `src/core/practiceEngine.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { PracticeEngine } from './practiceEngine';
import type { Song, SongNote } from './types';

const note = (midi: number, time: number, hand: SongNote['hand'] = 'right'): SongNote =>
  ({ midi, time, duration: 0.4, hand });

function song(notes: SongNote[]): Song {
  return {
    id: 's', title: 's', notes,
    duration: Math.max(...notes.map(n => n.time + n.duration)),
    difficulty: 1, bestScore: null,
  };
}

describe('PracticeEngine — modo espera', () => {
  it('se detiene en el primer grupo y espera la nota correcta', () => {
    const e = new PracticeEngine(song([note(60, 0.5), note(62, 1.0)]),
      { waitMode: true, speed: 1, hand: 'both' });
    e.tick(2); // intenta avanzar 2s
    expect(e.time).toBeCloseTo(0.5, 5); // clavado en el grupo
    expect(e.expectedNotes()).toEqual([60]);

    expect(e.onKeyDown(61)).toBe('wrong');
    expect(e.onKeyDown(60)).toBe('correct');
    expect(e.expectedNotes()).toEqual([]);

    e.tick(2);
    expect(e.time).toBeCloseTo(1.0, 5); // siguiente grupo
    expect(e.expectedNotes()).toEqual([62]);
  });

  it('un acorde requiere todas sus notas', () => {
    const e = new PracticeEngine(song([note(60, 0), note(64, 0.01)]),
      { waitMode: true, speed: 1, hand: 'both' });
    e.tick(1);
    expect(new Set(e.expectedNotes())).toEqual(new Set([60, 64]));
    e.onKeyDown(60);
    expect(e.finished).toBe(false);
    e.onKeyDown(64);
    e.tick(5);
    expect(e.finished).toBe(true);
  });

  it('la puntuación refleja aciertos y fallos', () => {
    const e = new PracticeEngine(song([note(60, 0)]),
      { waitMode: true, speed: 1, hand: 'both' });
    e.tick(1);
    e.onKeyDown(59); // fallo
    e.onKeyDown(60); // acierto
    expect(e.score()).toBe(50);
  });

  it('hand="right" practica solo la derecha y devuelve la izquierda como acompañamiento', () => {
    const e = new PracticeEngine(song([note(48, 0.2, 'left'), note(72, 0.5, 'right')]),
      { waitMode: true, speed: 1, hand: 'right' });
    const played = e.tick(0.3); // pasa por 0.2s
    expect(played.map(n => n.midi)).toEqual([48]); // la app toca la izquierda
    e.tick(1);
    expect(e.expectedNotes()).toEqual([72]); // el usuario debe tocar la derecha
  });

  it('speed=0.5 avanza el tiempo musical a la mitad', () => {
    const e = new PracticeEngine(song([note(60, 1)]),
      { waitMode: true, speed: 0.5, hand: 'both' });
    e.tick(1); // 1s real = 0.5s musical
    expect(e.time).toBeCloseTo(0.5, 5);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/core/practiceEngine.test.ts`
Expected: FAIL — módulo `./practiceEngine` no existe.

- [ ] **Step 3: Implementar `src/core/practiceEngine.ts`**

```ts
import { groupNotes } from './groupNotes';
import type { Hand, NoteGroup, Song, SongNote } from './types';

export interface EngineConfig {
  waitMode: boolean;
  speed: number;          // 0.25 .. 1
  hand: Hand | 'both';    // mano que practica el usuario
}

export type KeyResult = 'correct' | 'wrong' | 'ignored';

/**
 * Motor puro de práctica. La UI llama a tick(dt) en cada frame y a
 * onKeyDown(midi) con cada tecla del usuario. En modo espera, el reloj
 * se congela en cada grupo hasta completar sus notas.
 */
export class PracticeEngine {
  time = 0;               // segundos musicales
  correct = 0;
  wrong = 0;

  private groups: NoteGroup[];          // grupos que practica el usuario
  private accompaniment: SongNote[];    // notas que reproduce la app
  private accompanimentIdx = 0;
  private groupIdx = 0;
  private pending: Set<number> | null = null;
  private readonly songDuration: number;

  constructor(song: Song, readonly config: EngineConfig) {
    const practiced = config.hand === 'both'
      ? song.notes
      : song.notes.filter(n => n.hand === config.hand);
    this.accompaniment = config.hand === 'both'
      ? []
      : song.notes.filter(n => n.hand !== config.hand);
    this.groups = groupNotes(practiced);
    this.songDuration = song.duration;
  }

  get finished(): boolean {
    return this.pending === null
      && this.groupIdx >= this.groups.length
      && this.time >= this.songDuration;
  }

  /** Notas que el usuario debe pulsar ahora (vacío si no está en espera). */
  expectedNotes(): number[] {
    return this.pending ? [...this.pending] : [];
  }

  /** Avanza dt segundos reales. Devuelve las notas de acompañamiento que la app debe sonar. */
  tick(dtSeconds: number): SongNote[] {
    if (this.pending) return []; // congelado esperando al usuario

    let target = this.time + dtSeconds * this.config.speed;
    const nextGroup = this.groups[this.groupIdx];
    if (nextGroup && target >= nextGroup.time) {
      target = nextGroup.time;
      if (this.config.waitMode) {
        this.pending = new Set(nextGroup.notes.map(n => n.midi));
      } else {
        this.groupIdx += 1;
      }
    }

    const toPlay: SongNote[] = [];
    while (
      this.accompanimentIdx < this.accompaniment.length &&
      this.accompaniment[this.accompanimentIdx].time <= target
    ) {
      toPlay.push(this.accompaniment[this.accompanimentIdx]);
      this.accompanimentIdx += 1;
    }

    this.time = Math.min(target, this.songDuration);
    return toPlay;
  }

  onKeyDown(midi: number): KeyResult {
    if (!this.pending) return 'ignored';
    if (this.pending.has(midi)) {
      this.pending.delete(midi);
      this.correct += 1;
      if (this.pending.size === 0) {
        this.pending = null;
        this.groupIdx += 1;
      }
      return 'correct';
    }
    this.wrong += 1;
    return 'wrong';
  }

  /** % de aciertos sobre pulsaciones evaluadas. 100 si aún no hay ninguna. */
  score(): number {
    const total = this.correct + this.wrong;
    return total === 0 ? 100 : Math.round((this.correct / total) * 100);
  }
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/core/practiceEngine.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core && git commit -m "feat: motor de práctica con modo espera, manos, velocidad y puntuación"
```

---

### Task 6: Geometría del teclado (keyLayout)

**Files:**
- Create: `src/core/keyLayout.ts`
- Test: `src/core/keyLayout.test.ts`

- [ ] **Step 1: Escribir el test que falla — `src/core/keyLayout.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { isBlack, keyLayout, fitRange } from './keyLayout';
import type { SongNote } from './types';

describe('keyLayout', () => {
  it('una octava C4..B4 tiene 7 blancas y 5 negras', () => {
    const keys = keyLayout(60, 71, 700, 100);
    expect(keys.filter(k => !k.black)).toHaveLength(7);
    expect(keys.filter(k => k.black)).toHaveLength(5);
  });

  it('las blancas reparten el ancho completo', () => {
    const keys = keyLayout(60, 71, 700, 100);
    const whites = keys.filter(k => !k.black);
    expect(whites[0].x).toBe(0);
    expect(whites[6].x + whites[6].w).toBeCloseTo(700, 5);
    for (const w of whites) expect(w.w).toBeCloseTo(100, 5);
  });

  it('las negras son más cortas y quedan entre blancas', () => {
    const keys = keyLayout(60, 71, 700, 100);
    const cSharp = keys.find(k => k.midi === 61)!;
    expect(cSharp.black).toBe(true);
    expect(cSharp.h).toBeLessThan(100);
    expect(cSharp.x).toBeGreaterThan(0);
    expect(cSharp.x + cSharp.w).toBeLessThan(200);
  });

  it('isBlack acierta con las 12 clases', () => {
    expect([60, 62, 64, 65, 67, 69, 71].some(isBlack)).toBe(false);
    expect([61, 63, 66, 68, 70].every(isBlack)).toBe(true);
  });
});

describe('fitRange', () => {
  const n = (midi: number): SongNote => ({ midi, time: 0, duration: 1, hand: 'right' });

  it('expande a octavas completas y respeta los límites del piano', () => {
    const [lo, hi] = fitRange([n(62), n(75)]);
    expect(lo).toBe(60);  // C4
    expect(hi).toBe(83);  // B5
    expect(lo).toBeGreaterThanOrEqual(21);
    expect(hi).toBeLessThanOrEqual(108);
  });

  it('garantiza un mínimo de dos octavas', () => {
    const [lo, hi] = fitRange([n(60)]);
    expect(hi - lo).toBeGreaterThanOrEqual(23);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/core/keyLayout.test.ts`
Expected: FAIL — módulo `./keyLayout` no existe.

- [ ] **Step 3: Implementar `src/core/keyLayout.ts`**

```ts
import type { SongNote } from './types';

export interface KeyRect {
  midi: number;
  x: number;
  w: number;
  h: number;
  black: boolean;
}

const BLACK_CLASSES = new Set([1, 3, 6, 8, 10]);

export function isBlack(midi: number): boolean {
  return BLACK_CLASSES.has(midi % 12);
}

/**
 * Geometría de teclas para el rango [loMidi, hiMidi] en un área width×height.
 * Compartida por el teclado SVG y el canvas de notas para que estén alineados.
 */
export function keyLayout(loMidi: number, hiMidi: number, width: number, height: number): KeyRect[] {
  const whites: number[] = [];
  for (let m = loMidi; m <= hiMidi; m++) if (!isBlack(m)) whites.push(m);
  const whiteW = width / whites.length;
  const blackW = whiteW * 0.6;
  const blackH = height * 0.62;

  const keys: KeyRect[] = [];
  let whiteIdx = 0;
  for (let m = loMidi; m <= hiMidi; m++) {
    if (isBlack(m)) {
      keys.push({ midi: m, x: whiteIdx * whiteW - blackW / 2, w: blackW, h: blackH, black: true });
    } else {
      keys.push({ midi: m, x: whiteIdx * whiteW, w: whiteW, h: height, black: false });
      whiteIdx += 1;
    }
  }
  return keys;
}

/** Rango de teclado ajustado a la canción: octavas completas, mínimo 2, dentro de 21..108. */
export function fitRange(notes: SongNote[]): [number, number] {
  const min = Math.min(...notes.map(n => n.midi));
  const max = Math.max(...notes.map(n => n.midi));
  let lo = Math.floor(min / 12) * 12;
  let hi = Math.floor(max / 12) * 12 + 11;
  while (hi - lo < 23) { // mínimo 2 octavas
    if (lo > 21) lo -= 12; else hi += 12;
  }
  return [Math.max(21, lo), Math.min(108, hi)];
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/core/keyLayout.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core && git commit -m "feat: geometría de teclado y ajuste de rango a la canción"
```

---

### Task 7: Componente Keyboard (SVG táctil)

**Files:**
- Create: `src/components/Keyboard.tsx`

- [ ] **Step 1: Implementar `src/components/Keyboard.tsx`**

```tsx
import { useMemo } from 'react';
import { keyLayout } from '../core/keyLayout';

interface Props {
  loMidi: number;
  hiMidi: number;
  width: number;
  height: number;
  pressed: Set<number>;   // teclas que el usuario mantiene pulsadas
  expected: Set<number>;  // teclas que pide el modo espera
  onKey: (midi: number, down: boolean) => void;
}

const COLORS = {
  white: '#f5f3ee', black: '#1c1e26',
  expectedWhite: '#7fb4ff', expectedBlack: '#3d6db3',
  pressed: '#4caf7d',
};

export default function Keyboard({ loMidi, hiMidi, width, height, pressed, expected, onKey }: Props) {
  const keys = useMemo(() => keyLayout(loMidi, hiMidi, width, height), [loMidi, hiMidi, width, height]);
  const fill = (midi: number, black: boolean) => {
    if (pressed.has(midi)) return COLORS.pressed;
    if (expected.has(midi)) return black ? COLORS.expectedBlack : COLORS.expectedWhite;
    return black ? COLORS.black : COLORS.white;
  };
  // Blancas primero para que las negras queden dibujadas encima
  const ordered = [...keys.filter(k => !k.black), ...keys.filter(k => k.black)];
  return (
    <svg width={width} height={height} style={{ display: 'block', touchAction: 'none' }}>
      {ordered.map(k => (
        <rect
          key={k.midi}
          x={k.x} y={0} width={k.w} height={k.h}
          fill={fill(k.midi, k.black)}
          stroke="#101218" strokeWidth={1} rx={3}
          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onKey(k.midi, true); }}
          onPointerUp={() => onKey(k.midi, false)}
          onPointerCancel={() => onKey(k.midi, false)}
        />
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Verificación visual provisional**

Sustituir temporalmente el contenido de `src/App.tsx` por:

```tsx
import { useState } from 'react';
import Keyboard from './components/Keyboard';

export default function App() {
  const [pressed, setPressed] = useState(new Set<number>());
  return (
    <Keyboard
      loMidi={48} hiMidi={83} width={800} height={160}
      pressed={pressed} expected={new Set([60, 64, 67])}
      onKey={(midi, down) => setPressed(prev => {
        const next = new Set(prev);
        if (down) next.add(midi); else next.delete(midi);
        return next;
      })}
    />
  );
}
```

Run: `npm run dev` y abrir http://localhost:5173
Expected: teclado con Do-Mi-Sol marcados en azul; al hacer clic una tecla se pone verde.

- [ ] **Step 3: Commit**

```bash
git add src && git commit -m "feat: teclado SVG táctil con resaltado de teclas"
```

---

### Task 8: Cascada de notas (canvas)

**Files:**
- Create: `src/components/NoteFall.tsx`

- [ ] **Step 1: Implementar `src/components/NoteFall.tsx`**

Canvas que dibuja, para el instante `currentTime`, las notas próximas cayendo hacia el teclado (misma geometría X que `keyLayout`).

```tsx
import { useEffect, useMemo, useRef } from 'react';
import { keyLayout } from '../core/keyLayout';
import type { SongNote } from '../core/types';

interface Props {
  notes: SongNote[];
  currentTime: number;   // segundos musicales
  loMidi: number;
  hiMidi: number;
  width: number;
  height: number;
  lookAhead?: number;    // segundos visibles por delante (default 4)
}

const HAND_COLORS = { right: '#5c9dff', left: '#4caf7d' } as const;

export default function NoteFall({ notes, currentTime, loMidi, hiMidi, width, height, lookAhead = 4 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keyByMidi = useMemo(() => {
    const map = new Map<number, { x: number; w: number }>();
    for (const k of keyLayout(loMidi, hiMidi, width, 10)) map.set(k.midi, { x: k.x, w: k.w });
    return map;
  }, [loMidi, hiMidi, width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pxPerSecond = height / lookAhead;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#181b23';
    ctx.fillRect(0, 0, width, height);

    for (const n of notes) {
      const end = n.time + n.duration;
      if (end < currentTime || n.time > currentTime + lookAhead) continue;
      const key = keyByMidi.get(n.midi);
      if (!key) continue;
      // y: el borde inferior de la nota llega a height justo cuando n.time == currentTime
      const yBottom = height - (n.time - currentTime) * pxPerSecond;
      const h = Math.max(6, n.duration * pxPerSecond);
      ctx.fillStyle = HAND_COLORS[n.hand];
      ctx.beginPath();
      ctx.roundRect(key.x + 1, yBottom - h, key.w - 2, h, 4);
      ctx.fill();
    }
    // línea de "ahora"
    ctx.fillStyle = '#ffffff44';
    ctx.fillRect(0, height - 2, width, 2);
  }, [notes, currentTime, keyByMidi, width, height, lookAhead]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
}
```

- [ ] **Step 2: Verificación visual provisional**

En `src/App.tsx`, encima del `<Keyboard …/>` de la Task 7, añadir un `<NoteFall/>` con notas de prueba y un estado `currentTime` que avance con `requestAnimationFrame`:

```tsx
import { useEffect, useState } from 'react';
import NoteFall from './components/NoteFall';
import Keyboard from './components/Keyboard';
import type { SongNote } from './core/types';

const demo: SongNote[] = [60, 62, 64, 65, 67, 69, 71, 72].map((midi, i) =>
  ({ midi, time: i * 0.6, duration: 0.5, hand: i % 2 ? 'left' : 'right' }));

export default function App() {
  const [t, setT] = useState(-4);
  useEffect(() => {
    let raf = 0; let last = performance.now();
    const loop = (now: number) => {
      setT(v => v + (now - last) / 1000); last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div>
      <NoteFall notes={demo} currentTime={t} loMidi={48} hiMidi={83} width={800} height={300} />
      <Keyboard loMidi={48} hiMidi={83} width={800} height={140}
        pressed={new Set()} expected={new Set()} onKey={() => {}} />
    </div>
  );
}
```

Run: `npm run dev`
Expected: notas azules y verdes caen alineadas con sus teclas y cruzan la línea blanca.

- [ ] **Step 3: Commit**

```bash
git add src && git commit -m "feat: cascada de notas en canvas alineada con el teclado"
```

---

### Task 9: Entrada MIDI y teclado de ordenador

**Files:**
- Create: `src/input/useMidiInput.ts`, `src/input/useComputerKeys.ts`

- [ ] **Step 1: Implementar `src/input/useMidiInput.ts`**

```ts
import { useEffect, useState } from 'react';

export type KeyHandler = (midi: number, down: boolean) => void;

/**
 * Conecta con Web MIDI. Devuelve el nombre del dispositivo conectado,
 * null si no hay ninguno, o 'unsupported' si el navegador no soporta Web MIDI.
 */
export function useMidiInput(onKey: KeyHandler): string | null | 'unsupported' {
  const [device, setDevice] = useState<string | null | 'unsupported'>(null);

  useEffect(() => {
    if (!('requestMIDIAccess' in navigator)) {
      setDevice('unsupported');
      return;
    }
    let cancelled = false;
    let access: MIDIAccess | undefined;

    const attach = () => {
      if (!access || cancelled) return;
      let name: string | null = null;
      for (const input of access.inputs.values()) {
        name = input.name ?? 'Dispositivo MIDI';
        input.onmidimessage = (e: MIDIMessageEvent) => {
          if (!e.data) return;
          const [status, note, velocity] = e.data;
          const cmd = status & 0xf0;
          if (cmd === 0x90 && velocity > 0) onKey(note, true);
          else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) onKey(note, false);
        };
      }
      setDevice(name);
    };

    navigator.requestMIDIAccess().then(a => {
      access = a;
      attach();
      a.onstatechange = attach;
    }).catch(() => setDevice('unsupported'));

    return () => { cancelled = true; };
  }, [onKey]);

  return device;
}
```

- [ ] **Step 2: Implementar `src/input/useComputerKeys.ts`**

Fila central del teclado = teclas blancas desde Do4; fila superior = negras (disposición tipo DAW).

```ts
import { useEffect } from 'react';
import type { KeyHandler } from './useMidiInput';

const KEY_TO_MIDI: Record<string, number> = {
  a: 60, s: 62, d: 64, f: 65, g: 67, h: 69, j: 71, k: 72, l: 74,
  w: 61, e: 63, t: 66, y: 68, u: 70, o: 73, p: 75,
};

export function useComputerKeys(onKey: KeyHandler): void {
  useEffect(() => {
    const held = new Set<string>();
    const down = (e: KeyboardEvent) => {
      const midi = KEY_TO_MIDI[e.key.toLowerCase()];
      if (midi === undefined || held.has(e.key) || e.repeat) return;
      held.add(e.key);
      onKey(midi, true);
    };
    const up = (e: KeyboardEvent) => {
      const midi = KEY_TO_MIDI[e.key.toLowerCase()];
      if (midi === undefined) return;
      held.delete(e.key);
      onKey(midi, false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [onKey]);
}
```

- [ ] **Step 3: Verificar compilación**

Run: `npm run build`
Expected: sin errores de tipos (los tipos `MIDIAccess`/`MIDIMessageEvent` vienen en `lib.dom`).

- [ ] **Step 4: Commit**

```bash
git add src/input && git commit -m "feat: entrada por Web MIDI y por teclado de ordenador"
```

---

### Task 10: Sonido de piano (smplr)

**Files:**
- Create: `src/audio/piano.ts`

- [ ] **Step 1: Implementar `src/audio/piano.ts`**

```ts
import { SplendidGrandPiano } from 'smplr';

let context: AudioContext | undefined;
let piano: SplendidGrandPiano | undefined;
let loading: Promise<void> | undefined;

/** Debe llamarse desde un gesto del usuario (los navegadores bloquean el audio si no). */
export function initPiano(): Promise<void> {
  if (!loading) {
    context = new AudioContext();
    piano = new SplendidGrandPiano(context);
    loading = piano.load.then(() => undefined);
  }
  context?.resume();
  return loading;
}

export function playNote(midi: number, durationSeconds = 1): void {
  piano?.start({ note: midi, velocity: 85, duration: durationSeconds });
}
```

- [ ] **Step 2: Verificación manual**

Añadir temporalmente en `src/App.tsx` un botón:
```tsx
<button onClick={async () => { const { initPiano, playNote } = await import('./audio/piano'); await initPiano(); playNote(60); }}>Probar sonido</button>
```
Run: `npm run dev`, pulsar el botón.
Expected: suena un Do de piano (requiere internet la primera vez: smplr descarga las muestras y las cachea).

Retirar el botón tras comprobar.

- [ ] **Step 3: Commit**

```bash
git add src && git commit -m "feat: sonido de piano sampleado con smplr"
```

---

### Task 11: Pantalla de práctica

**Files:**
- Create: `src/screens/PracticeScreen.tsx`

- [ ] **Step 1: Implementar `src/screens/PracticeScreen.tsx`**

Une motor + cascada + teclado + entradas + sonido, con controles: reproducir/pausar, modo espera, mano, velocidad, salir. Diseño en columna que llena la pantalla (móvil horizontal).

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Keyboard from '../components/Keyboard';
import NoteFall from '../components/NoteFall';
import { PracticeEngine, type EngineConfig } from '../core/practiceEngine';
import { fitRange } from '../core/keyLayout';
import { initPiano, playNote } from '../audio/piano';
import { useMidiInput } from '../input/useMidiInput';
import { useComputerKeys } from '../input/useComputerKeys';
import type { Song } from '../core/types';

interface Props {
  song: Song;
  onExit: (score: number | null) => void; // score final o null si se sale sin acabar
}

export default function PracticeScreen({ song, onExit }: Props) {
  const [config, setConfig] = useState<EngineConfig>({ waitMode: true, speed: 1, hand: 'both' });
  const [running, setRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [pressed, setPressed] = useState(new Set<number>());
  const [expected, setExpected] = useState(new Set<number>());
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const engineRef = useRef<PracticeEngine>();

  const [loMidi, hiMidi] = useMemo(() => fitRange(song.notes), [song]);
  const practicedNotes = useMemo(
    () => config.hand === 'both' ? song.notes : song.notes.filter(n => n.hand === config.hand),
    [song, config.hand],
  );

  // (Re)crear el motor al cambiar la configuración
  useEffect(() => {
    engineRef.current = new PracticeEngine(song, config);
    setTime(0);
    setExpected(new Set());
    setRunning(false);
  }, [song, config]);

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Bucle de animación
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const engine = engineRef.current!;
      const dt = (now - last) / 1000;
      last = now;
      for (const n of engine.tick(dt)) playNote(n.midi, n.duration);
      setTime(engine.time);
      setExpected(new Set(engine.expectedNotes()));
      if (engine.finished) {
        setRunning(false);
        onExit(engine.score());
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, onExit]);

  const handleKey = useCallback((midi: number, down: boolean) => {
    setPressed(prev => {
      const next = new Set(prev);
      if (down) next.add(midi); else next.delete(midi);
      return next;
    });
    if (down) {
      const engine = engineRef.current;
      engine?.onKeyDown(midi);
      if (engine) setExpected(new Set(engine.expectedNotes()));
    }
  }, []);

  // Entradas: piano MIDI, teclado de ordenador y (vía <Keyboard/>) táctil
  const midiDevice = useMidiInput(handleKey);
  useComputerKeys(handleKey);
  // En táctil/teclado no hay piano real que suene: sonar nosotros
  const handleScreenKey = useCallback((midi: number, down: boolean) => {
    if (down) playNote(midi, 0.6);
    handleKey(midi, down);
  }, [handleKey]);

  const start = async () => {
    await initPiano();
    setRunning(true);
  };

  const keyboardH = Math.max(90, Math.round(size.h * 0.22));
  const barH = 52;
  const fallH = size.h - keyboardH - barH;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: barH, display: 'flex', gap: 8, alignItems: 'center', padding: '0 10px', flexWrap: 'nowrap', overflowX: 'auto' }}>
        <button onClick={() => onExit(null)}>← Salir</button>
        <strong style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</strong>
        <button onClick={running ? () => setRunning(false) : start}>{running ? '⏸ Pausa' : '▶ Tocar'}</button>
        <label><input type="checkbox" checked={config.waitMode}
          onChange={e => setConfig(c => ({ ...c, waitMode: e.target.checked }))} /> Espera</label>
        <select value={config.hand}
          onChange={e => setConfig(c => ({ ...c, hand: e.target.value as EngineConfig['hand'] }))}>
          <option value="both">Ambas manos</option>
          <option value="right">Mano derecha</option>
          <option value="left">Mano izquierda</option>
        </select>
        <select value={config.speed}
          onChange={e => setConfig(c => ({ ...c, speed: Number(e.target.value) }))}>
          <option value={0.25}>25%</option><option value={0.5}>50%</option>
          <option value={0.75}>75%</option><option value={1}>100%</option>
        </select>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {midiDevice === 'unsupported' ? 'Sin MIDI (usa pantalla)' : midiDevice ?? 'Piano no conectado'}
        </span>
      </div>
      <NoteFall notes={practicedNotes} currentTime={time}
        loMidi={loMidi} hiMidi={hiMidi} width={size.w} height={fallH} />
      <Keyboard loMidi={loMidi} hiMidi={hiMidi} width={size.w} height={keyboardH}
        pressed={pressed} expected={expected} onKey={handleScreenKey} />
    </div>
  );
}
```

- [ ] **Step 2: Verificación manual con canción de prueba**

Sustituir `src/App.tsx` temporalmente:

```tsx
import PracticeScreen from './screens/PracticeScreen';
import type { Song, SongNote } from './core/types';

const notes: SongNote[] = [60, 60, 67, 67, 69, 69, 67].map((midi, i) =>
  ({ midi, time: i * 0.5, duration: 0.45, hand: 'right' }));
const demo: Song = { id: 'demo', title: 'Demo', notes, duration: 3.5, difficulty: 1, bestScore: null };

export default function App() {
  return <PracticeScreen song={demo} onExit={s => alert(s === null ? 'Salida' : `Puntuación: ${s}%`)} />;
}
```

Run: `npm run dev`
Expected: al pulsar "▶ Tocar" las notas caen; en modo espera la primera se detiene en la línea hasta hacer clic en la tecla azul (o pulsar `a` en el teclado del ordenador); al completar la canción aparece la puntuación.

- [ ] **Step 3: Commit**

```bash
git add src && git commit -m "feat: pantalla de práctica completa (motor + UI + entradas + sonido)"
```

---

### Task 12: Persistencia y biblioteca

**Files:**
- Create: `src/storage/songStore.ts`, `src/screens/LibraryScreen.tsx`
- Modify: `src/App.tsx` (versión definitiva)
- Test: `src/storage/songStore.test.ts`

- [ ] **Step 1: Escribir el test que falla — `src/storage/songStore.test.ts`**

`idb-keyval` no funciona en Node, así que el store recibe su backend inyectado y en tests se usa un `Map`:

```ts
import { describe, it, expect } from 'vitest';
import { createSongStore, type KV } from './songStore';
import type { Song } from '../core/types';

function memoryKV(): KV {
  const m = new Map<string, unknown>();
  return {
    get: async k => m.get(k),
    set: async (k, v) => { m.set(k, v); },
  };
}

const song = (id: string): Song =>
  ({ id, title: id, notes: [{ midi: 60, time: 0, duration: 1, hand: 'right' }], duration: 1, difficulty: 1, bestScore: null });

describe('songStore', () => {
  it('guarda, lista y borra canciones', async () => {
    const store = createSongStore(memoryKV());
    await store.add(song('a'));
    await store.add(song('b'));
    expect((await store.list()).map(s => s.id)).toEqual(['a', 'b']);
    await store.remove('a');
    expect((await store.list()).map(s => s.id)).toEqual(['b']);
  });

  it('actualiza la mejor puntuación solo si mejora', async () => {
    const store = createSongStore(memoryKV());
    await store.add(song('a'));
    await store.recordScore('a', 70);
    await store.recordScore('a', 50); // peor: no debe pisar
    expect((await store.list())[0].bestScore).toBe(70);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/storage/songStore.test.ts`
Expected: FAIL — módulo `./songStore` no existe.

- [ ] **Step 3: Implementar `src/storage/songStore.ts`**

```ts
import { get, set } from 'idb-keyval';
import type { Song } from '../core/types';

export interface KV {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

const KEY = 'songs-v1';

export function createSongStore(kv: KV = { get, set }) {
  const read = async (): Promise<Song[]> => ((await kv.get(KEY)) as Song[] | undefined) ?? [];
  const write = (songs: Song[]) => kv.set(KEY, songs);

  return {
    list: read,
    async add(song: Song): Promise<void> {
      await write([...(await read()), song]);
    },
    async remove(id: string): Promise<void> {
      await write((await read()).filter(s => s.id !== id));
    },
    async recordScore(id: string, score: number): Promise<void> {
      await write((await read()).map(s =>
        s.id === id && (s.bestScore === null || score > s.bestScore)
          ? { ...s, bestScore: score } : s,
      ));
    },
  };
}

export type SongStore = ReturnType<typeof createSongStore>;
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/storage/songStore.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implementar `src/screens/LibraryScreen.tsx`**

```tsx
import { useRef, useState } from 'react';
import { parseMidi } from '../core/parseMidi';
import type { Song } from '../core/types';

interface Props {
  songs: Song[];
  onAdd: (song: Song) => void;
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
        onAdd(parseMidi(await file.arrayBuffer(), file.name.replace(/\.midi?$/i, '')));
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
          <button onClick={() => onOpen(s)}>Practicar</button>
          <button onClick={() => { if (confirm(`¿Borrar "${s.title}"?`)) onRemove(s.id); }}>🗑</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: `src/App.tsx` definitivo (navegación + store)**

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import LibraryScreen from './screens/LibraryScreen';
import PracticeScreen from './screens/PracticeScreen';
import { createSongStore } from './storage/songStore';
import type { Song } from './core/types';

export default function App() {
  const store = useMemo(() => createSongStore(), []);
  const [songs, setSongs] = useState<Song[]>([]);
  const [current, setCurrent] = useState<Song | null>(null);

  useEffect(() => { store.list().then(setSongs); }, [store]);

  const refresh = useCallback(() => store.list().then(setSongs), [store]);

  if (current) {
    return (
      <PracticeScreen
        song={current}
        onExit={async score => {
          if (score !== null) await store.recordScore(current.id, score);
          setCurrent(null);
          refresh();
        }}
      />
    );
  }
  return (
    <LibraryScreen
      songs={songs}
      onAdd={async s => { await store.add(s); refresh(); }}
      onRemove={async id => { await store.remove(id); refresh(); }}
      onOpen={setCurrent}
    />
  );
}
```

- [ ] **Step 7: Verificación manual del flujo completo**

Run: `npm run dev`
Expected: biblioteca vacía → descargar cualquier `.mid` de prueba (o usar los de la Task 13) → arrastrarlo → aparece con dificultad → "Practicar" → funciona el modo espera → al terminar, la puntuación queda guardada y sobrevive a recargar la página.

- [ ] **Step 8: Commit**

```bash
git add src && git commit -m "feat: biblioteca con importación de .mid y persistencia en IndexedDB"
```

---

### Task 13: Canciones incluidas de fábrica

**Files:**
- Create: `scripts/makeSongs.mjs`, `public/songs/index.json` (generado), `public/songs/*.mid` (generados)
- Modify: `src/App.tsx`

- [ ] **Step 1: Crear `scripts/makeSongs.mjs`**

Genera MIDIs de melodías populares de dominio público, con mano izquierda simple, y un índice:

```js
import { Midi } from '@tonejs/midi';
import { mkdirSync, writeFileSync } from 'node:fs';

// [midi, beats] — negra = 1 beat, 100 bpm
const SONGS = [
  {
    file: 'estrellita.mid', title: 'Estrellita (Twinkle Twinkle)',
    right: [[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],[65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2]],
    left:  [[48,2],[52,2],[53,2],[48,2],[53,2],[48,2],[55,2],[48,2]],
  },
  {
    file: 'himno-alegria.mid', title: 'Himno de la Alegría (Beethoven)',
    right: [[64,1],[64,1],[65,1],[67,1],[67,1],[65,1],[64,1],[62,1],[60,1],[60,1],[62,1],[64,1],[64,1.5],[62,0.5],[62,2]],
    left:  [[48,2],[55,2],[52,2],[55,2],[48,2],[55,2],[43,2],[48,2]],
  },
  {
    file: 'cumpleanos.mid', title: 'Cumpleaños Feliz',
    right: [[60,0.75],[60,0.25],[62,1],[60,1],[65,1],[64,2],[60,0.75],[60,0.25],[62,1],[60,1],[67,1],[65,2]],
    left:  [[48,3],[43,3],[48,3],[41,2],[43,2],[48,2]],
  },
];

const SECONDS_PER_BEAT = 60 / 100;
mkdirSync('public/songs', { recursive: true });

for (const s of SONGS) {
  const midi = new Midi();
  midi.header.setTempo(100);
  for (const [name, seq] of [['right', s.right], ['left', s.left]]) {
    const track = midi.addTrack();
    track.name = name;
    let t = 0;
    for (const [note, beats] of seq) {
      track.addNote({ midi: note, time: t, duration: beats * SECONDS_PER_BEAT * 0.9 });
      t += beats * SECONDS_PER_BEAT;
    }
  }
  writeFileSync(`public/songs/${s.file}`, Buffer.from(midi.toArray()));
}
writeFileSync('public/songs/index.json',
  JSON.stringify(SONGS.map(s => ({ file: s.file, title: s.title })), null, 2));
console.log(`Generadas ${SONGS.length} canciones en public/songs/`);
```

- [ ] **Step 2: Generar y verificar**

Run: `npm run songs && ls public/songs`
Expected: `cumpleanos.mid  estrellita.mid  himno-alegria.mid  index.json`

- [ ] **Step 3: Cargar las incluidas al primer arranque — modificar `src/App.tsx`**

En el `useEffect` inicial, si el store está vacío, importar las de `public/songs/`. Sustituir la línea `useEffect(() => { store.list().then(setSongs); }, [store]);` por:

```tsx
useEffect(() => {
  (async () => {
    let list = await store.list();
    if (list.length === 0) {
      try {
        const index: { file: string; title: string }[] =
          await (await fetch('songs/index.json')).json();
        const { parseMidi } = await import('./core/parseMidi');
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
```

(El import de `parseMidi` es dinámico solo para dejar claro que únicamente se usa en la primera carga; un import normal arriba también vale.)

- [ ] **Step 4: Verificación manual**

Borrar los datos del sitio en el navegador (DevTools → Application → Clear site data) y recargar.
Expected: la biblioteca aparece con las 3 canciones incluidas, cada una practicable con dos manos.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: canciones de dominio público incluidas de fábrica"
```

---

### Task 14: Verificación final

- [ ] **Step 1: Suite completa y build**

Run: `npm test && npm run build`
Expected: todos los tests PASS y build sin errores.

- [ ] **Step 2: Prueba end-to-end en el ordenador**

Run: `npm run dev`
Checklist manual:
- Importar un `.mid` descargado de internet → aparece en la biblioteca.
- Practicar con modo espera + mano derecha al 50% → la izquierda suena sola, la derecha espera.
- Terminar → la puntuación se guarda y se ve en la biblioteca.
- Un archivo no-MIDI (renombrar un .txt a .mid) → muestra error, no rompe nada.

- [ ] **Step 3: Prueba desde el iPhone en red local**

Run: `npm run dev -- --host`
En el iPhone (misma WiFi), abrir `http://<IP-del-ordenador>:5173` — para MIDI usar la app "Web MIDI Browser"; en Safari todo funciona salvo el piano físico (se practica con la pantalla táctil).
Expected: interfaz usable en horizontal; teclas táctiles responden; el aviso "Sin MIDI (usa pantalla)" aparece en Safari.

- [ ] **Step 4: Commit final**

```bash
git add -A && git commit -m "chore: verificación final Fase 1"
```

---

## Queda para la Fase 2 (plan aparte)

Partitura sincronizada (VexFlow), ejercicios de calentamiento, repetir sección (bucle entre compases), reasignación manual de manos, pausa automática al desconectarse el piano MIDI en plena práctica, despliegue en GitHub Pages y PWA offline. Ver spec, sección "Fases de construcción".
