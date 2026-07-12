# Rediseño Luminoso — Plan de implementación (Fase 2b)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar toda la UI al sistema "Luminoso" (claro/cálido/motivador) con pantalla de práctica "entrenadora" y flujo "tres puertas", sin tocar motor ni detección.

**Architecture:** Design tokens en CSS (variables + clases utilitarias) como única fuente de estilo; función pura `resolveEngineMode` traduce el nuevo `SessionConfig` (puerta+entrada) a los flags existentes del motor; `PracticeScreen` conserva TODO su cableado actual (hooks de MIDI/mic/teclado, rAF, syncs) y solo cambia su presentación + añade racha/cuenta atrás/hoja de ajustes/overlay final como componentes presentacionales nuevos.

**Tech Stack:** React 18 + TS estricto, CSS puro (sin dependencias nuevas), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-13-rediseno-luminoso-design.md`

**Regla de oro:** NO tocar `src/core/*` (salvo ninguna), `src/audio/pitchDetect.ts`, `src/audio/piano.ts`, `src/input/*`, `src/storage/*`, `scripts/*`. Los 60 tests actuales deben seguir verdes en todo momento.

## Estructura de archivos

```
src/styles.css                    — MODIFICAR: tokens + clases (única fuente de estilo)
src/core/sessionModes.ts          — CREAR: SessionConfig v2 + resolveEngineMode + pickDefaultInput (puro, TDD)
src/core/sessionModes.test.ts     — CREAR
src/components/Keyboard.tsx       — MODIFICAR: tema claro + nombres de teclas + animaciones
src/components/NoteFall.tsx       — MODIFICAR: tema claro
src/components/CoachBar.tsx       — CREAR: franja entrenadora (presentacional)
src/components/Countdown.tsx      — CREAR: 3-2-1 (presentacional)
src/components/SettingsSheet.tsx  — CREAR: hoja de ajustes ⚙ (presentacional)
src/components/EndOverlay.tsx     — CREAR: pantalla final + confeti (presentacional)
src/screens/LibraryScreen.tsx     — MODIFICAR: rediseño completo
src/screens/SongSetupScreen.tsx   — MODIFICAR: tres puertas (reescritura)
src/screens/PracticeScreen.tsx    — MODIFICAR: entrenadora (conservando cableado)
src/App.tsx                       — MODIFICAR: prop onFinish para guardar récord sin salir
```

---

### Task 1: Design tokens y clases base

**Files:** Modify `src/styles.css` (sustituir el archivo entero por esto):

- [ ] **Step 1: Escribir `src/styles.css`**

```css
:root {
  /* Fondos */
  --bg: #f7f5f0;
  --bg-card: #ffffff;
  --bg-fall-top: #faf8f4;
  --bg-fall-bottom: #f2ede4;
  --bg-chip: #f0e9df;
  /* Tinta */
  --ink: #2b2620;
  --ink-2: #6b6152;
  --ink-3: #8d8271;
  /* Acentos (significado fijo) */
  --right: #e8734a;      /* mano derecha / marca */
  --right-soft: #f5a623;
  --right-pale: #ffe9c7;
  --left: #4a9e50;       /* mano izquierda / acierto */
  --left-soft: #7bc47f;
  --left-pale: #dcedde;
  --listen: #5b8fd4;     /* escuchar */
  --listen-pale: #dbe9f7;
  --error: #d9534f;
  --error-pale: #f8e1e0;
  /* Forma */
  --radius: 14px;
  --shadow: 0 2px 8px rgba(60, 40, 20, 0.08);
  --border: #e5ddd0;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #root { height: 100%; }
body {
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--ink);
  overflow: hidden;
  touch-action: manipulation;
}
#root { padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }

button {
  font: inherit;
  color: var(--ink);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 16px;
  cursor: pointer;
  box-shadow: var(--shadow);
}
button:disabled { opacity: 0.4; }
select {
  font: inherit;
  color: var(--ink);
  background: var(--bg-chip);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px 10px;
}

.btn-primary {
  background: linear-gradient(135deg, var(--right-soft), var(--right));
  color: #fff;
  border: none;
  font-weight: 800;
  min-height: 44px;
}
.btn-ghost { background: transparent; border: none; box-shadow: none; color: var(--ink-3); }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-chip);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 13px;
  color: var(--ink-2);
  white-space: nowrap;
}
.card {
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 14px;
}

/* Franja entrenadora */
.coach {
  border-radius: 12px;
  padding: 8px 14px;
  font-weight: 700;
  font-size: 14px;
  text-align: center;
}
.coach-ok   { background: var(--left-pale);   border: 1px solid var(--left-soft);  color: #2e7d36; }
.coach-warn { background: var(--right-pale);  border: 1px solid var(--right-soft); color: #8a5a00; }
.coach-err  { background: var(--error-pale);  border: 1px solid var(--error);      color: #a33a37; }
.coach-info { background: var(--listen-pale); border: 1px solid var(--listen);     color: #2d5586; }

/* Animaciones */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}
.shake { animation: shake 0.25s ease-in-out 2; }

@keyframes pop {
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
.pop { animation: pop 0.35s ease-out; }

@keyframes confetti-fall {
  0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(105vh) rotate(720deg); opacity: 0.7; }
}
.confetti {
  position: fixed;
  top: 0;
  width: 10px;
  height: 14px;
  border-radius: 3px;
  animation: confetti-fall linear forwards;
  pointer-events: none;
  z-index: 60;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(43, 38, 32, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-card);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 24px rgba(60, 40, 20, 0.18);
  padding: 18px 18px calc(18px + env(safe-area-inset-bottom));
  z-index: 51;
}
```

- [ ] **Step 2: Verificar** — `npm test` (60 verdes, nada depende del CSS) y `npm run build` limpio. Arrancar `npm run dev`, abrir la app: se verá clara con estilos a medio migrar (esperado — las pantallas se re-tematizan en las tareas siguientes).

- [ ] **Step 3: Commit** — `git add src/styles.css && git commit -m "feat(ui): design tokens y clases base del sistema Luminoso"`

---

### Task 2: `sessionModes` — puertas, entradas y mapeo al motor (TDD)

**Files:** Create `src/core/sessionModes.ts`; Test `src/core/sessionModes.test.ts`

- [ ] **Step 1: Test que falla — `src/core/sessionModes.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { resolveEngineMode, pickDefaultInput, type SessionConfig } from './sessionModes';

const base: SessionConfig = {
  door: 'learn', input: 'screen', level: 'original', speed: 1, hand: 'both', waitMode: true,
};

describe('resolveEngineMode', () => {
  it('escuchar → listenMode, sin interacción', () => {
    const r = resolveEngineMode({ ...base, door: 'listen' });
    expect(r.engine.listenMode).toBe(true);
    expect(r.micMode).toBe(false);
    expect(r.engine.guidedMode).toBeFalsy();
    expect(r.engine.playAlongMode).toBeFalsy();
  });

  it('aprender + micrófono → modo guiado con mic', () => {
    const r = resolveEngineMode({ ...base, door: 'learn', input: 'mic' });
    expect(r.engine.guidedMode).toBe(true);
    expect(r.micMode).toBe(true);
    expect(r.engine.listenMode).toBeFalsy();
  });

  it('aprender + MIDI o pantalla → práctica con espera', () => {
    for (const input of ['midi', 'screen'] as const) {
      const r = resolveEngineMode({ ...base, door: 'learn', input });
      expect(r.engine.waitMode).toBe(true);
      expect(r.engine.guidedMode).toBeFalsy();
      expect(r.micMode).toBe(false);
    }
  });

  it('tocar → playAlongMode (nunca mic)', () => {
    const r = resolveEngineMode({ ...base, door: 'play', input: 'midi' });
    expect(r.engine.playAlongMode).toBe(true);
    expect(r.micMode).toBe(false);
  });

  it('conserva speed y hand; waitMode solo aplica en aprender sin mic', () => {
    const r = resolveEngineMode({ ...base, door: 'learn', input: 'midi', speed: 0.5, hand: 'right' });
    expect(r.engine.speed).toBe(0.5);
    expect(r.engine.hand).toBe('right');
  });
});

describe('pickDefaultInput', () => {
  it('con MIDI conectado siempre gana el cable', () => {
    expect(pickDefaultInput(true, 'learn')).toBe('midi');
    expect(pickDefaultInput(true, 'play')).toBe('midi');
  });
  it('sin MIDI: aprender → micrófono; tocar/escuchar → pantalla', () => {
    expect(pickDefaultInput(false, 'learn')).toBe('mic');
    expect(pickDefaultInput(false, 'play')).toBe('screen');
    expect(pickDefaultInput(false, 'listen')).toBe('screen');
  });
});
```

- [ ] **Step 2:** `npx vitest run src/core/sessionModes.test.ts` → FAIL (módulo no existe).

- [ ] **Step 3: Implementar `src/core/sessionModes.ts`**

```ts
import type { EngineConfig } from './practiceEngine';
import type { Level } from './simplifySong';

/** Las "tres puertas" que ve el usuario. */
export type Door = 'listen' | 'learn' | 'play';
/** Cómo escucha la app al usuario. */
export type InputKind = 'midi' | 'mic' | 'screen';

export interface SessionConfig {
  door: Door;
  input: InputKind;
  level: Level;
  speed: number;
  hand: EngineConfig['hand'];
  /** Solo relevante en aprender sin micrófono; por defecto true. */
  waitMode: boolean;
}

export const DOOR_LABELS: Record<Door, { icon: string; title: string; hint: string }> = {
  listen: { icon: '🎧', title: 'Escuchar', hint: 'Mira y escucha cómo suena' },
  learn: { icon: '🪜', title: 'Aprender paso a paso', hint: 'Nota a nota, a tu ritmo' },
  play: { icon: '🎹', title: 'Tocar con la canción', hint: 'A ritmo real, como un concierto' },
};

export const INPUT_LABELS: Record<InputKind, string> = {
  midi: 'cable MIDI (tu piano)',
  mic: 'micrófono',
  screen: 'pantalla o teclas A–L',
};

/** Traduce la elección del usuario a los flags que ya entiende PracticeEngine. */
export function resolveEngineMode(cfg: SessionConfig): { engine: EngineConfig; micMode: boolean } {
  const micMode = cfg.door === 'learn' && cfg.input === 'mic';
  const engine: EngineConfig = {
    speed: cfg.speed,
    hand: cfg.hand,
    waitMode: cfg.door === 'learn' && !micMode ? cfg.waitMode : true,
    listenMode: cfg.door === 'listen',
    guidedMode: micMode,
    playAlongMode: cfg.door === 'play',
  };
  return { engine, micMode };
}

/** Entrada por defecto: cable si está; si no, micrófono para aprender y pantalla para el resto. */
export function pickDefaultInput(hasMidi: boolean, door: Door): InputKind {
  if (hasMidi) return 'midi';
  return door === 'learn' ? 'mic' : 'screen';
}
```

- [ ] **Step 4:** `npm test` → 67/67 (60 + 7). **Step 5: Commit** — `git add src/core/sessionModes* && git commit -m "feat: tres puertas — mapeo puro de sesión a modos del motor"`

---

### Task 3: Keyboard luminoso con nombres de teclas

**Files:** Modify `src/components/Keyboard.tsx` (sustituir entero). La interfaz de props NO cambia respecto a la actual (`loMidi, hiMidi, width, height, pressed, expected, wrong, onKey, interactive`), así que PracticeScreen sigue compilando.

- [ ] **Step 1: Escribir `src/components/Keyboard.tsx`**

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
  wrong: Set<number>;     // teclas falladas (feedback rojo temporal)
  onKey: (midi: number, down: boolean) => void;
  interactive?: boolean;
}

const KEY_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

const COLORS = {
  white: '#ffffff', whiteEdge: '#e5ddd0',
  black: '#3a352d', blackEdge: '#2b2620',
  expectedWhite: '#f5a623', expectedBlack: '#c07f10',
  pressed: '#7bc47f',
  wrongKey: '#d9534f',
  labelWhite: '#b0a695', labelExpected: '#7a5200', labelBlack: '#cfc8bd',
};

export default function Keyboard({ loMidi, hiMidi, width, height, pressed, expected, wrong, onKey, interactive = true }: Props) {
  const keys = useMemo(() => keyLayout(loMidi, hiMidi, width, height), [loMidi, hiMidi, width, height]);
  const fill = (midi: number, black: boolean) => {
    if (wrong.has(midi)) return COLORS.wrongKey;
    if (pressed.has(midi)) return COLORS.pressed;
    if (expected.has(midi)) return black ? COLORS.expectedBlack : COLORS.expectedWhite;
    return black ? COLORS.black : COLORS.white;
  };
  const labelColor = (midi: number, black: boolean) => {
    if (wrong.has(midi) || pressed.has(midi)) return '#ffffff';
    if (expected.has(midi)) return COLORS.labelExpected;
    return black ? COLORS.labelBlack : COLORS.labelWhite;
  };
  // Blancas primero para que las negras queden dibujadas encima
  const ordered = [...keys.filter(k => !k.black), ...keys.filter(k => k.black)];
  const showLabels = keys.filter(k => !k.black)[0]?.w >= 18; // en rangos enormes no caben
  return (
    <svg width={width} height={height} style={{ display: 'block', touchAction: 'none', background: '#efe9df' }}>
      {ordered.map(k => (
        <g key={k.midi} className={wrong.has(k.midi) ? 'shake' : undefined}>
          <rect
            x={k.x} y={0} width={k.w} height={k.h}
            fill={fill(k.midi, k.black)}
            stroke={k.black ? COLORS.blackEdge : COLORS.whiteEdge} strokeWidth={1} rx={4}
            onPointerDown={interactive ? e => { e.currentTarget.setPointerCapture(e.pointerId); onKey(k.midi, true); } : undefined}
            onPointerUp={interactive ? () => onKey(k.midi, false) : undefined}
            onPointerCancel={interactive ? () => onKey(k.midi, false) : undefined}
          />
          {showLabels && !k.black && (
            <text
              x={k.x + k.w / 2} y={k.h - 6}
              textAnchor="middle" fontSize={Math.min(11, k.w * 0.42)}
              fill={labelColor(k.midi, k.black)} fontWeight={expected.has(k.midi) ? 800 : 500}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {KEY_NAMES[k.midi % 12]}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
```

Nota: la prop `interactive` ya existe en el uso actual (`PracticeScreen` pasa `interactive={screenInput && !micMode}`); consérvala tal cual.

- [ ] **Step 2:** `npm test` (67 verdes) + `npm run build` limpio + verificación visual en `npm run dev` (teclas blancas con nombres, esperada ámbar con nombre en negrita).
- [ ] **Step 3: Commit** — `git add src/components/Keyboard.tsx && git commit -m "feat(ui): teclado luminoso con nombres de notas y sacudida al fallar"`

---

### Task 4: NoteFall luminoso

**Files:** Modify `src/components/NoteFall.tsx` — solo cambian los colores del efecto de dibujo. En el `useEffect` de dibujo, sustituir las tres constantes de color:

- [ ] **Step 1: Aplicar estos cambios**

Donde dice:
```ts
const HAND_COLORS = { right: '#5c9dff', left: '#4caf7d' } as const;
```
poner:
```ts
const HAND_COLORS = { right: '#e8734a', left: '#4a9e50' } as const;
```

Donde dice:
```ts
    ctx.fillStyle = '#181b23';
    ctx.fillRect(0, 0, width, height);
```
poner (degradado claro):
```ts
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#faf8f4');
    bg.addColorStop(1, '#f2ede4');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
```

Donde dice:
```ts
    ctx.fillStyle = '#ffffff44';
    ctx.fillRect(0, height - 2, width, 2);
```
poner:
```ts
    ctx.fillStyle = 'rgba(232, 115, 74, 0.45)';
    ctx.fillRect(0, height - 2, width, 2);
```

Y al dibujar cada nota, justo antes de `ctx.fill()`, añadir sombra suave (y limpiarla después del bucle):
```ts
      ctx.shadowColor = 'rgba(60, 40, 20, 0.25)';
      ctx.shadowBlur = 4;
```
(tras el bucle de notas: `ctx.shadowBlur = 0;` antes de dibujar la línea de "ahora").

- [ ] **Step 2:** `npm test` + `npm run build` + visual (notas naranjas/verdes sobre fondo crema).
- [ ] **Step 3: Commit** — `git add src/components/NoteFall.tsx && git commit -m "feat(ui): cascada de notas en tema claro"`

---

### Task 5: Componentes presentacionales nuevos

**Files:** Create `src/components/CoachBar.tsx`, `src/components/Countdown.tsx`, `src/components/SettingsSheet.tsx`, `src/components/EndOverlay.tsx`

- [ ] **Step 1: `src/components/CoachBar.tsx`**

```tsx
export type CoachTone = 'ok' | 'warn' | 'err' | 'info';

interface Props {
  text: string;
  tone: CoachTone;
  /** Chip pequeño a la derecha (estado de entrada: "🎹 tu piano", "🎤 87%"...). */
  chip?: string | null;
}

/** Franja entrenadora: un solo mensaje grande + chip de estado. Presentacional. */
export default function CoachBar({ text, tone, chip }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 12px' }}>
      <div className={`coach coach-${tone}`} style={{ flex: 1 }}>{text}</div>
      {chip && <span className="chip">{chip}</span>}
    </div>
  );
}
```

- [ ] **Step 2: `src/components/Countdown.tsx`**

```tsx
import { useEffect, useState } from 'react';

interface Props {
  /** Al llegar a 0 se llama una única vez. */
  onDone: () => void;
}

/** Cuenta atrás 3-2-1 superpuesta a la cascada. Montar solo cuando toque. */
export default function Countdown({ onDone }: Props) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n === 0) { onDone(); return; }
    const t = window.setTimeout(() => setN(v => v - 1), 700);
    return () => window.clearTimeout(t);
  }, [n, onDone]);
  if (n === 0) return null;
  return (
    <div className="overlay" style={{ background: 'rgba(43,38,32,0.25)' }}>
      <div key={n} className="pop" style={{
        fontSize: 96, fontWeight: 800, color: '#fff',
        textShadow: '0 4px 16px rgba(60,40,20,0.4)',
      }}>
        {n}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `src/components/SettingsSheet.tsx`**

```tsx
import { LEVEL_LABELS, type Level } from '../core/simplifySong';
import type { EngineConfig } from '../core/practiceEngine';

interface Props {
  level: Level;
  speed: number;
  hand: EngineConfig['hand'];
  waitMode: boolean;
  /** Enseñar el interruptor de espera solo cuando aplica (aprender sin micrófono). */
  showWaitMode: boolean;
  showHand: boolean;
  onChange: (patch: Partial<{ level: Level; speed: number; hand: EngineConfig['hand']; waitMode: boolean }>) => void;
  onClose: () => void;
}

const SPEEDS = [0.25, 0.5, 0.75, 1] as const;

/** Hoja inferior de ajustes. Cambiar algo reinicia la canción (lo gestiona el padre). */
export default function SettingsSheet({ level, speed, hand, waitMode, showWaitMode, showHand, onChange, onClose }: Props) {
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="sheet">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <strong style={{ flex: 1, fontSize: 17 }}>⚙ Ajustes</strong>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: 20 }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 90, color: 'var(--ink-2)' }}>Nivel</span>
            <select value={level} onChange={e => onChange({ level: e.target.value as Level })}>
              {(Object.keys(LEVEL_LABELS) as Level[]).map(l =>
                <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 90, color: 'var(--ink-2)' }}>Velocidad</span>
            <select value={speed} onChange={e => onChange({ speed: Number(e.target.value) })}>
              {SPEEDS.map(v => <option key={v} value={v}>{v * 100}%</option>)}
            </select>
          </label>
          {showHand && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 90, color: 'var(--ink-2)' }}>Mano</span>
              <select value={hand} onChange={e => onChange({ hand: e.target.value as EngineConfig['hand'] })}>
                <option value="both">Ambas</option>
                <option value="right">Derecha 🟠</option>
                <option value="left">Izquierda 🟢</option>
              </select>
            </label>
          )}
          {showWaitMode && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 90, color: 'var(--ink-2)' }}>Espera</span>
              <input type="checkbox" checked={waitMode} onChange={e => onChange({ waitMode: e.target.checked })} />
              <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>pausa hasta que toques la nota</span>
            </label>
          )}
          <p style={{ color: 'var(--ink-3)', fontSize: 12 }}>Cambiar un ajuste reinicia la canción desde el principio.</p>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: `src/components/EndOverlay.tsx`**

```tsx
interface Props {
  score: number | null;      // null = sesión sin puntuación (escuchar / salida sin intentos)
  maxStreak: number;
  isRecord: boolean;
  onRepeat: () => void;
  onChangeMode: () => void;
  onLibrary: () => void;
}

const CONFETTI_COLORS = ['#e8734a', '#f5a623', '#7bc47f', '#5b8fd4', '#d9534f'];

/** Pantalla de final con puntuación grande y confeti si hay récord. Presentacional. */
export default function EndOverlay({ score, maxStreak, isRecord, onRepeat, onChangeMode, onLibrary }: Props) {
  return (
    <div className="overlay">
      {isRecord && Array.from({ length: 30 }, (_, i) => (
        <div
          key={i}
          className="confetti"
          style={{
            left: `${(i * 37) % 100}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDuration: `${2 + (i % 5) * 0.4}s`,
            animationDelay: `${(i % 7) * 0.15}s`,
          }}
        />
      ))}
      <div className="card pop" style={{ width: 'min(92vw, 380px)', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 40 }}>{isRecord ? '🏆' : score !== null && score >= 80 ? '🎉' : '👏'}</div>
        <h2 style={{ fontSize: 22, margin: '8px 0 2px' }}>
          {isRecord ? '¡Nuevo récord!' : '¡Canción terminada!'}
        </h2>
        {score !== null && (
          <div style={{ fontSize: 56, fontWeight: 800, color: score >= 80 ? 'var(--left)' : score >= 50 ? 'var(--right-soft)' : 'var(--error)' }}>
            {score}%
          </div>
        )}
        {maxStreak > 1 && (
          <div className="chip" style={{ margin: '6px auto 0' }}>🔥 Mejor racha: {maxStreak} seguidas</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
          <button className="btn-primary" onClick={onRepeat}>↻ Repetir</button>
          <button onClick={onChangeMode}>Cambiar modo</button>
          <button className="btn-ghost" onClick={onLibrary}>← Biblioteca</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5:** `npm run build` limpio (los componentes aún no se usan; TS los compila por el include). Commit — `git add src/components && git commit -m "feat(ui): CoachBar, Countdown, SettingsSheet y EndOverlay"`

---

### Task 6: Biblioteca luminosa

**Files:** Modify `src/screens/LibraryScreen.tsx` (sustituir entero). OJO: conservar EXACTAMENTE la firma de props actual (`onAdd(song, midi)` con ArrayBuffer — el store guarda el archivo) y la importación en serie con `await`.

- [ ] **Step 1: Escribir `src/screens/LibraryScreen.tsx`**

```tsx
import { useRef, useState } from 'react';
import { parseMidi } from '../core/parseMidi';
import type { Song } from '../core/types';

interface Props {
  songs: Song[];
  onAdd: (song: Song, midi: ArrayBuffer) => void | Promise<void>;
  onRemove: (id: string) => void;
  onOpen: (song: Song) => void;
}

const SONG_ICONS = ['🎵', '🎼', '🎹', '🎶', '🎷', '🌙', '⭐', '🎺'];
const ICON_BGS = ['#ffe9c7', '#dcedde', '#dbe9f7', '#f3e3f5', '#fde2d9', '#e6f0d8', '#e3e9f8', '#fbe8c8'];

function songIcon(id: string): { icon: string; bg: string } {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { icon: SONG_ICONS[h % SONG_ICONS.length], bg: ICON_BGS[h % ICON_BGS.length] };
}

export default function LibraryScreen({ songs, onAdd, onRemove, onOpen }: Props) {
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {songs.map(s => {
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
                  {!s.id.startsWith('builtin:') && (
                    <button className="btn-ghost" onClick={() => { if (confirm(`¿Borrar "${s.title}"?`)) onRemove(s.id); }}>🗑</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** `npm test` + `npm run build` + visual. **Step 3: Commit** — `git add src/screens/LibraryScreen.tsx && git commit -m "feat(ui): biblioteca luminosa con progreso por canción"`

---

### Task 7: SongSetupScreen — tres puertas

**Files:** Modify `src/screens/SongSetupScreen.tsx` (sustituir entero). El tipo `SessionConfig` viejo desaparece de aquí: ahora se importa de `../core/sessionModes` (los consumidores se actualizan en la Task 8; hasta entonces el build fallará — por eso Tasks 7 y 8 se commitean JUNTAS al final de la Task 8).

- [ ] **Step 1: Escribir `src/screens/SongSetupScreen.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useMidiInput } from '../input/useMidiInput';
import { LEVEL_LABELS, type Level } from '../core/simplifySong';
import {
  DOOR_LABELS, INPUT_LABELS, pickDefaultInput,
  type Door, type InputKind, type SessionConfig,
} from '../core/sessionModes';
import type { EngineConfig } from '../core/practiceEngine';
import type { Song } from '../core/types';

interface Props {
  song: Song;
  onBack: () => void;
  onStart: (config: SessionConfig) => void;
}

const SPEEDS = [0.25, 0.5, 0.75, 1] as const;
const DOOR_COLORS: Record<Door, { border: string; bg: string }> = {
  listen: { border: 'var(--listen)', bg: 'var(--listen-pale)' },
  learn: { border: 'var(--right-soft)', bg: 'var(--right-pale)' },
  play: { border: 'var(--left-soft)', bg: 'var(--left-pale)' },
};

export default function SongSetupScreen({ song, onBack, onStart }: Props) {
  const [door, setDoor] = useState<Door>('learn');
  const [input, setInput] = useState<InputKind | null>(null); // null = automático
  const [changingInput, setChangingInput] = useState(false);
  const [level, setLevel] = useState<Level>('original');
  const [speed, setSpeed] = useState(1);
  const [hand, setHand] = useState<EngineConfig['hand']>('both');
  const midiDevice = useMidiInput(() => {});
  const hasMidi = !!midiDevice && midiDevice !== 'unsupported';

  const effectiveInput: InputKind = input ?? pickDefaultInput(hasMidi, door);

  // "Tocar" no funciona con micrófono: si el usuario fijó mic y cambia a tocar, volvemos a automático
  useEffect(() => {
    if (door !== 'learn' && input === 'mic') setInput(null);
  }, [door, input]);

  function start() {
    onStart({ door, input: effectiveInput, level, speed, hand, waitMode: true });
  }

  const availableInputs: InputKind[] = [
    ...(hasMidi ? ['midi' as const] : []),
    ...(door === 'learn' ? ['mic' as const] : []),
    'screen' as const,
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 20 }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <button className="btn-ghost" onClick={onBack} style={{ marginBottom: 12 }}>← Volver</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>{song.title}</h1>
        <p style={{ color: 'var(--ink-3)', marginBottom: 18 }}>¿Qué quieres hacer hoy?</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {(Object.keys(DOOR_LABELS) as Door[]).map(d => {
            const meta = DOOR_LABELS[d];
            const active = door === d;
            return (
              <button
                key={d}
                onClick={() => setDoor(d)}
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                  border: active ? `2px solid ${DOOR_COLORS[d].border}` : '1px solid var(--border)',
                }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: 14, background: DOOR_COLORS[d].bg, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>
                  {meta.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800 }}>
                    {meta.title}
                    {d === 'learn' && <span className="chip" style={{ marginLeft: 8, fontSize: 11 }}>Recomendado</span>}
                  </div>
                  <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>{meta.hint}</div>
                </div>
              </button>
            );
          })}
        </div>

        {door !== 'listen' && (
          <div className="chip" style={{ marginBottom: 6 }}>
            {effectiveInput === 'midi' ? '🎹' : effectiveInput === 'mic' ? '🎤' : '👆'}
            {' '}Te escucho por: <strong>{INPUT_LABELS[effectiveInput]}</strong>
            {availableInputs.length > 1 && (
              <button className="btn-ghost" style={{ padding: '0 4px', fontSize: 13 }}
                onClick={() => setChangingInput(v => !v)}>
                cambiar
              </button>
            )}
          </div>
        )}
        {changingInput && door !== 'listen' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {availableInputs.map(k => (
              <button key={k} className="chip"
                style={{ border: effectiveInput === k ? '2px solid var(--right)' : '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => { setInput(k); setChangingInput(false); }}>
                {INPUT_LABELS[k]}
              </button>
            ))}
          </div>
        )}
        {door !== 'listen' && effectiveInput === 'screen' && !hasMidi && (
          <p style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 10 }}>
            Cuando conectes el cable MIDI-USB, tu piano aparecerá aquí automáticamente.
          </p>
        )}

        <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <label>Nivel{' '}
            <select value={level} onChange={e => setLevel(e.target.value as Level)}>
              {(Object.keys(LEVEL_LABELS) as Level[]).map(l =>
                <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
            </select>
          </label>
          <label>Velocidad{' '}
            <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>
              {SPEEDS.map(v => <option key={v} value={v}>{v * 100}%</option>)}
            </select>
          </label>
          {door !== 'listen' && (
            <label>Mano{' '}
              <select value={hand} onChange={e => setHand(e.target.value as EngineConfig['hand'])}>
                <option value="both">Ambas</option>
                <option value="right">Derecha 🟠</option>
                <option value="left">Izquierda 🟢</option>
              </select>
            </label>
          )}
        </div>

        {door === 'learn' && effectiveInput === 'mic' && (
          <p style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 14 }}>
            🎤 Consejos: sitio tranquilo, micrófono cerca del piano, nivel <strong>Fácil</strong> y velocidad 50%.
            El navegador pedirá permiso.
          </p>
        )}

        <button className="btn-primary" onClick={start} style={{ width: '100%', fontSize: 16 }}>
          ▶ Empezar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** NO commitear todavía — el build está roto hasta actualizar los consumidores en la Task 8 (se hace un único commit al final de esa tarea).

---

### Task 8: PracticeScreen entrenadora + App

**Files:** Modify `src/screens/PracticeScreen.tsx`, `src/App.tsx`. Un solo commit junto con la Task 7.

**Principio: el cableado actual NO cambia.** Se conservan tal cual: `useMidiInput`/`useMicPitch`/`useComputerKeys` y sus condiciones, `handleKey`/`handleScreenKey`/`handleMicNote`, `syncExpected`, `syncGuidedHint`, `flashKey`, el efecto de recreación del motor, el efecto de `micReady`, y el bucle rAF. Cambia: cómo se construye `config` (desde `resolveEngineMode`), la barra superior, la franja entrenadora (CoachBar en vez de micBanner/labels sueltos), racha, cuenta atrás, hoja de ajustes y overlay final.

- [ ] **Step 1: Cambios en `src/App.tsx`**

Añadir `onFinish` (guarda récord sin salir) y pasar `onChangeMode` a volver al setup (no a null). Sustituir el archivo entero por:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LibraryScreen from './screens/LibraryScreen';
import SongSetupScreen from './screens/SongSetupScreen';
import PracticeScreen from './screens/PracticeScreen';
import { createSongStore } from './storage/songStore';
import type { SessionConfig } from './core/sessionModes';
import type { Song } from './core/types';

interface PracticeSession {
  song: Song;
  config: SessionConfig;
}

export default function App() {
  const store = useMemo(() => createSongStore(), []);
  const [songs, setSongs] = useState<Song[]>([]);
  const [setupSong, setSetupSong] = useState<Song | null>(null);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const sessionRef = useRef<PracticeSession | null>(null);
  useEffect(() => { sessionRef.current = session; }, [session]);

  useEffect(() => {
    store.list().then(setSongs);
  }, [store]);

  const refresh = useCallback(() => store.list().then(setSongs), [store]);

  /** Guarda la puntuación al terminar la canción, sin salir de la pantalla. */
  const handleFinish = useCallback((score: number | null) => {
    const prev = sessionRef.current;
    if (score !== null && prev) {
      store.recordScore(prev.song.id, score).then(refresh);
    }
  }, [store, refresh]);

  const handleExit = useCallback(() => {
    setSession(null);
    setSetupSong(null);
  }, []);

  const handleAdd = useCallback(async (s: Song, midi: ArrayBuffer) => {
    await store.add(s, midi);
    refresh();
  }, [store, refresh]);
  const handleRemove = useCallback(async (id: string) => { await store.remove(id); refresh(); }, [store, refresh]);

  if (session) {
    return (
      <PracticeScreen
        song={session.song}
        initialConfig={session.config}
        onFinish={handleFinish}
        onExit={handleExit}
        onChangeMode={() => setSession(null)}
      />
    );
  }
  if (setupSong) {
    return (
      <SongSetupScreen
        song={setupSong}
        onBack={() => setSetupSong(null)}
        onStart={config => setSession({ song: setupSong, config })}
      />
    );
  }
  return (
    <LibraryScreen
      songs={songs}
      onAdd={handleAdd}
      onRemove={handleRemove}
      onOpen={setSetupSong}
    />
  );
}
```

(Nota: `handleExit` ya no lleva puntuación — el guardado pasa por `onFinish` en cuanto acaba la canción, así "Repetir" también guarda.)

- [ ] **Step 2: Cambios en `src/screens/PracticeScreen.tsx`**

Partiendo del archivo actual, aplicar estos cambios manteniendo TODO lo no mencionado:

**(a) Imports y props.** Quitar `import type { SessionConfig } from './SongSetupScreen'` y añadir:
```tsx
import { resolveEngineMode, INPUT_LABELS, type SessionConfig } from '../core/sessionModes';
import CoachBar, { type CoachTone } from '../components/CoachBar';
import Countdown from '../components/Countdown';
import SettingsSheet from '../components/SettingsSheet';
import EndOverlay from '../components/EndOverlay';
```
Props nuevas:
```tsx
interface Props {
  song: Song;
  initialConfig: SessionConfig;
  onFinish: (score: number | null) => void; // guarda récord sin salir
  onExit: () => void;
  onChangeMode: () => void;
}
```

**(b) Construcción del config.** Sustituir el `useState<EngineConfig>` inicial y `const micMode = initialConfig.mode === 'mic'` por:
```tsx
const resolved = useMemo(() => resolveEngineMode(initialConfig), [initialConfig]);
const [config, setConfig] = useState<EngineConfig>(resolved.engine);
const micMode = resolved.micMode;
```
Y donde el código actual usa `initialConfig.mode` para `wantsPiano`: `const wantsPiano = playAlongMode || (initialConfig.door === 'play');` se simplifica — con las tres puertas, `wantsPiano = playAlongMode` (el guiado sin mic ya no existe en la UI). `screenInput` queda: `const screenInput = interactive && !micMode && (initialConfig.input === 'screen' || !hasMidi);`

**(c) Estado nuevo.**
```tsx
const [streak, setStreak] = useState(0);
const [maxStreak, setMaxStreak] = useState(0);
const [countingDown, setCountingDown] = useState(false);
const [showSettings, setShowSettings] = useState(false);
const [ended, setEnded] = useState<null | { score: number | null }>(null);
```
En el efecto de recreación del motor (el de `[effectiveSong, config]`), añadir junto a los demás resets: `setStreak(0); setMaxStreak(0); setEnded(null);`

**(d) Racha.** En `handleKey`, donde `result === 'correct'`: `setStreak(s => { const n = s + 1; setMaxStreak(m => Math.max(m, n)); return n; });` y donde `result === 'wrong'`: `setStreak(0);`. Aplicar lo mismo en `handleMicNote` (ambas ramas correct/wrong del `match`).

**(e) Fin de canción.** En el bucle rAF, sustituir el bloque `if (engine.finished) { ... }` por:
```tsx
if (engine.finished) {
  setRunning(false);
  const scored = (engine.config.guidedMode
    || engine.config.playAlongMode
    || (engine.config.waitMode && !engine.config.listenMode))
    && engine.attempted;
  const score = scored ? engine.score() : null;
  setEnded({ score });
  onFinish(score);
  return;
}
```
(y en las deps del efecto, `onExit` pasa a `onFinish`).

**(f) Cuenta atrás.** `start()` pasa a lanzar la cuenta atrás; el arranque real ocurre al terminar:
```tsx
const start = async () => {
  try {
    setAudioError(false);
    await initPiano();
  } catch {
    setAudioError(true);
  }
  setCountingDown(true); // con o sin sonido, se puede practicar
};
const beginAfterCountdown = useCallback(() => {
  setCountingDown(false);
  setRunning(true);
  if (micMode) showFeedback('Empezamos — escucha la primera nota');
}, [micMode, showFeedback]);
```
"Repetir" en el overlay final: `const repeat = () => { setConfig(c => ({ ...c })); };` (recrea el motor por el efecto existente) seguido de `start()`. Concretamente: `onRepeat={() => { setConfig(c => ({ ...c })); void start(); }}`.

**(g) Mensaje de la entrenadora.** Sustituir `micBanner`, `modeBadge` y `midiLabel` por una única función que produce `{ text, tone, chip }` reutilizando la lógica existente (mismo árbol de condiciones del `micBanner` actual para el modo micrófono, y para el resto de modos los textos del `midiLabel` actual):
```tsx
const coach: { text: string; tone: CoachTone; chip: string | null } = (() => {
  const chip = micMode
    ? (mic.status === 'active' || mic.status === 'hearing' || mic.status === 'quiet' ? `🎤 señal ${mic.signalPct}%` : null)
    : listenMode ? '🎧 escuchando'
    : hasMidi ? `🎹 ${midiDevice}`
    : screenInput ? `👆 ${INPUT_LABELS.screen}` : null;

  if (audioError) return { text: '⚠ Sin sonido (revisa conexión) — puedes practicar igualmente', tone: 'warn', chip };
  if (micMode) {
    if (mic.status === 'denied') return { text: 'Necesitas permitir el micrófono en el navegador', tone: 'err', chip };
    if (feedback) return { text: feedback, tone: feedback.startsWith('✓') ? 'ok' : 'err', chip };
    if (!running) return { text: guidedHint ?? 'Pulsa ▶ Empezar — el navegador pedirá permiso de micrófono', tone: 'info', chip };
    if (guidedPhase === 'demo') return { text: guidedHint ?? 'Escucha la nota… 🎧', tone: 'info', chip };
    if (guidedPhase === 'repeat' && !micReady) return { text: guidedHint ?? 'Un momento…', tone: 'warn', chip };
    if (guidedPhase === 'repeat' && mic.heardMidi !== null)
      return { text: `${guidedHint ?? ''} — escucho: ${midiToName(mic.heardMidi)}`, tone: 'ok', chip };
    if (guidedPhase === 'repeat' && mic.status === 'hearing')
      return { text: 'Oigo sonido pero no la nota — toca UNA nota clara y suelta', tone: 'warn', chip };
    if (guidedPhase === 'repeat' && mic.status === 'quiet')
      return { text: 'No escucho nada — acerca el portátil al piano', tone: 'warn', chip };
    return { text: guidedHint ?? '¡Te toca! 🎹', tone: 'ok', chip };
  }
  if (feedback) return { text: feedback, tone: feedback.startsWith('✓') ? 'ok' : 'err', chip };
  if (listenMode) return { text: running ? 'Disfruta — fíjate en los colores de cada mano' : 'Pulsa ▶ para escuchar la canción', tone: 'info', chip };
  if (!running) return { text: 'Pulsa ▶ Empezar cuando estés en posición', tone: 'info', chip };
  const names = [...expected].map(midiToName).join(' + ');
  if (names) return { text: `Toca: ${names} 👇`, tone: 'warn', chip };
  return { text: '¡Sigue así!', tone: 'ok', chip };
})();
```

**(h) JSX.** Sustituir el `return` actual por (conservando NoteFall/Keyboard con sus props idénticas):
```tsx
const keyboardH = Math.max(90, Math.round(size.h * 0.22));
const barH = 48;
const coachH = 46;
const fallH = Math.max(0, size.h - keyboardH - barH - coachH);
const progressPct = effectiveSong.duration > 0 ? Math.min(100, (time / effectiveSong.duration) * 100) : 0;

return (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
    <div style={{ height: barH, display: 'flex', gap: 10, alignItems: 'center', padding: '0 12px' }}>
      <button className="btn-ghost" onClick={onExit} style={{ fontSize: 18 }}>✕</button>
      <div style={{ flex: 1, height: 8, background: 'var(--bg-chip)', borderRadius: 4 }}>
        <div style={{ width: `${progressPct}%`, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, var(--right-soft), var(--right))' }} />
      </div>
      {streak > 1 && <span className="chip" style={{ color: 'var(--left)', fontWeight: 800 }}>✓ {streak} seguidas</span>}
      {liveScore !== null && (playAlongMode || micMode) && (
        <span className="chip" style={{ fontWeight: 800 }}>{liveScore}%</span>
      )}
      <button className="btn-ghost" onClick={() => setShowSettings(true)} style={{ fontSize: 18 }}>⚙</button>
      <button className="btn-primary" style={{ minHeight: 36, padding: '6px 14px' }}
        onClick={running ? () => setRunning(false) : start} disabled={countingDown}>
        {running ? '⏸' : '▶'}
      </button>
    </div>

    <CoachBar text={coach.text} tone={coach.tone} chip={coach.chip} />

    <div style={{ position: 'relative' }}>
      <NoteFall notes={practicedNotes} currentTime={time}
        loMidi={loMidi} hiMidi={hiMidi} width={size.w} height={fallH} />
      {countingDown && <Countdown onDone={beginAfterCountdown} />}
    </div>
    <Keyboard loMidi={loMidi} hiMidi={hiMidi} width={size.w} height={keyboardH}
      pressed={pressed} expected={expected} wrong={wrong} onKey={handleScreenKey}
      interactive={screenInput && !micMode} />

    {showSettings && (
      <SettingsSheet
        level={level} speed={config.speed} hand={config.hand} waitMode={config.waitMode}
        showWaitMode={initialConfig.door === 'learn' && !micMode}
        showHand={!listenMode}
        onChange={patch => {
          if (patch.level !== undefined) setLevel(patch.level);
          if (patch.speed !== undefined) setConfig(c => ({ ...c, speed: patch.speed! }));
          if (patch.hand !== undefined) setConfig(c => ({ ...c, hand: patch.hand! }));
          if (patch.waitMode !== undefined) setConfig(c => ({ ...c, waitMode: patch.waitMode! }));
        }}
        onClose={() => setShowSettings(false)}
      />
    )}

    {ended && (
      <EndOverlay
        score={ended.score}
        maxStreak={maxStreak}
        isRecord={ended.score !== null && ended.score > (song.bestScore ?? -1)}
        onRepeat={() => { setConfig(c => ({ ...c })); void start(); }}
        onChangeMode={onChangeMode}
        onLibrary={onExit}
      />
    )}
  </div>
);
```
Notas: `mic` (resultado de `useMicPitch`) ya existe; el título de la canción sale de la biblioteca y del overlay, no hace falta en la barra (más espacio para el progreso). El `song.title` puede añadirse como `title` del document si se quiere: `useEffect(() => { document.title = song.title; }, [song.title]);` — opcional, incluirlo.

- [ ] **Step 3: Verificar** — `npm test` (67/67) y `npm run build` limpio. `npm run dev`: recorrer Biblioteca → tarjeta → tres puertas → Aprender con pantalla → cuenta atrás → práctica con espera → completar → overlay final (récord ⇒ confeti) → Repetir (guarda) → Biblioteca muestra el récord.

- [ ] **Step 4: Commit (Tasks 7+8 juntas)** — `git add -A && git commit -m "feat(ui): tres puertas y práctica entrenadora (racha, 3-2-1, ajustes, final con confeti)"`

---

### Task 9: Verificación final

- [ ] **Step 1:** `npm test` → 67/67; `npm run build` limpio; `npm run songs` sigue funcionando.
- [ ] **Step 2 (manual):** con `npm run dev`: importar un .mid nuevo (tarjeta aparece con icono y barra), modo Escuchar (sin teclado interactivo), Aprender+pantalla (espera, racha, fallo→tecla roja+sacudida+racha a 0), Tocar (play-along con % en vivo), ajustes ⚙ a mitad (reinicia), pantalla final con récord y confeti, "Cambiar modo" vuelve a las tres puertas.
- [ ] **Step 3 (móvil):** `npm run dev:mobile` y revisar en el iPhone (landscape): safe-areas, chips legibles, teclas con nombre.
- [ ] **Step 4: Commit final** si hubo retoques — `git add -A && git commit -m "chore: verificación del rediseño Luminoso"`

## Queda fuera (spec, "Fuera de alcance")

Modo oscuro, partitura, XP/niveles, sonidos de UI, iconos custom.
