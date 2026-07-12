# Diseño: Rediseño "Luminoso" — visual y experiencia de usuario (Fase 2b)

**Fecha:** 2026-07-13
**Estado:** Aprobado por el usuario (elecciones hechas con maquetas en el compañero visual)

## Decisiones del usuario

| Decisión | Elección |
|---|---|
| Personalidad visual | **B · Luminoso**: claro, cálido y motivador (estilo app de idiomas); descartados "Escenario" (elegante oscuro) y "Neón arcade" |
| Pantalla de práctica | **B · Entrenadora**: mensajes de ánimo, racha de aciertos y pistas, sobre una base despejada |
| Elección de modo | **A · Tres puertas**: Escuchar / Aprender paso a paso / Tocar con la canción, con detección automática de la entrada |

## 1. Sistema visual (design tokens)

Variables CSS en `src/styles.css` — única fuente de verdad; los componentes dejan de repetir estilos inline para colores/sombras/radios (los inline de layout puntual pueden quedarse):

- **Fondos:** crema `#f7f5f0` (app), blanco `#ffffff` (tarjetas), degradado suave `#faf8f4→#f2ede4` (zona de cascada).
- **Tinta:** `#2b2620` (títulos), `#6b6152` (texto secundario), `#8d8271`/`#a09585` (terciario).
- **Acentos con significado fijo:** naranja `#e8734a` + ámbar `#f5a623` = mano derecha / marca; verde `#4a9e50` + `#7bc47f` = mano izquierda / acierto; azul suave `#5b8fd4`/`#dbe9f7` = escuchar; rojo suave `#d9534f` = fallo.
- **Forma:** radios 12–16 px, sombras `0 2px 8px rgba(60,40,20,.08)`, botones y chips con padding generoso (táctil ≥ 44 px de alto en acciones principales).
- **Tipografía:** system-ui; títulos 700/800; textos cortos.
- Clases utilitarias: `.card`, `.btn-primary`, `.btn-ghost`, `.chip`, `.coach` (franja entrenadora).

**Componentes re-tematizados:**
- `NoteFall`: fondo claro degradado, notas redondeadas con sombra — naranja (derecha) / verde (izquierda) —, línea de "ahora" naranja translúcida.
- `Keyboard`: teclas blanco/crema con borde `#e5ddd0`, negras `#3a352d`; **nombre de la nota (Do…Si) rotulado en cada tecla blanca** (y en negras si cabe); esperada = ámbar, pulsada correcta = flash verde, fallo = rojo suave + sacudida CSS breve.

## 2. Biblioteca (`LibraryScreen`)

- Cabecera: "¡Hola! 👋" + subtítulo con nº de canciones.
- Tarjeta por canción: icono/emoji sobre fondo de color (derivado del id, paleta pastel), título, dificultad ★, duración, **barra de progreso con la mejor puntuación** (naranja→verde según %), botón primario "Practicar", borrar en secundario (icono).
- Importación: zona señalizada "Arrastra tu .mid aquí o pulsa +", con la misma tarjeta de error amable actual.
- Estado vacío: ilustración simple (emoji grande) + texto de bienvenida.

## 3. Tres puertas (`SongSetupScreen`)

- 3 tarjetas grandes: **🎧 Escuchar** ("mira y escucha cómo suena"), **🪜 Aprender paso a paso** ("nota a nota, a tu ritmo" — marcada *Recomendado*), **🎹 Tocar con la canción** ("a ritmo real").
- **Chip de entrada** bajo las tarjetas: "Te escucho por: {cable MIDI ✓ / micrófono / pantalla} · cambiar". Detección automática con prioridad: MIDI conectado → micrófono (solo relevante en Aprender) → pantalla/teclado PC. "Cambiar" abre un selector inline de las entradas disponibles.
- Opciones como chips compactos: Nivel (Fácil/Medio/Original), Velocidad (25–100 %), Mano (con colores naranja/verde/ambas).
- **Mapeo a los modos internos existentes** (el motor no cambia):
  - Escuchar → `listen`.
  - Aprender + entrada micrófono → modo `mic` (demo + repetir, actual).
  - Aprender + entrada MIDI o pantalla → `practice` con `waitMode: true`.
  - Tocar → `playalong` (con MIDI o pantalla; si la entrada es micrófono, se avisa de que "Tocar" necesita cable o pantalla y se ofrece cambiar).
  - El modo `guided` con MIDI/pantalla deja de ofrecerse en la UI (queda en el motor; se puede re-exponer si se echa de menos).
- Botón final grande: "▶ Empezar".

## 4. Práctica entrenadora (`PracticeScreen`)

- **Barra superior mínima:** ✕ salir · barra de progreso de la canción (`time/duration`) · chip de racha "✓ N seguidas" (aciertos consecutivos; se rompe al fallar) · ⏸/▶.
- **Franja entrenadora** (`.coach`, bajo la barra): mensajes según estado — "¡Bien! Ahora un Sol 👇" (siguiente nota esperada con nombre), "Casi — era Mi", "Escucha… 🎧 / ¡Te toca! 🎹" (fases del modo micrófono), "¡Récord de racha!". Reemplaza los mensajes flotantes actuales.
- **Cuenta atrás 3-2-1** al iniciar o reanudar, sobre la cascada.
- **Ajustes en panel ⚙:** botón flotante que abre una hoja inferior con Nivel / Velocidad / Mano / Espera sin salir de la canción (sustituye a los selects de la barra actual).
- **Pantalla de final** (overlay): puntuación grande, % y racha máxima, **confeti CSS si hay récord nuevo**, botones "Repetir" (primario) / "Cambiar modo" / "Biblioteca". La lógica de guardado de récord no cambia.
- El estado MIDI/micrófono ("piano conectado", "sin sonido") vive como chip discreto en la franja entrenadora, no como texto suelto.

## 5. Implementación (restricciones)

- **No se toca:** `practiceEngine`, `pitchDetect`, `useMicPitch`, `useMidiInput`, `parseMidi`, `songStore`, `simplifySong`. Solo UI, estilos y el mapeo de `SessionConfig`.
- **Sin dependencias nuevas:** CSS puro (animaciones de flash/sacudida/confeti con keyframes; confeti = ~30 divs con animación, montados solo en récord).
- `SessionConfig` gana un campo `input: 'midi' | 'mic' | 'screen'` y `mode` externo pasa a `listen | learn | play`; una función pura `resolveEngineMode(config)` lo traduce a los modos internos — **con tests unitarios** (tabla del mapeo de la sección 3).
- Racha (streak): estado de UI en `PracticeScreen` derivado de los resultados de `onKeyDown` — no entra en el motor.
- Los tests existentes (60) deben seguir en verde; el build limpio.

## Fuera de alcance

Modo oscuro, partitura, gamificación con puntos/XP/niveles, sonidos de interfaz, rediseño de iconos personalizados (emoji vale), accesibilidad avanzada (se mantienen tamaños táctiles y contraste razonables).
