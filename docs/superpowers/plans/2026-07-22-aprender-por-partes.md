# Aprender por partes — Plan de implementación (Fase 8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La puerta "Aprender" trocea la canción en fragmentos cortos con progreso propio; una franja de colores sustituye a la barra de tiempo para saltar/repetir cada fragmento; al dominar uno (≥80% en una vuelta) se sugiere subir velocidad; "toda seguida" nunca queda bloqueada.

**Architecture:** `splitIntoFragments` (puro, TDD) trocea usando los onsets de `groupNotes` — sin depender de compás. `fragmentStore` (mismo patrón KV que `prefsStore`) guarda el mejor score por fragmento. `FragmentBar` (presentacional) sustituye a `TimeBar` solo en la puerta "Aprender" con más de un fragmento. El motor de práctica **no cambia**: todo se construye sobre `setLoop`/`seek`/`clearLoop`, que ya existen. La puntuación por vuelta se calcula en `PracticeScreen` observando los mismos resultados de `onKeyDown` que ya se inspeccionan hoy, reseteados en el punto donde el bucle ya detecta el "wrap" (Fase 4).

**Spec:** `docs/superpowers/specs/2026-07-22-aprender-por-partes-design.md` — leerlo antes de empezar.

**Regla de oro:** 119 tests actuales verdes; `practiceEngine.ts` no se toca (solo se usan `setLoop`/`seek`/`clearLoop`/`skipPending` ya existentes); ninguna otra puerta (Escuchar/Seguir/Tocar) ni Teoría cambian de comportamiento.

## Decisiones de la implementación (más allá del spec, para que no queden ambiguas)

- `FragmentBar` es solo la franja de segmentos (una fila), del mismo alto que `TimeBar`, en su mismo hueco de la barra superior. El texto "Fragmento N de M..." vive en una fila fina aparte, debajo de la barra superior y encima de `CoachBar` — así `CoachBar` sigue libre para los avisos de nota a nota, que son más importantes momento a momento.
- Al tocar un fragmento se reutiliza el `loop` (estado ya existente) — así el aviso "🔁 Otra vez desde A" y toda la lógica de aplicar el bucle al motor no se duplican. Lo único nuevo es: qué UI se muestra (franja de fragmentos en vez del botón 🔁 + `LoopBar` manual) y el cálculo de puntuación por vuelta.
- El botón manual "🔁 Bucle" + `LoopBar` (arrastrar a mano) se ocultan **solo** cuando se muestra `FragmentBar` (puerta "Aprender", sin micrófono, canción con más de un fragmento). En cualquier otro caso (otras puertas, modo micrófono, o canción corta sin trocear) todo sigue exactamente igual que hoy.
- `fragmentStore` vive directamente en `PracticeScreen` (no en `App`, a diferencia de `songStore`/`prefsStore`): el progreso por fragmento no se usa en ninguna otra pantalla (a diferencia del mejor score de la canción, que sí aparece en la biblioteca), así que no hace falta subirlo a `App`.
- Umbral de "fragmento dominado": 80%, igual que el verde de la barra de progreso en `LibraryScreen`.
- Subida de velocidad sugerida: `+15 puntos porcentuales` redondeado al múltiplo de 5 más cercano, tope 100 (coherente con el `step={5}` del control de velocidad).

---

### Task 1: `splitIntoFragments` (TDD)

**Files:** Create `src/core/fragments.ts`, `src/core/fragments.test.ts`

- [ ] **Step 1: Test que falla — `src/core/fragments.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { splitIntoFragments } from './fragments';
import type { Song, SongNote } from './types';

const note = (midi: number, time: number): SongNote => ({ midi, time, duration: 0.4, hand: 'right' });

function song(notes: SongNote[], duration: number): Song {
  return { id: 's', title: 's', notes, duration, difficulty: 1, bestScore: null };
}

describe('splitIntoFragments', () => {
  it('canciones cortas (menos de 20s) no se trocean', () => {
    const notes = Array.from({ length: 10 }, (_, i) => note(60 + i, i * 1.5));
    const s = song(notes, 15);
    const frags = splitIntoFragments(s);
    expect(frags).toEqual([{ index: 0, start: 0, end: 15 }]);
  });

  it('canción larga: varios fragmentos, contiguos, cubren toda la duración', () => {
    const notes = Array.from({ length: 60 }, (_, i) => note(60 + (i % 12), i * 1));
    const s = song(notes, 60);
    const frags = splitIntoFragments(s);
    expect(frags.length).toBeGreaterThan(1);
    expect(frags[0].start).toBe(0);
    expect(frags[frags.length - 1].end).toBe(60);
    for (let i = 0; i < frags.length - 1; i++) {
      expect(frags[i].end).toBe(frags[i + 1].start);
    }
  });

  it('los límites internos caen exactamente en el inicio de alguna nota (nunca a mitad de silencio)', () => {
    const notes = Array.from({ length: 60 }, (_, i) => note(60 + (i % 12), i * 1));
    const s = song(notes, 60);
    const frags = splitIntoFragments(s);
    const onsets = new Set(notes.map(n => n.time));
    for (let i = 1; i < frags.length; i++) {
      expect(onsets.has(frags[i].start)).toBe(true);
    }
  });

  it('los índices son 0..N-1 en orden', () => {
    const notes = Array.from({ length: 60 }, (_, i) => note(60 + (i % 12), i * 1));
    const s = song(notes, 60);
    const frags = splitIntoFragments(s);
    frags.forEach((f, i) => expect(f.index).toBe(i));
  });

  it('canción sin notas no revienta: un solo fragmento', () => {
    const s = song([], 40);
    expect(splitIntoFragments(s)).toEqual([{ index: 0, start: 0, end: 40 }]);
  });
});
```

- [ ] **Step 2:** `npx vitest run src/core/fragments.test.ts` → FAIL (módulo no existe).

- [ ] **Step 3: Implementar `src/core/fragments.ts`**

```ts
import { groupNotes } from './groupNotes';
import type { Song } from './types';

export interface Fragment {
  index: number;
  start: number;
  end: number;
}

const TARGET_FRAGMENT_SECONDS = 11;
const MIN_SONG_DURATION_TO_SPLIT = 20;
const MIN_BOUNDARY_GAP = 2; // separación mínima entre límites, evita fragmentos degenerados

/**
 * Trocea una canción en fragmentos cortos (~11s) para practicar por partes.
 * No depende del compás (robusto para cualquier tiempo, incluidos los valses
 * en 3/4 del catálogo): los límites internos se ajustan al inicio de la nota
 * más cercana, para no cortar nunca a mitad de un silencio o de un acorde.
 * Canciones cortas (< 20s) o sin notas devuelven un único fragmento.
 */
export function splitIntoFragments(song: Song): Fragment[] {
  if (song.duration < MIN_SONG_DURATION_TO_SPLIT || song.notes.length === 0) {
    return [{ index: 0, start: 0, end: song.duration }];
  }

  const onsets = groupNotes(song.notes).map(g => g.time);
  const targetCount = Math.max(1, Math.round(song.duration / TARGET_FRAGMENT_SECONDS));
  const boundaries: number[] = [0];

  for (let i = 1; i < targetCount; i++) {
    const targetTime = (song.duration / targetCount) * i;
    let nearest = onsets[0];
    let bestDist = Math.abs(onsets[0] - targetTime);
    for (const t of onsets) {
      const d = Math.abs(t - targetTime);
      if (d < bestDist) { bestDist = d; nearest = t; }
    }
    if (nearest > boundaries[boundaries.length - 1] + MIN_BOUNDARY_GAP) {
      boundaries.push(nearest);
    }
  }
  boundaries.push(song.duration);

  const fragments: Fragment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    fragments.push({ index: i, start: boundaries[i], end: boundaries[i + 1] });
  }
  return fragments.length > 0 ? fragments : [{ index: 0, start: 0, end: song.duration }];
}
```

- [ ] **Step 4:** `npx vitest run src/core/fragments.test.ts` → PASS (5 tests). **Step 5: Commit** — `git add src/core/fragments* && git commit -m "feat: troceado de canciones en fragmentos cortos para practicar por partes"`

---

### Task 2: `fragmentStore` (TDD)

**Files:** Create `src/storage/fragmentStore.ts`, `src/storage/fragmentStore.test.ts`

- [ ] **Step 1: Test que falla — `src/storage/fragmentStore.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { createFragmentStore, type KV } from './fragmentStore';

function memoryKV(): KV {
  const m = new Map<string, unknown>();
  return { get: async k => m.get(k), set: async (k, v) => { m.set(k, v); } };
}

describe('fragmentStore', () => {
  it('sin datos previos, la lista de una canción está vacía', async () => {
    const store = createFragmentStore(memoryKV());
    expect(await store.getFragmentScores('song-a')).toEqual({});
  });

  it('guarda el score por fragmento y por canción, separados', async () => {
    const store = createFragmentStore(memoryKV());
    await store.recordFragmentScore('song-a', 0, 90);
    await store.recordFragmentScore('song-a', 1, 70);
    await store.recordFragmentScore('song-b', 0, 60);
    expect(await store.getFragmentScores('song-a')).toEqual({ 0: 90, 1: 70 });
    expect(await store.getFragmentScores('song-b')).toEqual({ 0: 60 });
  });

  it('solo sube el score si mejora (igual que songStore.recordScore)', async () => {
    const store = createFragmentStore(memoryKV());
    await store.recordFragmentScore('song-a', 0, 90);
    await store.recordFragmentScore('song-a', 0, 60);
    expect(await store.getFragmentScores('song-a')).toEqual({ 0: 90 });
  });
});
```

- [ ] **Step 2:** correr → FAIL. **Step 3: Implementar `src/storage/fragmentStore.ts`**

```ts
import { get, set } from 'idb-keyval';

export interface KV {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

const KEY = 'fragments-v1';
type ScoresBySong = Record<string, Record<number, number>>;

export function createFragmentStore(kv: KV = { get, set }) {
  const readAll = async (): Promise<ScoresBySong> =>
    ((await kv.get(KEY)) as ScoresBySong | undefined) ?? {};
  return {
    async getFragmentScores(songId: string): Promise<Record<number, number>> {
      return (await readAll())[songId] ?? {};
    },
    async recordFragmentScore(songId: string, fragmentIndex: number, score: number): Promise<void> {
      const all = await readAll();
      const forSong = all[songId] ?? {};
      const prev = forSong[fragmentIndex];
      if (prev !== undefined && score <= prev) return;
      await kv.set(KEY, { ...all, [songId]: { ...forSong, [fragmentIndex]: score } });
    },
  };
}

export type FragmentStore = ReturnType<typeof createFragmentStore>;
```

- [ ] **Step 4:** `npm test` → 127/127 (119 + 5 + 3). **Step 5: Commit** — `git add src/storage/fragmentStore* && git commit -m "feat: fragmentStore — mejor puntuación por fragmento de canción"`

---

### Task 3: `FragmentBar` (presentacional)

**Files:** Create `src/components/FragmentBar.tsx`

- [ ] **Step 1:**

```tsx
import type { Fragment } from '../core/fragments';

interface Props {
  fragments: Fragment[];
  activeIndex: number | null;
  masteredScores: Record<number, number>;
  onSelect: (fragment: Fragment) => void;
}

const MASTERY_THRESHOLD = 80;

/** Franja de fragmentos: verde=dominado, naranja=activo, gris=pendiente. Tocar uno salta y lo pone en bucle. */
export default function FragmentBar({ fragments, activeIndex, masteredScores, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0, height: 20 }}>
      {fragments.map(f => {
        const mastered = (masteredScores[f.index] ?? 0) >= MASTERY_THRESHOLD;
        const isActive = activeIndex === f.index;
        const bg = isActive ? 'var(--right-soft)' : mastered ? 'var(--left-soft)' : 'var(--bg-chip)';
        const border = isActive ? '2px solid var(--right)' : mastered ? '1px solid var(--left)' : '1px solid var(--border)';
        return (
          <button
            key={f.index}
            onClick={() => onSelect(f)}
            style={{
              flex: Math.max(0.3, f.end - f.start),
              minWidth: 6, height: 20, padding: 0,
              background: bg, border, borderRadius: 4,
              cursor: 'pointer',
            }}
            aria-label={`Fragmento ${f.index + 1} de ${fragments.length}${mastered ? ' (dominado)' : ''}`}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2:** `npm run build` limpio (aún no se usa; TS lo compila por el include). **Step 3: Commit** — `git add src/components/FragmentBar.tsx && git commit -m "feat(ui): franja de fragmentos para el modo Aprender"`

---

### Task 4: Integración en `PracticeScreen`

**Files:** Modify `src/screens/PracticeScreen.tsx`

Partiendo del archivo actual (ya con metrónomo/volumen/bucle/settings de fases anteriores), aplicar estos cambios EXACTOS, conservando todo lo no mencionado:

- [ ] **Step 1: Imports** — añadir junto a los existentes:

```tsx
import FragmentBar from '../components/FragmentBar';
import { splitIntoFragments, type Fragment } from '../core/fragments';
import { createFragmentStore } from '../storage/fragmentStore';
```

- [ ] **Step 2: Estado y refs nuevos** — insertar inmediatamente después de la línea ya existente `const effectiveSong = useMemo(() => simplifySong(song, level), [song, level]);` (no antes: `fragments` depende de `effectiveSong`):

```tsx
  const fragmentStore = useMemo(() => createFragmentStore(), []);
  const fragments = useMemo(() => splitIntoFragments(effectiveSong), [effectiveSong]);
  const showFragmentBar = initialConfig.door === 'learn' && !micMode && fragments.length > 1;
  const [activeFragmentIndex, setActiveFragmentIndex] = useState<number | null>(null);
  const activeFragmentIndexRef = useRef<number | null>(null);
  const [fragmentScores, setFragmentScores] = useState<Record<number, number>>({});
  const [tempoBump, setTempoBump] = useState<number | null>(null); // % sugerido, o null
  const lapCorrectRef = useRef(0);
  const lapWrongRef = useRef(0);
```

- [ ] **Step 3: Cargar y refrescar puntuaciones de fragmento** — añadir tras el bloque anterior:

```tsx
  const refreshFragmentScores = useCallback(() => {
    fragmentStore.getFragmentScores(song.id).then(setFragmentScores);
  }, [fragmentStore, song.id]);
  useEffect(() => { refreshFragmentScores(); }, [refreshFragmentScores]);
```

- [ ] **Step 4: Resetear estado de fragmentos al recrear el motor** — en el `useEffect` existente que empieza en `engineRef.current = new PracticeEngine(...)` (el que ya resetea `streak`/`maxStreak`/`ended`), añadir estas líneas junto a las demás llamadas `set...(...)`:

```tsx
    setActiveFragmentIndex(null);
    activeFragmentIndexRef.current = null;
    setTempoBump(null);
    lapCorrectRef.current = 0;
    lapWrongRef.current = 0;
```

- [ ] **Step 5: Contar aciertos/fallos de la vuelta actual** — en `handleKey`, dentro de los bloques `if (result === 'correct') {` y `} else if (result === 'wrong') {`, añadir una línea a cada uno (junto al resto de lo que ya hacen):

```tsx
      if (result === 'correct') {
        showFeedback('✓ ¡Correcto! Sigue así');
        setStreak(s => { const n = s + 1; setMaxStreak(m => Math.max(m, n)); return n; });
        lapCorrectRef.current += 1;
      } else if (result === 'wrong') {
        setWrong(prev => new Set(prev).add(midi));
        showFeedback('✗ Esa nota no es — inténtalo otra vez');
        setStreak(0);
        lapWrongRef.current += 1;
        window.setTimeout(() => setWrong(prev => {
          if (!prev.has(midi)) return prev;
          const next = new Set(prev); next.delete(midi); return next;
        }), 400);
      }
```

(Solo se añaden `lapCorrectRef.current += 1;` y `lapWrongRef.current += 1;`; el resto del bloque queda igual que hoy. `handleMicNote` NO se toca — el modo micrófono nunca muestra `FragmentBar`.)

- [ ] **Step 6: Detectar fin de vuelta y evaluar dominio** — dentro del bucle `requestAnimationFrame` (la función `loop` interna del gran `useEffect` que empieza en `if (!running) return;`), sustituir la línea:

```tsx
      if (engine.time < lastTimeRef.current - 0.5 && loopRef.current) showFeedback('🔁 Otra vez desde A', 1200);
```

por:

```tsx
      if (engine.time < lastTimeRef.current - 0.5 && loopRef.current) {
        showFeedback('🔁 Otra vez desde A', 1200);
        if (activeFragmentIndexRef.current !== null) {
          const lapTotal = lapCorrectRef.current + lapWrongRef.current;
          if (lapTotal > 0) {
            const lapScore = Math.round(100 * lapCorrectRef.current / lapTotal);
            if (lapScore >= 80) {
              fragmentStore.recordFragmentScore(song.id, activeFragmentIndexRef.current, lapScore)
                .then(refreshFragmentScores);
              const nextSpeed = Math.min(100, Math.round((speedRef.current * 100 + 15) / 5) * 5);
              if (nextSpeed > Math.round(speedRef.current * 100)) setTempoBump(nextSpeed);
            }
          }
          lapCorrectRef.current = 0;
          lapWrongRef.current = 0;
        }
      }
```

Y añadir `fragmentStore` y `refreshFragmentScores` a las dependencias de ese `useEffect` (su array de deps termina en `..., metronome, song.bpm, reportProgress]);` — añadir `, fragmentStore, refreshFragmentScores` antes del `]`).

- [ ] **Step 7: Seleccionar y limpiar fragmento** — añadir tras `start`/`beginAfterCountdown` (antes de la definición de `coach`):

```tsx
  const selectFragment = useCallback((f: Fragment) => {
    engineRef.current?.seek(f.start);
    setTime(f.start);
    lastTimeRef.current = f.start;
    setActiveFragmentIndex(f.index);
    activeFragmentIndexRef.current = f.index;
    setTempoBump(null);
    lapCorrectRef.current = 0;
    lapWrongRef.current = 0;
    setLoopState({ start: f.start, end: f.end });
    syncExpected();
  }, [syncExpected]);

  const clearFragment = useCallback(() => {
    setActiveFragmentIndex(null);
    activeFragmentIndexRef.current = null;
    setTempoBump(null);
    setLoopState(null);
  }, []);

  const acceptTempoBump = useCallback(() => {
    if (tempoBump === null) return;
    setSpeedState(tempoBump / 100);
    setTempoBump(null);
  }, [tempoBump]);
```

- [ ] **Step 8: Aviso de fragmento dominado tiene prioridad en la entrenadora** — en la función `coach` (la que empieza `const coach: {...} = (() => {`), justo después de la línea `if (audioError) return {...}` añadir:

```tsx
    if (tempoBump !== null) return { text: `🎉 ¡Fragmento dominado!`, tone: 'ok', chip };
```

- [ ] **Step 9: Botón de la sugerencia de velocidad** — en `coachAction` (justo antes de la definición actual), la sugerencia de velocidad tiene prioridad sobre las demás acciones. Sustituir:

```tsx
  const coachAction = micMode && guidedPhase === 'repeat'
    ? { label: 'Saltar →', onClick: () => { engineRef.current?.skipPending(); syncExpected(); syncGuidedHint(hasMidi, micMode, micReady); } }
    : (!micMode && !listenMode && !freeMode && !playAlongMode && running && expected.size > 0)
      ? { label: '🔊 ¿Cómo suena?', onClick: () => { [...expected].forEach((m, i) => window.setTimeout(() => playNote(m, 0.8), i * 300)); } }
      : null;
```

por:

```tsx
  const coachAction = tempoBump !== null
    ? { label: `¿Probar a ${tempoBump}%?`, onClick: acceptTempoBump }
    : micMode && guidedPhase === 'repeat'
      ? { label: 'Saltar →', onClick: () => { engineRef.current?.skipPending(); syncExpected(); syncGuidedHint(hasMidi, micMode, micReady); } }
      : (!micMode && !listenMode && !freeMode && !playAlongMode && running && expected.size > 0)
        ? { label: '🔊 ¿Cómo suena?', onClick: () => { [...expected].forEach((m, i) => window.setTimeout(() => playNote(m, 0.8), i * 300)); } }
        : null;
```

- [ ] **Step 10: Alturas del layout** — sustituir:

```tsx
  const keyboardH = Math.max(90, Math.round(size.h * 0.22));
  const barH = 48;
  const coachH = 46;
  const loopH = loop ? 56 : 0;
  const fallH = Math.max(0, size.h - keyboardH - barH - coachH - loopH);
```

por:

```tsx
  const keyboardH = Math.max(90, Math.round(size.h * 0.22));
  const barH = 48;
  const coachH = 46;
  const loopH = (loop && !showFragmentBar) ? 56 : 0;
  const fragmentCaptionH = showFragmentBar ? 18 : 0;
  const fallH = Math.max(0, size.h - keyboardH - barH - coachH - loopH - fragmentCaptionH);
```

- [ ] **Step 11: JSX — barra superior** — sustituir el bloque de `<TimeBar .../>` + botón `🔁 Bucle`:

```tsx
        <TimeBar time={time} duration={effectiveSong.duration} seekable={!micMode}
          onSeek={t => { engineRef.current?.seek(t); setTime(t); lastTimeRef.current = t; syncExpected(); prevBeatRef.current = -1; }} />
        {!micMode && (
          <button className="btn-ghost" style={{ fontSize: 16, flexShrink: 0, whiteSpace: 'nowrap' }}
            onClick={() => {
              if (loop) { setLoopState(null); return; }
              const engine = engineRef.current;
              const dur = effectiveSong.duration;
              const a = Math.min(engine?.time ?? 0, Math.max(0, dur - 1));
              const b = Math.min(dur, a + 8);
              setLoopState({ start: a, end: b });
            }}>
            {loop ? '🔁✓' : '🔁 Bucle'}
          </button>
        )}
```

por:

```tsx
        {showFragmentBar ? (
          <FragmentBar fragments={fragments} activeIndex={activeFragmentIndex}
            masteredScores={fragmentScores} onSelect={selectFragment} />
        ) : (
          <TimeBar time={time} duration={effectiveSong.duration} seekable={!micMode}
            onSeek={t => { engineRef.current?.seek(t); setTime(t); lastTimeRef.current = t; syncExpected(); prevBeatRef.current = -1; }} />
        )}
        {!micMode && !showFragmentBar && (
          <button className="btn-ghost" style={{ fontSize: 16, flexShrink: 0, whiteSpace: 'nowrap' }}
            onClick={() => {
              if (loop) { setLoopState(null); return; }
              const engine = engineRef.current;
              const dur = effectiveSong.duration;
              const a = Math.min(engine?.time ?? 0, Math.max(0, dur - 1));
              const b = Math.min(dur, a + 8);
              setLoopState({ start: a, end: b });
            }}>
            {loop ? '🔁✓' : '🔁 Bucle'}
          </button>
        )}
```

- [ ] **Step 12: JSX — fila de leyenda del fragmento** — inmediatamente después del cierre `</div>` de la barra superior (justo antes de `<CoachBar .../>`), añadir:

```tsx
      {showFragmentBar && (
        <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 11, padding: '0 12px' }}>
          {activeFragmentIndex !== null
            ? <>Fragmento {activeFragmentIndex + 1} de {fragments.length} · <button
                style={{ fontSize: 11, padding: 0, background: 'transparent', border: 'none', color: 'var(--right)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                onClick={clearFragment}>🔗 tocar seguida</button></>
            : `${fragments.length} fragmentos · toca uno para saltar y repetirlo`}
        </div>
      )}
```

- [ ] **Step 13: JSX — ocultar `LoopBar` cuando hay franja de fragmentos** — la condición actual `{loop && (<LoopBar .../>)}` pasa a:

```tsx
      {loop && !showFragmentBar && (
        <LoopBar
          duration={effectiveSong.duration}
          start={loop.start} end={loop.end} currentTime={time}
          onChange={(s, e2) => setLoopState({ start: Math.max(0, s), end: Math.min(effectiveSong.duration, e2) })}
          onSetAHere={() => setLoopState(l => l && { start: Math.min(time, l.end - 1), end: l.end })}
          onSetBHere={() => setLoopState(l => l && { start: l.start, end: Math.max(time, l.start + 1) })}
          onClear={() => setLoopState(null)}
        />
      )}
```

- [ ] **Step 14: Verificar** — `npm test` (127/127) + `npm run build` limpio + `npm run dev` en segundo plano y `curl -k https://localhost:5173/` → 200.

- [ ] **Step 15: Commit** — `git add -A && git commit -m "feat(ui): Aprender por partes — franja de fragmentos, dominio y sugerencia de velocidad"`

---

### Task 5: Verificación final

- [ ] `npm test` → 127/127; `npm run build` limpio.
- [ ] Manual (`npm run dev`): abrir una canción larga (p. ej. "Blues del Corazón") en puerta Aprender con entrada pantalla/MIDI → aparece la franja de fragmentos en vez de la barra de tiempo normal; tocar un segmento salta ahí y se repite en bucle solo; completar una vuelta con buenos aciertos (≥80%) → el fragmento se pone verde y aparece "🎉 ¡Fragmento dominado! ¿Probar a X%?"; aceptar sube la velocidad sin reiniciar; "🔗 tocar seguida" quita el bucle y deja avanzar la canción entera normalmente; recargar y volver a la misma canción conserva los fragmentos verdes.
- [ ] Verificar que NO cambia nada en: Escuchar/Seguir/Tocar (siguen con `TimeBar` + botón 🔁 + `LoopBar` de siempre), modo micrófono dentro de Aprender (sigue igual, sin franja), canciones cortas en Aprender (menos de 20s, sin franja, comportamiento de siempre).
- [ ] iPhone apaisado: franja de fragmentos legible y tocable, texto de leyenda no se corta.
