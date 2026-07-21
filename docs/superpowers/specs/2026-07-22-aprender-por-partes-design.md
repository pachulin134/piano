# Diseño: Aprender por partes (Fase 8)

**Fecha:** 2026-07-22 · **Estado:** Aprobado (auditoría pedagógica vs. Flowkey/Simply Piano/pedagogía tradicional + maquetas visuales)

## Origen

Auditoría comparativa: el modo "Aprender" lanza la canción entera de golpe, nota a nota en orden — ningún profesor ni Simply Piano enseña así (trocean en frases de 2-4 compases, dominas una antes de la siguiente). Además, el bucle A-B existente (Fase 2c/4) es poco descubrible y su tramo por defecto es arbitrario (8s desde donde estés), no musical.

## 1. Troceado de la canción

Función pura `splitIntoFragments(song: Song, minFragmentSongDuration = 20): Fragment[]` en `src/core/fragments.ts`:
- Objetivo ~10-12s por fragmento; los límites se ajustan al `time` de la nota más cercana (de `groupNotes(song.notes)`) para no cortar nunca a mitad de silencio ni de acorde.
- Canciones de menos de 20s → un solo fragmento implícito (no se trocea; la UI de franja no aparece, se comporta como hoy).
- No depende de compás/bpm — robusto para cualquier compás (incluidos los valses en 3/4 del catálogo).
- `Fragment { index: number; start: number; end: number }`.

## 2. Franja de fragmentos (sustituye a TimeBar solo en puerta "Aprender")

Componente nuevo `FragmentBar` (`src/components/FragmentBar.tsx`):
- Un segmento por fragmento, ancho proporcional a su duración. Color: **verde** (mejor score de ese fragmento ≥80%), **naranja con borde** (fragmento activo), **gris** (sin dominar, sin marca).
- Tocar un segmento: `engine.seek(fragment.start)` + `engine.setLoop(fragment.start, fragment.end)` — bucle inmediato, sin panel intermedio.
- Texto bajo la franja: "Fragmento N de M · toca uno para saltar y repetirlo".
- En puertas que no sean "learn" (Escuchar/Seguir/Tocar), se mantiene el `TimeBar` actual sin cambios.

## 3. Progreso por fragmento (persistencia)

`src/storage/fragmentStore.ts` (mismo patrón KV inyectable que `prefsStore`/`theoryStore`, TDD): clave `fragments-v1`, mapa `{ [songId]: { [fragmentIndex]: bestScore } }`. API: `getFragmentScores(songId)`, `recordFragmentScore(songId, index, score)` (solo sube, igual que `songStore.recordScore`).

## 4. Puntuación por vuelta y sugerencia de velocidad

Sin tocar el motor (`practiceEngine` no cambia — usa `setLoop`/`seek` ya existentes). En `PracticeScreen`, al detectar el ya existente "wrap" del bucle (fin de vuelta → salta a A), se calculan aciertos/fallos **desde el wrap anterior** (contador local en el componente, alimentado por los mismos resultados de `onKeyDown` que ya se inspeccionan para el feedback visual) y se resetea el contador. Si esa vuelta dio ≥80%:
- Se guarda `recordFragmentScore(song.id, fragmento.index, score)`.
- Aviso vía la `action` de `CoachBar` (ya existe desde Fase 4): **"🎉 ¡Fragmento dominado! ¿Probar a 75%?"**, con la siguiente velocidad de la lista (10/25/50/75/90/100%). Aceptar sube `speed` (ya es en vivo, sin recrear el motor) y continúa en el mismo bucle. Descartar no hace nada (sigue repitiendo a la misma velocidad).

## 5. "Toda seguida" nunca bloqueada

Chip al final de la franja (o botón junto a ella): quita el bucle (`clearLoop()`) y reproduce la canción completa en modo espera de siempre. Disponible desde el primer momento, no requiere fragmentos dominados — evita repetir el error de esconder controles.

## Restricciones

Motor de práctica **sin cambios** (solo se usan `seek`/`setLoop`/`clearLoop`, ya existentes). Suite de tests verde + tests nuevos de `fragments.ts` (puro) y `fragmentStore.ts` (TDD). Solo afecta a la puerta "Aprender"; el resto de puertas y Teoría quedan intactas.

## Fuera de alcance

Troceado por compás real (requeriría parsear compás del MIDI), fragmentos personalizables a mano (arrastrar límites), racha/gamificación específica de fragmentos más allá del color verde, aplicar la sugerencia de velocidad fuera de "Aprender".
