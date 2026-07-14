# Fase 2c — modo libre, bucle A-B y velocidad fina · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuarta puerta "Seguir la canción" (avance continuo sin corrección), bucle de sección A-B con tiradores, y velocidad 10-100% en pasos de 5% ajustable en vivo sin reiniciar.

**Architecture:** Tres capacidades nuevas del motor (`freeMode`, `setLoop/clearLoop`, `setSpeed`) añadidas con TDD sin alterar el comportamiento de los modos existentes; `sessionModes` gana la puerta `follow` y el campo `appSound`; la UI añade `LoopBar` (presentacional) y convierte la velocidad en slider vivo que llama a `engine.setSpeed` sin recrear el motor.

**Tech Stack:** React 18 + TS estricto, CSS puro, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-13-fase-2c-libre-bucle-velocidad-design.md`

**Regla de oro:** los 70 tests actuales siguen verdes SIEMPRE. No tocar `pitchDetect`, `useMicPitch`, `useMidiInput`, `parseMidi`, `songStore`, `simplifySong`.

## Estructura de archivos

```
src/core/practiceEngine.ts        — MODIFICAR: freeMode, setLoop/clearLoop, setSpeed (+seekTo privado)
src/core/practiceEngine.test.ts   — MODIFICAR: tests nuevos
src/core/sessionModes.ts          — MODIFICAR: Door 'follow', appSound
src/core/sessionModes.test.ts     — MODIFICAR: tests nuevos
src/components/LoopBar.tsx        — CREAR: tiradores A-B (presentacional)
src/components/SettingsSheet.tsx  — MODIFICAR: slider de velocidad + interruptor de sonido en follow
src/screens/SongSetupScreen.tsx   — MODIFICAR: cuarta puerta + appSound + slider
src/screens/PracticeScreen.tsx    — MODIFICAR: velocidad viva, bucle, modo libre
```

---

### Task 1: Motor — `setSpeed`, `freeMode` y `setLoop` (TDD)

**Files:** Modify `src/core/practiceEngine.ts`; Test `src/core/practiceEngine.test.ts` (añadir al final)

- [ ] **Step 1: Tests que fallan — añadir a `src/core/practiceEngine.test.ts`:**

```ts
describe('PracticeEngine — setSpeed en vivo', () => {
  it('cambia el ritmo sin reiniciar y con clamp', () => {
    const e = new PracticeEngine(song([note(60, 10)]),
      { waitMode: false, speed: 1, hand: 'both' });
    e.tick(1);
    expect(e.time).toBeCloseTo(1, 5);
    e.setSpeed(0.5);
    e.tick(1);
    expect(e.time).toBeCloseTo(1.5, 5); // no se reinició, y va a la mitad
    expect(e.speed).toBe(0.5);
    e.setSpeed(99);
    expect(e.speed).toBe(2);    // clamp superior
    e.setSpeed(0);
    expect(e.speed).toBe(0.05); // clamp inferior
  });
});

describe('PracticeEngine — freeMode', () => {
  it('avanza continuo, devuelve las notas que cruzan y nunca evalúa', () => {
    const e = new PracticeEngine(song([note(60, 0.5), note(62, 1.5)]),
      { waitMode: true, speed: 1, hand: 'both', freeMode: true });
    const played = e.tick(1);
    expect(played.map(n => n.midi)).toEqual([60]); // cruzó la primera
    expect(e.time).toBeCloseTo(1, 5);              // sin congelarse (waitMode inerte)
    expect(e.onKeyDown(60)).toBe('ignored');
    expect(e.attempted).toBe(false);
    expect(e.expectedNotes()).toEqual([]);
    e.tick(5);
    expect(e.finished).toBe(true);
  });
});

describe('PracticeEngine — bucle A-B', () => {
  it('en continuo: al llegar a B salta a A y las notas se repiten', () => {
    const e = new PracticeEngine(song([note(48, 1, 'left'), note(50, 3, 'left')]),
      { waitMode: false, speed: 1, hand: 'right' }); // izquierda = acompañamiento
    e.setLoop(0.5, 2);
    e.tick(1.2); // llega a 1.2: suena la nota de t=1
    expect(e.time).toBeCloseTo(1.2, 5);
    e.tick(1);   // target 2.2 >= B(2) → salta a A(0.5)
    expect(e.time).toBeCloseTo(0.5, 5);
    const again = e.tick(1); // 0.5→1.5: la nota de t=1 vuelve a sonar
    expect(again.map(n => n.midi)).toEqual([48]);
    expect(e.finished).toBe(false);
  });

  it('en espera: el salto limpia la nota pendiente y vuelve a pedir desde A', () => {
    const e = new PracticeEngine(song([note(60, 1), note(62, 3)]),
      { waitMode: true, speed: 1, hand: 'both' });
    e.setLoop(0.5, 2.5);
    e.tick(2); // se congela en el grupo de t=1
    expect(e.expectedNotes()).toEqual([60]);
    e.onKeyDown(60);
    e.tick(2); // target 3 >= B(2.5) → salta a A, pendiente limpio
    expect(e.time).toBeCloseTo(0.5, 5);
    expect(e.expectedNotes()).toEqual([]);
    e.tick(1); // vuelve a congelarse en el grupo de t=1
    expect(e.expectedNotes()).toEqual([60]); // el mismo grupo se pide otra vez
  });

  it('normaliza argumentos invertidos y fuera de rango, y clearLoop reanuda', () => {
    const e = new PracticeEngine(song([note(60, 1)]),
      { waitMode: false, speed: 1, hand: 'both' });
    e.setLoop(50, -3); // invertido y fuera de [0, duración]
    e.tick(0.2);
    // normalizado a [0, duración]: nunca sale del rango
    expect(e.time).toBeLessThanOrEqual(1.4);
    e.clearLoop();
    e.tick(10);
    expect(e.finished).toBe(true);
  });

  it('en play-along: al saltar, las notas del tramo se pueden volver a acertar', () => {
    const e = new PracticeEngine(song([note(60, 1)]),
      { waitMode: true, speed: 1, hand: 'both', playAlongMode: true });
    e.setLoop(0.5, 2);
    e.tick(1); // t=1: la nota está en ventana
    expect(e.onKeyDown(60)).toBe('correct');
    e.tick(1.2); // target 2.2 >= B → salta a A(0.5)
    e.tick(0.5); // t=1 otra vez: en ventana de nuevo
    expect(e.onKeyDown(60)).toBe('correct'); // se puede repetir el acierto
    expect(e.correct).toBe(2);
  });

  it('freeMode con bucle también salta', () => {
    const e = new PracticeEngine(song([note(60, 1)]),
      { waitMode: true, speed: 1, hand: 'both', freeMode: true });
    e.setLoop(0, 1.2);
    e.tick(1.5); // target >= B → salta a 0
    expect(e.time).toBeCloseTo(0, 5);
    expect(e.finished).toBe(false);
  });
});
```

- [ ] **Step 2:** `npx vitest run src/core/practiceEngine.test.ts` → FAIL (setSpeed/setLoop/freeMode no existen).

- [ ] **Step 3: Implementar en `src/core/practiceEngine.ts`:**

(a) En `EngineConfig`, añadir tras `playAlongMode`:
```ts
  freeMode?: boolean;     // la canción avanza sola; el usuario toca sin evaluación
```

(b) En la clase, añadir campos privados junto a `songDuration` y sustituir TODOS los usos de `this.config.speed` (líneas del tick de listen, playalong, espera/continuo y `beginGuidedGroup`) por `this._speed`:
```ts
  private _speed: number;
  private loop: { start: number; end: number } | null = null;
```
En el constructor, primera línea del cuerpo: `this._speed = config.speed;`
En el constructor, cambiar `if (config.listenMode) {` por `if (config.listenMode || config.freeMode) {` (el modo libre reproduce todas las notas, como escuchar).

(c) Métodos públicos nuevos (tras `score()`):
```ts
  /** Velocidad actual (0.05–2). */
  get speed(): number {
    return this._speed;
  }

  /** Cambia el ritmo en vivo, sin reiniciar la canción. */
  setSpeed(v: number): void {
    this._speed = Math.min(2, Math.max(0.05, v));
  }

  /** Activa el bucle A-B (normaliza: intercambia si vienen invertidos y recorta a [0, duración]). */
  setLoop(startSec: number, endSec: number): void {
    let a = Math.min(startSec, endSec);
    let b = Math.max(startSec, endSec);
    a = Math.max(0, Math.min(a, this.songDuration));
    b = Math.max(0, Math.min(b, this.songDuration));
    if (b - a < 0.5) return; // tramo degenerado: se ignora
    this.loop = { start: a, end: b };
  }

  clearLoop(): void {
    this.loop = null;
  }

  /** Recoloca el reloj y todos los índices internos en el instante t. */
  private seekTo(t: number): void {
    this.time = t;
    this.pending = null;
    this.groupIdx = this.groups.findIndex(g => g.time >= t);
    if (this.groupIdx === -1) this.groupIdx = this.groups.length;
    this.accompanimentIdx = this.accompaniment.findIndex(n => n.time >= t);
    if (this.accompanimentIdx === -1) this.accompanimentIdx = this.accompaniment.length;
    this.practicedIdx = this.practiced.findIndex(n => n.time >= t);
    if (this.practicedIdx === -1) this.practicedIdx = this.practiced.length;
    // Las dianas del play-along del tramo vuelven a estar disponibles
    this.hitKeys = new Set([...this.hitKeys].filter(k => Number(k.split('-')[1]) < t));
  }
```

(d) En `tick()`, integrar el salto del bucle en las TRES ramas temporales (guiado queda sin bucle). La rama listen/free queda así (sustituye a la actual de listenMode):
```ts
    if (this.config.listenMode || this.config.freeMode) {
      const raw = this.time + dtSeconds * this._speed;
      if (this.loop && raw >= this.loop.end) {
        const toPlay = this.collectPracticed(this.loop.end);
        this.seekTo(this.loop.start);
        return toPlay;
      }
      const target = Math.min(raw, this.songDuration);
      const toPlay = this.collectPracticed(target);
      this.time = target;
      return toPlay;
    }
```
con el helper privado (extrae el while actual):
```ts
  private collectPracticed(upTo: number): SongNote[] {
    const toPlay: SongNote[] = [];
    while (
      this.practicedIdx < this.practiced.length &&
      this.practiced[this.practicedIdx].time <= upTo
    ) {
      toPlay.push(this.practiced[this.practicedIdx]);
      this.practicedIdx += 1;
    }
    return toPlay;
  }
```
La rama play-along, análoga (sustituye a la actual):
```ts
    if (this.config.playAlongMode) {
      const raw = this.time + dtSeconds * this._speed;
      if (this.loop && raw >= this.loop.end) {
        const toPlay = this.collectAccompaniment(this.loop.end);
        this.seekTo(this.loop.start);
        return toPlay;
      }
      const target = Math.min(raw, this.songDuration);
      const toPlay = this.collectAccompaniment(target);
      this.time = target;
      return toPlay;
    }
```
con su helper (extrae el while del acompañamiento, que también usa la rama espera/continuo):
```ts
  private collectAccompaniment(upTo: number): SongNote[] {
    const toPlay: SongNote[] = [];
    while (
      this.accompanimentIdx < this.accompaniment.length &&
      this.accompaniment[this.accompanimentIdx].time <= upTo
    ) {
      toPlay.push(this.accompaniment[this.accompanimentIdx]);
      this.accompanimentIdx += 1;
    }
    return toPlay;
  }
```
Y en la rama espera/continuo, insertar el salto ANTES de la lógica de grupos (tras calcular `let target = ...`):
```ts
    let target = this.time + dtSeconds * this._speed;

    if (this.loop && target >= this.loop.end) {
      const toPlay = this.collectAccompaniment(this.loop.end);
      this.seekTo(this.loop.start);
      return toPlay;
    }
```
(el resto de la rama — waitMode/continuo, acompañamiento con `collectAccompaniment(target)`, clamp final — igual que ahora pero usando el helper).

(e) En `finished`, añadir al principio: `if (this.loop) return false;` (con bucle activo la sesión no termina). En `onKeyDown`, cambiar la primera línea por `if (this.config.listenMode || this.config.freeMode) return 'ignored';`

- [ ] **Step 4:** `npx vitest run src/core/practiceEngine.test.ts` → PASS (15 tests: 9 previos + 6 nuevos). `npm test` completo → 76/76. `npm run build` limpio.
  OJO: `PracticeScreen` usa `engine.config.speed` en el rAF (`n.duration / engine.config.speed`). Sigue compilando (config.speed existe) pero queda desfasado si cambia la velocidad en vivo — se corrige en la Task 4. No tocarlo aquí.

- [ ] **Step 5: Commit** — `git add src/core/practiceEngine* && git commit -m "feat: motor — velocidad en vivo, modo libre y bucle A-B"`

---

### Task 2: sessionModes — puerta `follow` y `appSound` (TDD)

**Files:** Modify `src/core/sessionModes.ts`, `src/core/sessionModes.test.ts`

- [ ] **Step 1: Tests que fallan — añadir a `src/core/sessionModes.test.ts`:**

```ts
describe('puerta follow (modo libre)', () => {
  it('seguir → freeMode, sin evaluación ni mic', () => {
    const r = resolveEngineMode({ ...base, door: 'follow' });
    expect(r.engine.freeMode).toBe(true);
    expect(r.micMode).toBe(false);
    expect(r.engine.listenMode).toBeFalsy();
    expect(r.engine.guidedMode).toBeFalsy();
    expect(r.engine.playAlongMode).toBeFalsy();
  });
  it('pickDefaultInput en follow: midi si hay, si no pantalla (nunca mic)', () => {
    expect(pickDefaultInput(true, 'follow')).toBe('midi');
    expect(pickDefaultInput(false, 'follow')).toBe('screen');
  });
});
```
(El objeto `base` del archivo no lleva `appSound`; al añadir el campo como opcional los tests existentes no cambian.)

- [ ] **Step 2:** correr el archivo → FAIL (door 'follow' no compila).

- [ ] **Step 3: Implementar en `src/core/sessionModes.ts`:**
- `export type Door = 'listen' | 'follow' | 'learn' | 'play';`
- En `SessionConfig`, añadir: `appSound?: boolean; // solo puerta follow: la app suena las notas (default true)`
- En `DOOR_LABELS` (ORDEN: listen, follow, learn, play — el setup itera las claves):
```ts
  follow: { icon: '👀', title: 'Seguir la canción', hint: 'Avanza sola; tú tocas sin corrección' },
```
- En `resolveEngineMode`: `freeMode: cfg.door === 'follow',` dentro del objeto `engine`, y `listenMode: cfg.door === 'listen',` queda igual.
- En `pickDefaultInput`: sin cambios de código (`door === 'learn' ? 'mic' : 'screen'` ya da screen para follow) — los tests lo fijan.

- [ ] **Step 4:** `npm test` → 78/78. **Step 5: Commit** — `git add src/core/sessionModes* && git commit -m "feat: puerta 'seguir la canción' en el mapeo de sesión"`

---

### Task 3: LoopBar + SettingsSheet (slider y sonido)

**Files:** Create `src/components/LoopBar.tsx`; Modify `src/components/SettingsSheet.tsx`

- [ ] **Step 1: `src/components/LoopBar.tsx`**

```tsx
import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

interface Props {
  duration: number;       // segundos de la canción
  start: number;          // segundos del marcador A
  end: number;            // segundos del marcador B
  currentTime: number;
  onChange: (start: number, end: number) => void;
  onSetAHere: () => void;
  onSetBHere: () => void;
  onClear: () => void;
}

const MIN_GAP = 1; // segundos mínimos entre A y B

/** Barra de bucle A-B con tiradores arrastrables. Presentacional. */
export default function LoopBar({ duration, start, end, currentTime, onChange, onSetAHere, onSetBHere, onClear }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  function timeAt(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return frac * duration;
  }

  function dragHandle(which: 'a' | 'b') {
    return (e: ReactPointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        const t = timeAt(ev.clientX);
        if (which === 'a') onChange(Math.min(t, end - MIN_GAP), end);
        else onChange(start, Math.max(t, start + MIN_GAP));
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };
  }

  const pct = (t: number) => `${duration > 0 ? (t / duration) * 100 : 0}%`;
  const handleStyle: CSSProperties = {
    position: 'absolute', top: -10, width: 32, height: 32, marginLeft: -16,
    borderRadius: '50%', background: 'var(--right)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 800, touchAction: 'none',
    boxShadow: 'var(--shadow)', cursor: 'grab',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 4px' }}>
      <span className="chip">🔁</span>
      <div ref={trackRef} style={{ position: 'relative', flex: 1, height: 12, background: 'var(--bg-chip)', borderRadius: 6 }}>
        <div style={{
          position: 'absolute', left: pct(start), width: `calc(${pct(end)} - ${pct(start)})`,
          height: 12, background: 'var(--right-pale)', border: '1px solid var(--right-soft)', borderRadius: 6,
        }} />
        <div style={{ position: 'absolute', left: pct(currentTime), width: 2, height: 12, background: 'var(--right)' }} />
        <div style={{ ...handleStyle, left: pct(start) }} onPointerDown={dragHandle('a')}>A</div>
        <div style={{ ...handleStyle, left: pct(end), background: 'var(--left)' }} onPointerDown={dragHandle('b')}>B</div>
      </div>
      <button className="btn-ghost" style={{ fontSize: 12, padding: 4 }} onClick={onSetAHere}>A aquí</button>
      <button className="btn-ghost" style={{ fontSize: 12, padding: 4 }} onClick={onSetBHere}>B aquí</button>
      <button className="btn-ghost" style={{ fontSize: 14, padding: 4 }} onClick={onClear}>✕</button>
    </div>
  );
}
```

- [ ] **Step 2: `src/components/SettingsSheet.tsx`** — dos cambios:

(1) El `<label>` de Velocidad (select de SPEEDS) se sustituye por un slider vivo:
```tsx
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 90, color: 'var(--ink-2)' }}>Velocidad</span>
            <input
              type="range" min={10} max={100} step={5}
              value={Math.round(speed * 100)}
              onChange={e => onChange({ speed: Number(e.target.value) / 100 })}
              style={{ flex: 1 }}
            />
            <span style={{ width: 44, fontWeight: 700, textAlign: 'right' }}>{Math.round(speed * 100)}%</span>
          </label>
```
y se elimina la constante `SPEEDS` del archivo.

(2) Props nuevas para el sonido del modo libre — añadir a `Props`:
```ts
  /** Solo en modo libre: interruptor "la app toca las notas". null = no mostrar. */
  appSound: boolean | null;
  onAppSound?: (on: boolean) => void;
```
y tras el label de Espera:
```tsx
          {appSound !== null && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 90, color: 'var(--ink-2)' }}>Sonido</span>
              <input type="checkbox" checked={appSound} onChange={e => onAppSound?.(e.target.checked)} />
              <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>la app toca las notas</span>
            </label>
          )}
```
(3) El texto final cambia a: `Cambiar nivel o mano reinicia la canción; la velocidad y el sonido se aplican al momento.`

- [ ] **Step 3:** `npm run build` → FALLARÁ en PracticeScreen (props nuevas obligatorias de SettingsSheet). Es esperado: NO commitear aún — Tasks 3, 4 y 5 se commitean juntas al final de la Task 5. Verificar solo `npx tsc --noEmit 2>&1 | grep -v PracticeScreen` si se quiere comprobar el resto.

---

### Task 4: SongSetupScreen — cuarta puerta, appSound y slider

**Files:** Modify `src/screens/SongSetupScreen.tsx`

- [ ] **Step 1:** Cambios:
(1) La constante `DOOR_COLORS` gana la entrada follow:
```ts
  follow: { border: 'var(--right-soft)', bg: 'var(--right-pale)' },
```
y la de learn pasa a `{ border: 'var(--listen)', bg: 'var(--listen-pale)' }`... NO — mantener learn como está (naranja) y dar a follow: `{ border: '#b48ead', bg: '#f3e3f5' }` (malva suave, distinto de las otras tres).
(2) Estado nuevo: `const [appSound, setAppSound] = useState(true);`
(3) `start()` pasa a: `onStart({ door, input: effectiveInput, level, speed, hand, waitMode: true, appSound });`
(4) Tras el bloque de chips de entrada, para la puerta follow:
```tsx
        {door === 'follow' && (
          <label className="chip" style={{ marginBottom: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={appSound} onChange={e => setAppSound(e.target.checked)} />
            🔊 La app toca las notas (apágalo para tocar solo tú)
          </label>
        )}
```
(5) El `<select>` de Velocidad del panel de opciones se sustituye por el mismo slider 10–100 step 5 de la Task 3 (value `Math.round(speed*100)`, onChange `setSpeed(Number(e.target.value)/100)`, con el % visible al lado) y se elimina la constante `SPEEDS`.
(6) El chip de entrada ya funciona para follow sin cambios (mic no aparece: `door === 'learn'` sigue siendo la condición del mic en `availableInputs`).
(7) En "Recomendado" nada cambia (sigue en learn). El texto del botón final sigue siendo "▶ Empezar".

- [ ] **Step 2:** No commitear (build roto hasta Task 5).

---

### Task 5: PracticeScreen — velocidad viva, bucle y modo libre

**Files:** Modify `src/screens/PracticeScreen.tsx`. Un solo commit para Tasks 3+4+5.

- [ ] **Step 1:** Cambios, preservando todo lo no mencionado:

(a) Imports: añadir `import LoopBar from '../components/LoopBar';`

(b) Flags y estado nuevo (junto a los existentes):
```tsx
const freeMode = !!config.freeMode;
const [speed, setSpeedState] = useState(resolved.engine.speed);
const speedRef = useRef(speed);
const [appSound, setAppSound] = useState(initialConfig.appSound ?? true);
const [loop, setLoopState] = useState<{ start: number; end: number } | null>(null);
const loopRef = useRef(loop);
```
`resolved.engine.speed` ya existe vía `resolveEngineMode`. IMPORTANTE: la velocidad DEJA de vivir en `config` para no recrear el motor al cambiarla.

(c) Efectos de sincronización (tras el efecto de recreación del motor):
```tsx
// Velocidad viva: se aplica al motor sin recrearlo
useEffect(() => {
  speedRef.current = speed;
  engineRef.current?.setSpeed(speed);
}, [speed]);

// Bucle: se aplica/limpia sin recrear el motor
useEffect(() => {
  loopRef.current = loop;
  const engine = engineRef.current;
  if (!engine) return;
  if (loop) engine.setLoop(loop.start, loop.end);
  else engine.clearLoop();
}, [loop]);
```
Y DENTRO del efecto de recreación (el de `[effectiveSong, config]`), tras crear el motor, añadir:
```tsx
engineRef.current.setSpeed(speedRef.current);
if (loopRef.current) engineRef.current.setLoop(loopRef.current.start, loopRef.current.end);
```
(así nivel/mano conservan velocidad y bucle). El motor se sigue construyendo con `new PracticeEngine(effectiveSong, config)` — `config.speed` es solo el valor inicial y `setSpeed` lo pisa al instante.

(d) En el bucle rAF: `const dur = n.duration / engine.speed;` (antes `engine.config.speed`), y el playNote condicionado:
```tsx
for (const n of engine.tick(dt)) {
  const dur = n.duration / engine.speed;
  if (!freeMode || appSound) playNote(n.midi, dur);
  if (engine.config.listenMode || engine.config.guidedMode || freeMode) flashKey(n.midi, dur);
}
```
En el cálculo de `scored` del bloque finished, añadir `&& !engine.config.freeMode` al término de espera:
```tsx
const scored = (engine.config.guidedMode
  || engine.config.playAlongMode
  || (engine.config.waitMode && !engine.config.listenMode && !engine.config.freeMode))
  && engine.attempted;
```
(Red de seguridad: en free `attempted` ya es siempre false.)

(e) Botón y estado del bucle en la barra superior (entre el chip de racha y ⚙; oculto en micMode):
```tsx
{!micMode && (
  <button className="btn-ghost" style={{ fontSize: 16 }}
    onClick={() => {
      if (loop) { setLoopState(null); return; }
      const engine = engineRef.current;
      const dur = effectiveSong.duration;
      const a = Math.min(engine?.time ?? 0, Math.max(0, dur - 1));
      const b = Math.min(dur, a + 8);
      setLoopState({ start: a, end: b });
    }}>
    {loop ? '🔁✓' : '🔁'}
  </button>
)}
```
Y bajo la CoachBar, cuando hay bucle:
```tsx
{loop && (
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
Ajustar `fallH` para restar la altura del LoopBar cuando está visible: `const loopH = loop ? 56 : 0;` y `const fallH = Math.max(0, size.h - keyboardH - barH - coachH - loopH);`

(f) SettingsSheet: actualizar el uso —
```tsx
<SettingsSheet
  level={level} speed={speed} hand={config.hand} waitMode={config.waitMode}
  showWaitMode={initialConfig.door === 'learn' && !micMode}
  showHand={!listenMode && !freeMode}
  appSound={freeMode ? appSound : null}
  onAppSound={setAppSound}
  onChange={patch => {
    if (patch.level !== undefined) setLevel(patch.level);
    if (patch.speed !== undefined) setSpeedState(patch.speed);
    if (patch.hand !== undefined) setConfig(c => ({ ...c, hand: patch.hand! }));
    if (patch.waitMode !== undefined) setConfig(c => ({ ...c, waitMode: patch.waitMode! }));
  }}
  onClose={() => setShowSettings(false)}
/>
```
(velocidad ya NO pasa por setConfig — no reinicia).

(g) Coach del modo libre — en el árbol de mensajes, tras el caso `listenMode`, añadir:
```tsx
if (freeMode) return {
  text: running ? 'Modo libre — toca a tu aire 🎵' : 'Pulsa ▶ y sigue la cascada a tu ritmo',
  tone: 'info', chip,
};
```
y en el cálculo del `chip`, tratar free como interactivo normal (cable/pantalla; sin cambios de código si ya cae en las ramas hasMidi/screenInput).

- [ ] **Step 2: Verificar** — `npm test` (78/78), `npm run build` limpio, dev server `curl -k https://localhost:5173/` → 200.
- [ ] **Step 3: Commit (Tasks 3+4+5)** — `git add -A && git commit -m "feat(ui): puerta seguir la canción, bucle A-B y velocidad fina en vivo"`

---

### Task 6: Verificación final

- [ ] `npm test` → 78/78; `npm run build` limpio.
- [ ] Manual (dev server): puerta 👀 visible en segundo lugar; en follow la cascada avanza, las teclas se iluminan al paso, tocar no corrige nada, interruptor 🔊 funciona en setup y en ⚙; bucle: 🔁 activa tiradores, arrastrarlos funciona con el dedo/ratón, "A aquí/B aquí", al llegar a B vuelve a A (probar en Aprender: pide las mismas notas otra vez), ✕ lo quita y la canción puede terminar; velocidad: slider en ⚙ cambia el ritmo al instante SIN reiniciar (verificar que la posición no salta), y por debajo del 25% funciona.
- [ ] iPhone (`npm run dev:mobile`): tiradores A/B manejables con el dedo, slider usable, safe areas.
- [ ] Commit final si hay retoques.
