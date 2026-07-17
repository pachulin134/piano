# Diseño: Paquete B — estructura (Fase 7)

**Fecha:** 2026-07-17 · **Estado:** Aprobado (continuación de la auditoría exhaustiva; A ya fusionado)

## 1. Inicio como panel

- La tarjeta "Seguir con X" (de A) se mantiene arriba.
- Las dos áreas ganan **subtítulos dinámicos**: Canciones → "N canciones · M con récord"; Teoría → "X/13 lecciones completadas" (o "¡Teoría básica completada!" si todas). Datos: `songs` ya cargadas y `completed` de teoría (ambos viven en App).
- Se elimina el subtítulo estático duplicado; el saludo "¿Qué quieres hacer hoy?" queda SOLO en el inicio.

## 2. Setup compacto (sin scroll en apaisado)

- Las 4 puertas pasan de tarjetas apiladas a **rejilla 2×2 compacta**: icono + título en 1-2 palabras + pista de UNA línea corta ("Escuchar" · "Mira cómo suena"; "Seguir" · "Tú tocas, sin corrección"; "Aprender" · "Nota a nota, te espera"; "Tocar" · "A ritmo real, te puntúa"). La seleccionada, con borde de color.
- Cabecera: "¿Cómo quieres practicar «{título}»?" (fuera el duplicado "¿Qué quieres hacer hoy?").
- Chip de entrada + opciones (nivel/velocidad/mano/sonido) en UNA fila compacta con wrap; consejos de micro reducidos a una línea.
- Objetivo medible: con viewport de 390 px de alto (iPhone apaisado), el botón "▶ Empezar" visible sin scroll (alturas: cabecera ~64 + rejilla ~148 + chips ~40 + opciones ~56 + botón ~52 ≈ 360).

## 3. Cuenta atrás solo al empezar

- El 3-2-1 aparece solo si `time === 0` (arranque o tras reinicio). Reanudar tras pausa: directo a `running`. (El audio ya está inicializado de la primera vez.)

## 4. Puente Teoría ↔ Canciones

- **Fin de lección que completa un nivel**: el overlay añade botón "🎵 Practicar una canción" que navega a la puerta de una canción sugerida (la de menor dificultad sin récord; si todas tienen, la de menor dificultad). App expone `onPracticeSuggestion`.
- **Fin del sendero**: al completar la última lección, overlay especial "🏆 ¡Teoría básica completada!" + el mismo botón de practicar. En el sendero, tarjeta final estática "🚧 Más niveles en camino".
- **Setup → Teoría**: si el Nivel 1 de teoría NO está completo, banner discreto bajo la cabecera: "¿Nuevo en el piano? Aprende las notas en Teoría →" (navega al sendero). App pasa `theoryHint: boolean` y `onGoTheory`.

## 5. Layouts que aprovechan el apaisado

- Biblioteca y Teoría: `maxWidth` 560→900 y las listas pasan a **rejilla de 2 columnas** cuando el ancho ≥ 700 px (CSS grid con clase compartida `.grid-2col` en styles.css; 1 columna por debajo).

## Restricciones

Motor intacto. Suite (100) verde. Sin dependencias. Ningún flujo existente se rompe (memoria de ajustes, Seguir con, buscador…).

## Fuera de alcance (C)

Metrónomo, volumen, racha diaria, progreso en modos sin nota, renombrar, borrado en prod.
