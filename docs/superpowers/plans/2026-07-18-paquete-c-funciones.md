# Paquete C — funciones · Plan (Fase 8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Metrónomo, volumen, racha diaria, progreso en todos los modos, renombrar y borrado real.

**Spec:** `docs/superpowers/specs/2026-07-18-paquete-c-funciones-design.md` — leerlo entero; define claves de almacenamiento, defaults y comportamientos exactos.

**Regla de oro:** 100 tests verdes; `practiceEngine` intacto; nada de A/B se rompe.

---

### Task 1: Núcleo con TDD — bpm, streak, songStore ampliado

**Files:** Modify `src/core/parseMidi.ts` (+test), `src/core/types.ts`; Create `src/core/streak.ts` (+test); Modify `src/storage/songStore.ts` (+tests), `src/storage/prefsStore.ts` (+tests)

- [ ] **types**: `Song` gana `bpm?: number;` y `playedPct?: number;` (opcionales, tras `style`).
- [ ] **parseMidi** (TDD): test nuevo — construir un Midi con `header.setTempo(100)` y comprobar `song.bpm === 100`; otro sin tempo explícito → 120 (el default de @tonejs/midi ya es 120: comprobar qué devuelve `header.tempos` vacío y usar `Math.round(midi.header.tempos[0]?.bpm ?? 120)`).
- [ ] **`src/core/streak.ts`** (TDD, puro):
```ts
/** Días consecutivos de práctica terminando hoy o ayer (racha viva). Fechas YYYY-MM-DD. */
export function computeStreak(dates: string[], today: string): number
```
Tests mínimos: [] → 0; [hoy] → 1; [ayer] → 1 (viva); [hace 2 días] → 0; [hoy, ayer, antier] → 3; duplicados y desorden tolerados; hueco corta la racha. Implementación: `const set = new Set(dates)`, empezar en `today` (si no está, en ayer; si tampoco, 0) y contar hacia atrás restando días con `Date`/UTC.
- [ ] **prefsStore** (TDD): `recordPracticeDay(date: string)` (añade si no está; recorta a los 60 más recientes) y `listPracticeDays(): Promise<string[]>`, clave `practice-days-v1`. Tests: registra, deduplica, recorta.
- [ ] **songStore** (TDD): tres capacidades nuevas con clave propia cada una —
  - `rename(id, title)`: guarda en `titles-v1` (mapa); `read()` aplica el override tras cargar catálogos/legacy (función `applyTitles` análoga a `applyScores`). Título vacío o solo espacios → no-op.
  - Borrado suave: en `remove()`, si el id NO es de fábrica y `removeFromDisk` devuelve false y tampoco estaba en legacy… simplificar: SIEMPRE que se borre un id no-fábrica, además de lo actual, añadirlo a `hidden-v1`; `read()` filtra ids de `hidden-v1` al final. (Idempotente; borra puntuación como ahora.)
  - `recordPlayed(id, pct)`: clave `played-v1` mapa id→máximo (clamp 0..100, redondeado); `read()` lo aplica como `playedPct` (análogo a scores).
  - Tests: rename aplica sobre legacy y sobrevive a `read()`; rename('x', '  ') no cambia; remove de id no-fábrica lo oculta de `list()` aunque "exista" (simular con legacy); recordPlayed guarda máximo (60 luego 40 → 60).
- [ ] `npm test` (≈110) + build. Commit: `feat: bpm del MIDI, racha diaria y songStore con renombrar/ocultar/progreso`

### Task 2: Audio — click y volumen

**Files:** Modify `src/audio/piano.ts`

- [ ] `playClick(accent = false)`: usar el `context` del módulo (si no existe aún, no-op). Oscilador + gain: frecuencia `accent ? 1400 : 1000`, `gain.gain.setValueAtTime(0.5, t0)` y `exponentialRampToValueAtTime(0.001, t0 + 0.06)`, `osc.start(t0); osc.stop(t0 + 0.07)`.
- [ ] `setVolume(pct: number)`: clamp 0..100. VERIFICAR la API real de smplr en `node_modules/smplr/dist/index.d.ts`: los instrumentos exponen `output` con `setVolume(0..127)` — si es así, mapear `Math.round(pct * 1.27)` y guardarlo para aplicarlo también cuando el piano termine de cargar (si `piano` aún no existe, recordar el valor en una variable y aplicarlo en `initPiano` tras crear el sampler). Si la API difiere, adaptar mínimamente (p. ej. GainNode intermedio) y documentarlo en el commit.
- [ ] Build limpio. Commit: `feat: click de metrónomo y control de volumen en el audio`

### Task 3: Práctica — metrónomo, volumen, progreso

**Files:** Modify `src/screens/PracticeScreen.tsx`, `src/components/SettingsSheet.tsx`, `src/App.tsx`

- [ ] **SettingsSheet**: props nuevas `metronome: boolean | null` (null = no mostrar), `onMetronome?`, `volume: number`, `onVolume?`. Filas: interruptor "Metrónomo 🥁" (encima de Sonido) y slider "Volumen 🔊" 0–100 (debajo de Velocidad, aplica al momento — nota en el texto final).
- [ ] **PracticeScreen**:
  - Props: `onProgress?: (pct: number) => void`.
  - Estado `const [metronome, setMetronome] = useState(false);` — pasa a ⚙ con `metronome={micMode ? null : metronome}`.
  - Volumen: prop `volume: number` y `onVolume` DESDE App (estado global): PracticeScreen solo lo enchufa a ⚙ y aplica `setVolume(volume)` en un efecto `[volume]`.
  - Click: en el rAF, tras `setTime(engine.time)`: con `const beatLen = 60 / (song.bpm ?? 120);` y una ref `prevBeatRef`, si `metronome && running`: `const b = Math.floor(engine.time / beatLen); if (b !== prevBeatRef.current) { prevBeatRef.current = b; playClick(b % 4 === 0); }`. Resetear `prevBeatRef.current = -1` en el efecto de recreación y al hacer seek (en `onSeek`).
  - Progreso: función `reportProgress()` = `onProgress?.(Math.round(100 * (engineRef.current?.time ?? 0) / effectiveSong.duration))` con guard `duration > 0`; llamarla en el bloque `finished` (antes de `onFinish`) y en el handler del ✕ (antes de `onExit()`), solo si `time > 0`.
- [ ] **App**: estado `const [volume, setVolumeState] = useState(80);` (aplicado con `setVolume(volume)` en un efecto al montar y al cambiar — import de piano.ts); `onProgress` → `store.recordPlayed(session.song.id, pct).then(refresh)`; **racha**: al arrancar sesión (`setSession(...)` en los 3 sitios: Seguir con, onStart, puente) y al `markCompleted` de teoría → `prefs.recordPracticeDay(new Date().toISOString().slice(0, 10))`; estado `streak` calculado con `computeStreak` al montar y tras cada registro; en el inicio, junto al saludo: `{streak >= 2 && <span className="chip">🔥 Racha: {streak} días</span>}`.
- [ ] Verificar + commit: `feat: metrónomo, volumen global, progreso recorrido y racha diaria`

### Task 4: Biblioteca — renombrar, borrado real, barra azul

**Files:** Modify `src/screens/LibraryScreen.tsx`, `src/App.tsx`

- [ ] **LibraryScreen**: prop nueva `onRename: (id: string, title: string) => void`. En tarjetas del grupo `user`, junto a 🗑: botón ✏️ (btn-ghost) con `stopPropagation` → `const t = prompt('Nuevo nombre', s.title); if (t && t.trim()) onRename(s.id, t.trim());`. Barra de progreso: `const pct = s.bestScore ?? s.playedPct ?? 0;` — si `bestScore !== null` degradado naranja/verde como ahora; si no pero `playedPct`, degradado azul (`var(--listen)` sólido vale); si nada, chip "Nueva" como ahora. El texto de metadatos añade ` · recorrida: ${s.playedPct}%` cuando aplique (sin bestScore).
- [ ] **App**: `handleRename = id/title → store.rename(...).then(refresh)`; pasar `onRename`.
- [ ] Verificar todo + commit: `feat(ui): renombrar canciones, borrado fiable y progreso recorrido en la biblioteca`

### Task 5: Verificación final

- [ ] `npm test` (≈110) + build. Manual: metrónomo marca el pulso (acento cada 4) y respeta la velocidad; volumen baja/sube el piano de la app al momento; escuchar media canción y salir → biblioteca muestra barra azul "recorrida 52%"; renombrar una tuya con ✏️ y sobrevive a recargar; borrar una tuya y NO reaparece tras recargar (prod-safe vía hidden); racha 🔥 visible con ≥2 días (simulable grabando ayer a mano en IndexedDB); nada de A/B roto.
