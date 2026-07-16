# Pulido de navegación y control — Plan (Fase 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Navegación temporal completa (saltar/retroceder/reiniciar con posición conservada), pausa real, desatascos (saltar nota, oír la nota) y detalles de fricción de la auditoría.

**Architecture:** Dos métodos nuevos en el motor (`seek`, `skipPending`, TDD); componente `TimeBar` arrastrable; reorganización mínima de la barra de PracticeScreen; retroceso en LessonScreen.

**Spec:** `docs/superpowers/specs/2026-07-16-pulido-navegacion-design.md`

**Regla de oro:** 91 tests actuales verdes; no tocar detección ni flujos no mencionados.

---

### Task 1: Motor — `seek` y `skipPending` (TDD)

**Files:** Modify `src/core/practiceEngine.ts`; tests en `src/core/practiceEngine.test.ts` (añadir al final)

- [ ] **Step 1: Tests que fallan:**

```ts
describe('PracticeEngine — seek', () => {
  it('salta a un punto y recoloca el grupo pendiente', () => {
    const e = new PracticeEngine(song([note(60, 1), note(62, 3)]),
      { waitMode: true, speed: 1, hand: 'both' });
    e.tick(2); // congelado en t=1 pidiendo 60
    e.seek(2.5);
    expect(e.time).toBeCloseTo(2.5, 5);
    expect(e.expectedNotes()).toEqual([]); // pendiente limpiado
    e.tick(1); // llega al grupo de t=3
    expect(e.expectedNotes()).toEqual([62]);
  });
  it('retroceder permite repetir notas ya sonadas (escuchar/libre)', () => {
    const e = new PracticeEngine(song([note(60, 1)]),
      { waitMode: true, speed: 1, hand: 'both', listenMode: true });
    e.tick(2); // suena la nota de t=1
    e.seek(0);
    const again = e.tick(1.5);
    expect(again.map(n => n.midi)).toEqual([60]); // vuelve a sonar
  });
  it('clamp a [0, duración]', () => {
    const e = new PracticeEngine(song([note(60, 1)]),
      { waitMode: false, speed: 1, hand: 'both' });
    e.seek(-5);
    expect(e.time).toBe(0);
    e.seek(999);
    expect(e.time).toBeCloseTo(1.4, 5);
  });
});

describe('PracticeEngine — skipPending', () => {
  it('salta el grupo pendiente sin puntuar (espera)', () => {
    const e = new PracticeEngine(song([note(60, 1), note(62, 3)]),
      { waitMode: true, speed: 1, hand: 'both' });
    e.tick(2);
    expect(e.expectedNotes()).toEqual([60]);
    e.skipPending();
    expect(e.expectedNotes()).toEqual([]);
    expect(e.correct + e.wrong).toBe(0); // sin puntuar
    e.tick(2);
    expect(e.expectedNotes()).toEqual([62]); // siguiente grupo
  });
  it('salta el grupo en modo guiado (micrófono) y permite continuar', () => {
    const e = new PracticeEngine(song([note(60, 0.5), note(62, 1.5)]),
      { waitMode: true, speed: 1, hand: 'both', guidedMode: true });
    e.tick(1);    // demo del primer grupo
    e.tick(9);    // fin de demo → repeat, pending {60}
    expect(e.expectedNotes()).toEqual([60]);
    e.skipPending();
    expect(e.expectedNotes()).toEqual([]);
    expect(e.guidedPhase).toBe(null); // lista para el siguiente grupo
    const played = e.tick(0.1); // demo del siguiente grupo
    expect(played.some(n => n.midi === 62)).toBe(true);
  });
  it('sin pendiente es un no-op', () => {
    const e = new PracticeEngine(song([note(60, 1)]),
      { waitMode: false, speed: 1, hand: 'both' });
    e.skipPending();
    expect(e.time).toBe(0);
  });
});
```

- [ ] **Step 2:** correr el archivo → FAIL (seek/skipPending no existen).

- [ ] **Step 3: Implementar** (tras `clearLoop()`):

```ts
  /** Salta al instante t (segundos musicales), en cualquier modo con reloj lineal. */
  seek(t: number): void {
    this.seekTo(Math.max(0, Math.min(t, this.songDuration)));
  }

  /** Completa el grupo pendiente sin sumar acierto ni fallo (desatasco). */
  skipPending(): void {
    if (!this.pending) return;
    this.pending = null;
    if (this.config.guidedMode) this.guidedStep = null;
    this.groupIdx += 1;
  }
```

Nota: `seekTo` ya existe (privado, lo usa el bucle) y limpia `pending` + recoloca índices; `seek` solo lo expone con clamp.

- [ ] **Step 4:** `npm test` → 97/97 y `npm run build` limpio. **Step 5: Commit** — `git add src/core/practiceEngine* && git commit -m "feat: motor — seek público y saltar grupo pendiente"`

---

### Task 2: TimeBar + PracticeScreen (pausa real, barra, desatascos, detalles)

**Files:** Create `src/components/TimeBar.tsx`; Modify `src/screens/PracticeScreen.tsx`, `src/components/CoachBar.tsx`, `src/components/SettingsSheet.tsx`

- [ ] **Step 1: `src/components/TimeBar.tsx`**

```tsx
import { useRef, type PointerEvent as ReactPointerEvent } from 'react';

interface Props {
  time: number;
  duration: number;
  /** false = solo lectura (modo micrófono). */
  seekable: boolean;
  onSeek: (t: number) => void;
}

export function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
}

/** Barra de tiempo interactiva: tocar/arrastrar para saltar + tiempo m:ss. */
export default function TimeBar({ time, duration, seekable, onSeek }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  function timeAt(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return frac * duration;
  }

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!seekable) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onSeek(timeAt(e.clientX));
    const move = (ev: PointerEvent) => onSeek(timeAt(ev.clientX));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
      {seekable && (
        <button className="btn-ghost" style={{ fontSize: 13, padding: '2px 4px', flexShrink: 0 }}
          onClick={() => onSeek(Math.max(0, time - 5))}>
          ⏪5s
        </button>
      )}
      <div
        ref={trackRef}
        onPointerDown={startDrag}
        style={{
          flex: 1, minWidth: 40, height: seekable ? 22 : 8,
          display: 'flex', alignItems: 'center',
          touchAction: 'none', cursor: seekable ? 'pointer' : 'default',
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: 8, background: 'var(--bg-chip)', borderRadius: 4 }}>
          <div style={{ width: `${pct}%`, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, var(--right-soft), var(--right))' }} />
          {seekable && (
            <div style={{
              position: 'absolute', top: -5, left: `${pct}%`, marginLeft: -9,
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--right)', boxShadow: 'var(--shadow)',
            }} />
          )}
        </div>
      </div>
      <span style={{ fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {fmtTime(time)} / {fmtTime(duration)}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: `src/components/CoachBar.tsx`** — el chip pasa a admitir además un botón de acción:

```tsx
export type CoachTone = 'ok' | 'warn' | 'err' | 'info';

interface Props {
  text: string;
  tone: CoachTone;
  chip?: string | null;
  /** Botón de acción contextual (p. ej. "🔊 ¿Cómo suena?" o "Saltar →"). */
  action?: { label: string; onClick: () => void } | null;
}

export default function CoachBar({ text, tone, chip, action }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 12px' }}>
      <div className={`coach coach-${tone}`} style={{ flex: 1, minWidth: 0 }}>{text}</div>
      {action && (
        <button className="chip" style={{ cursor: 'pointer', fontWeight: 700, flexShrink: 0 }} onClick={action.onClick}>
          {action.label}
        </button>
      )}
      {chip && <span className="chip" style={{ flexShrink: 0 }}>{chip}</span>}
    </div>
  );
}
```

- [ ] **Step 3: `src/components/SettingsSheet.tsx`** — añadir props `onRestart: () => void` y, encima del párrafo final, un botón:

```tsx
          <button onClick={onRestart} style={{ alignSelf: 'flex-start' }}>⟲ Reiniciar canción</button>
```
y el texto final pasa a: `La velocidad y el sonido se aplican al momento; al cambiar nivel o mano se mantiene tu posición.`

- [ ] **Step 4: `src/screens/PracticeScreen.tsx`** — cambios (conservar todo lo no mencionado):

(a) Import: `import TimeBar from '../components/TimeBar';`

(b) **Pausa real**: en `handleKey`, la llamada al motor se condiciona a `running`:
```tsx
    if (down && running) {
      const result = engineRef.current?.onKeyDown(midi);
      ...
    }
```
(el bloque de `setPressed` queda fuera del if, como está). Añadir `running` a las deps del `useCallback`.

(c) **Conservar posición al recrear**: refs junto a los existentes:
```tsx
const lastTimeRef = useRef(0);
const songIdRef = useRef(song.id);
```
En el bucle rAF, tras `setTime(engine.time)`: `lastTimeRef.current = engine.time;`
En el efecto de recreación, tras re-aplicar velocidad y bucle:
```tsx
if (songIdRef.current === song.id && lastTimeRef.current > 0 && !micMode) {
  engineRef.current.seek(lastTimeRef.current);
  setTime(lastTimeRef.current);
} else {
  lastTimeRef.current = 0;
}
songIdRef.current = song.id;
```

(d) **Señal de salto de bucle**: en el rAF, antes de `setTime(engine.time)`:
```tsx
if (engine.time < lastTimeRef.current - 0.5 && loopRef.current) showFeedback('🔁 Otra vez desde A', 1200);
```
(añadir `showFeedback` a las deps del efecto rAF si no está).

(e) **Barra superior**: sustituir el div de progreso por `<TimeBar time={time} duration={effectiveSong.duration} seekable={!micMode} onSeek={t => { engineRef.current?.seek(t); setTime(t); lastTimeRef.current = t; }} />`; QUITAR de la barra los chips de racha y liveScore; poner `flexShrink: 0` en los cuatro botones (✕, 🔁, ⚙, ▶) y la etiqueta del bucle pasa a `{loop ? '🔁✓' : '🔁 Bucle'}` con `whiteSpace: 'nowrap'`.

(f) **Chips en la entrenadora**: el `chip` del coach antepone racha/score cuando existan:
```tsx
const statsChip = streak > 1 ? `✓ ${streak} seguidas` : (liveScore !== null && (playAlongMode || micMode)) ? `${liveScore}%` : null;
```
y en el objeto coach usar `chip: statsChip ?? chip` (donde `chip` es el de entrada actual).

(g) **Pausado visible**: en el árbol del coach, tras el caso `audioError`, añadir:
```tsx
if (!running && !countingDown && time > 0 && !ended) return { text: '⏸ En pausa — pulsa ▶ para seguir', tone: 'info', chip: statsChip ?? chip };
```

(h) **Acción contextual de la entrenadora**:
```tsx
const coachAction = micMode && guidedPhase === 'repeat'
  ? { label: 'Saltar →', onClick: () => { engineRef.current?.skipPending(); syncExpected(); syncGuidedHint(hasMidi, micMode, micReady); } }
  : (!micMode && !listenMode && !freeMode && running && expected.size > 0)
    ? { label: '🔊 ¿Cómo suena?', onClick: () => { [...expected].forEach((m, i) => window.setTimeout(() => playNote(m, 0.8), i * 300)); } }
    : null;
```
y `<CoachBar text={coach.text} tone={coach.tone} chip={coach.chip} action={coachAction} />`.

(i) **Confirmación al salir**: el ✕ pasa a
```tsx
onClick={() => { if (time > 0 && !ended && !confirm('¿Salir? Perderás la posición actual.')) return; onExit(); }}
```

(j) **SettingsSheet**: pasar `onRestart={() => { engineRef.current?.seek(0); setTime(0); lastTimeRef.current = 0; setStreak(0); setMaxStreak(0); setShowSettings(false); }}`.

- [ ] **Step 5:** `npm test` (97/97) + `npm run build` limpio + curl dev 200. **Step 6: Commit** — `git add -A && git commit -m "feat(ui): barra de tiempo interactiva, pausa real y desatascos de la auditoría"`

---

### Task 3: Lecciones — retroceder un paso

**Files:** Modify `src/screens/LessonScreen.tsx`

- [ ] **Step 1:** junto al ✕, botón de retroceso (solo si `i > 0 && !done`):
```tsx
{i > 0 && !done && (
  <button className="btn-ghost" onClick={() => setI(i - 1)} style={{ fontSize: 16 }}>←</button>
)}
```
- [ ] **Step 2:** `npm test` + build. **Step 3: Commit** — `git add src/screens/LessonScreen.tsx && git commit -m "feat(teoria): retroceder un paso en las lecciones"`

---

### Task 4: Verificación final

- [ ] `npm test` → 97/97; `npm run build` limpio.
- [ ] Manual: arrastrar la barra de tiempo adelante/atrás en Aprender (salta y re-pide notas), ⏪5s, m:ss visible; pausar a mitad → teclas NO avanzan la canción y el coach dice "En pausa"; cambiar nivel a mitad → sigue donde estabas; ⟲ Reiniciar; micrófono → "Saltar →" desbloquea una nota imposible; espera → "🔊 ¿Cómo suena?" toca las notas pedidas; salir con ✕ pide confirmación; bucle avisa "Otra vez desde A"; lecciones → ← retrocede.
- [ ] iPhone: barra superior sin desbordes con todos los elementos, tirador de tiempo manejable.
