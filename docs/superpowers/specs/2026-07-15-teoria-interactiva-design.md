# Diseño: Aprender teoría (interactiva) — Fase 3

**Fecha:** 2026-07-15
**Estado:** Aprobado por el usuario (enfoque y maquetas validados en el compañero visual)

## Contexto y alcance

Nuevo apartado "Teoría" que enseña teoría musical de piano **de forma interactiva sobre el teclado** de la app. La petición original ("de principiante a nivel maestro") es un temario completo imposible de un tirón, así que se construye **el motor de lecciones + los 3 primeros niveles**; los niveles avanzados son ampliación de contenido posterior (datos, no código). Principios que se conservan: gratis y local (IndexedDB, sin backend), en español, tema Luminoso, iPhone horizontal, y **sin tocar** el motor de práctica de canciones ni la detección.

Decisiones tomadas con el usuario:
- Teoría **interactiva en el teclado** (no curso de lectura).
- **Camino guiado por niveles** que se desbloquean en orden.
- Teclado **realista** (reutiliza el componente `Keyboard` con negras y nombres).

## Modelo de datos (lecciones como datos tipados)

Tipos en `src/core/theory/types.ts`:

```ts
type StepTeach  = { kind: 'teach';  text: string; keys: number[]; play?: boolean };
type StepPlay   = { kind: 'play';   text: string; keys: number[]; anyOctave?: boolean };
type StepChoose = { kind: 'choose'; text: string; options: string[]; answer: number };
type LessonStep = StepTeach | StepPlay | StepChoose;

interface Lesson { id: string; title: string; steps: LessonStep[] }
interface Level  { id: string; index: number; title: string; subtitle: string; lessons: Lesson[] }
```

- `keys` son números MIDI. En `teach`, esas teclas se iluminan (y suenan si `play`). En `play`, el usuario debe pulsarlas; `anyOctave` acepta la nota en cualquier octava (compara por clase de nota, reutilizando `matchExpected` de `pitchDetect`).
- El contenido vive en `src/core/theory/content.ts` (array de `Level`), tipado y validado por el compilador. Añadir niveles = añadir datos.

## Motor de progreso (puro, con tests)

`src/core/theory/progress.ts`:
- `isLessonUnlocked(levels, completed, levelId, lessonId): boolean` — una lección se desbloquea si es la primera del primer nivel, o si la anterior (en orden de nivel→lección) está completada.
- `isLevelUnlocked(levels, completed, levelId): boolean` — un nivel se desbloquea cuando todas las lecciones del nivel anterior están completas (el primero siempre).
- `levelProgress(level, completed): { done: number; total: number }`.
- `completed` es un `Set<string>` de ids de lección. Lógica pura → tests unitarios (primera desbloqueada, cadena de desbloqueo, nivel completo desbloquea el siguiente, idempotencia).

## Persistencia

`src/storage/theoryStore.ts` sobre IndexedDB (`idb-keyval`, patrón inyectable como `songStore`): clave `theory-completed-v1` con la lista de ids de lección completadas. API: `listCompleted(): Promise<string[]>`, `markCompleted(lessonId): Promise<void>` (idempotente). Test con KV en memoria.

## Pantallas y componentes

- **Inicio con dos áreas** (`App.tsx`): cabecera con dos pestañas/cards **🎵 Canciones** y **📚 Teoría**. Canciones abre la biblioteca actual (sin cambios); Teoría abre el sendero. Estado de navegación en `App`.
- **`TheoryPathScreen`**: lista de niveles (círculo de estado ✓ completo / ▶ en curso / 🔒 bloqueado, barra de progreso por nivel) y sus lecciones; abre una lección desbloqueada. Estilo Luminoso.
- **`LessonScreen`** (reproductor de pasos): barra superior (✕ salir + progreso paso N/total), zona de contenido según el tipo de paso, y el `Keyboard` realista abajo. Componentes de paso en `src/components/lesson/`:
  - `TeachStep`: texto + `Keyboard` con `expected` = `keys` iluminadas + botón "▶ Escuchar" (usa `playNote`) + "Siguiente".
  - `PlayStep`: texto + `Keyboard` interactivo; al pulsar, compara con `keys` (exacta o por clase si `anyOctave`), feedback verde/rojo (reutiliza `pressed`/`wrong`/`expected` del `Keyboard`), avanza al acertar todas.
  - `ChooseStep`: texto + botones de opción; marca correcta/incorrecta, avanza al acertar.
- Al completar el último paso: overlay de fin (reutiliza patrón visual de `EndOverlay`, sin puntuación) con "Siguiente lección" / "Volver al sendero"; se llama a `markCompleted`.

## Entrada

Primaria: **teclado en pantalla** (táctil) — funciona sin cable, que es el caso del usuario. Reutiliza opcionalmente MIDI/teclado de ordenador vía los hooks existentes en los pasos `play` (mismo `onKey`). El micrófono queda fuera de Teoría en esta fase (añade complejidad; la pantalla basta para aprender los conceptos).

## Contenido v1 (3 niveles)

1. **Conoce el teclado**: blancas y negras, grupos de 2 y 3, localizar Do–Si (con `anyOctave`), octavas, agudo/grave. Mezcla de `teach`/`play`/`choose`.
2. **Ritmo y pulso**: negras, blancas, redondas, silencios, el pulso 4/4 (conceptual con `teach`/`choose`; algún `play` de repetir un pulso simple).
3. **Sostenidos y bemoles**: las negras tienen nombre, tono y semitono (`teach`/`play`/`choose`).

Cada nivel: 4-6 lecciones cortas de 6-12 pasos.

## Manejo de errores

- Paso `play`: pulsar tecla equivocada → feedback rojo breve (sacudida, ya en `Keyboard`), no avanza, sin penalización; se puede reintentar.
- Paso `choose`: opción equivocada → se marca en rojo, permite reintentar.
- Lección abierta estando bloqueada: no ocurre (la UI solo abre desbloqueadas); defensa: `LessonScreen` no depende del desbloqueo, solo reproduce.
- Contenido vacío/incoherente: el compilador garantiza la forma; `progress.ts` maneja `completed` con ids inexistentes ignorándolos.

## Pruebas

- Unitarias: `progress.ts` (desbloqueo), `theoryStore.ts` (persistencia con KV en memoria), y un validador de `content.ts` (todos los `keys` en 21..108; `answer` dentro de rango de `options`; ids únicos) como test.
- Los pasos de UI se verifican manualmente (patrón del proyecto); la lógica evaluable vive en funciones puras.

## Fuera de alcance

- Niveles más allá del 3 (intervalos, escalas, acordes, lectura de partitura, modos, armonía…): ampliación posterior, mismo motor.
- Micrófono en teoría; partitura; gamificación con XP/puntos; modo oscuro; audio de metrónomo real para ritmo (se explica visual/conceptualmente en v1).
