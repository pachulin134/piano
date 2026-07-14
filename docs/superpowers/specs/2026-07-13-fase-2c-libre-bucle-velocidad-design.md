# Diseño: Fase 2c — modo libre, bucle A-B y velocidad fina

**Fecha:** 2026-07-13
**Estado:** Aprobado por el usuario

## Contexto

Ampliación sobre el rediseño Luminoso (Fase 2b). Principios que se conservan: gratis y local (navegador + IndexedDB), .mid del usuario, iPhone horizontal como dispositivo principal, tema Luminoso, motor estable (cambios en `practiceEngine` solo con tests), y el flujo tres-puertas + entrenadora — las funciones nuevas se añaden, no sustituyen. La **partitura sincronizada** (punto 4 de la petición) queda explícitamente fuera: tendrá su propio spec.

## 1. Cuarta puerta: 👀 Seguir la canción (modo libre)

- Nueva puerta en `SongSetupScreen`, entre Escuchar y Aprender: icono 👀, título "Seguir la canción", pista "Avanza sola; tú tocas a tu aire, sin corrección".
- **Motor** (`EngineConfig.freeMode?: boolean`, TDD): el reloj avanza continuo (idéntico a `listenMode` en el tiempo); `tick()` devuelve las notas que van cruzando (todas las de la canción practicada) para que la pantalla las pueda sonar/iluminar; `onKeyDown()` devuelve siempre `'ignored'` (no puntúa, no bloquea); `expectedNotes()` vacío; `finished` = tiempo agotado; `attempted` queda false → nunca se guarda puntuación.
- **Precedencia de flags** en el motor: `listenMode` → `guidedMode` → `playAlongMode` → `freeMode` → espera/continuo. `resolveEngineMode` garantiza que solo uno está activo.
- **`sessionModes`**: `Door` gana `'follow'`; mapeo `follow → freeMode`; `pickDefaultInput(hasMidi,'follow')` = midi si hay, si no screen (nunca mic). Tests de la tabla ampliados.
- **Pantalla**: las notas que devuelve `tick()` se iluminan en el teclado (guía) y suenan solo si el interruptor "🔊 la app toca las notas" está activo (nuevo campo `appSound: boolean` en `SessionConfig`, default `true`, visible en el setup solo para la puerta follow y en la hoja ⚙ durante follow). Las teclas que pulse el usuario (pantalla/PC/MIDI) se iluminan y suenan (pantalla/PC) como siempre, sin evaluación. Coach: "Modo libre — toca a tu aire 🎵". Final: overlay sin porcentaje.

## 2. Bucle de sección A-B

- **Motor** (TDD): `setLoop(startSec: number, endSec: number): void` y `clearLoop(): void`. En `tick()`, tras calcular `target`: si hay bucle y `target >= endSec`, se salta a `startSec`: `time = startSec`, `pending = null`, y los índices internos (`groupIdx`, `accompanimentIdx`, `practicedIdx`) se recolocan al primer elemento con `time >= startSec`. Las notas devueltas en ese tick son las anteriores al salto (no se "re-suenan" las del inicio hasta el siguiente tick). Con bucle activo `finished` no puede dispararse (el salto ocurre antes de llegar al final; si `endSec >= duration` se salta igualmente).
  - Tests: salto en modo espera (pending limpiado, siguiente grupo ≥ A), en continuo, en free; recolocación de índices; bucle con endSec = duration; clearLoop reanuda el flujo normal.
- **UI** (`PracticeScreen` + componente nuevo `LoopBar`): botón "🔁" en la barra superior. Al activarlo: la barra de progreso muestra dos tiradores A y B arrastrables (pointer events, targets táctiles ≥ 32 px, mínimo 1 s entre A y B, clamp a [0, duración]) + botones "A aquí" / "B aquí" (fijan el marcador en el tiempo actual) + "✕" para quitar el bucle. Al activar el bucle, la reproducción salta a A. Los valores viven en estado de la pantalla y se aplican con `engine.setLoop/clearLoop` (sin recrear el motor); al recrear el motor (cambio de nivel/mano) el bucle se re-aplica.
- **Disponibilidad**: puertas Escuchar, Seguir, Aprender (espera) y Tocar. En Aprender-con-micrófono (modo guiado) el botón 🔁 no se muestra (su reloj no fluye linealmente).
- Puntuaciones: con bucle activo nunca llega el final ⇒ nunca se graba récord (deseado). Sin persistencia del bucle entre sesiones (YAGNI).

## 3. Velocidad fina en vivo

- **Motor** (TDD): método `setSpeed(v: number): void` que actualiza la velocidad usada por `tick()` en vivo (clamp 0.05–2). Nota: `config` es el objeto pasado al constructor; `setSpeed` muta la velocidad interna sin recrear nada.
- **UI**: el `<select>` de velocidad (setup y hoja ⚙) pasa a **slider 10%–100% en pasos de 5%** con el valor visible ("45%"). En la hoja ⚙, mover el slider llama a `engine.setSpeed` directamente y **no reinicia la canción** (la velocidad sale del objeto `config` de recreación y pasa a estado propio de la pantalla). Nivel y mano siguen recreando el motor (reconstruyen las notas); el texto de la hoja se ajusta: "Cambiar nivel o mano reinicia la canción".
- El acompañamiento ya programado suena con la duración calculada en su momento; los siguientes usan la nueva velocidad (aceptado).

## Manejo de errores

- Tiradores A/B: A siempre < B (se empujan mutuamente respetando el mínimo de 1 s); arrastres fuera de rango se recortan.
- `setLoop` con argumentos invertidos o fuera de [0, duration]: el motor los normaliza (swap + clamp) — con test.
- `setSpeed` fuera de rango: clamp — con test.

## Fuera de alcance

Partitura sincronizada (spec propio futuro), persistencia de bucles, marcadores por compás (los tiradores van por tiempo), bucle en modo guiado/micrófono, cuenta de repeticiones del bucle.
