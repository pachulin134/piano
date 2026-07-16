# Diseño: Pulido de navegación y control (Fase 4)

**Fecha:** 2026-07-16
**Estado:** Aprobado por el usuario (paquete completo de la auditoría 2026-07-16)

## Origen

Auditoría de lagunas lógicas tras uso real del usuario: falta navegación temporal (retroceder/saltar), la pausa no congela la evaluación, atascos sin salida en micrófono, pérdida de posición al cambiar ajustes, y varios detalles de fricción. Este diseño cubre TODO lo grave y lo medio de esa auditoría.

## 1. Navegación temporal

- **Motor** (TDD): método público `seek(t: number)` — clamp a [0, duración], reutiliza el `seekTo` interno (recoloca índices, limpia pendiente). Funciona en espera/continuo/escuchar/libre/tocar. No aplica al modo guiado/micrófono (reloj por pasos).
- **`TimeBar` (componente nuevo)** sustituye a la barra de progreso decorativa: arrastrable/tocable para saltar (pointer events con capture + pointercancel, como LoopBar), muestra **m:ss / m:ss**, y botón **⏪ -5 s**. Oculta el arrastre en modo micrófono (solo muestra progreso).
- **Conservar la posición al cambiar nivel/mano**: la línea de tiempo no cambia con nivel/mano, así que al recrear el motor se hace `seek(tiempoAnterior)` si la canción es la misma (ref del último tiempo + ref del id de canción). Se acabó "perder el sitio". El texto de la hoja ⚙ se actualiza ("se mantiene tu posición").
- **⟲ Reiniciar** en la hoja ⚙: `seek(0)` + reset de racha/feedback, sin salir.

## 2. Pausa real

- **Bug**: en pausa las teclas siguen evaluándose (avanzan grupos en espera). Arreglo: `handleKey` solo llama a `engine.onKeyDown` si `running` (la tecla puede iluminarse/sonar igualmente).
- **Estado visible**: cuando está pausado a mitad (`!running && time > 0 && !ended`), la entrenadora dice "⏸ En pausa — pulsa ▶ para seguir".
- **Barra superior sin desbordes**: los chips de racha y % en vivo se mueven al hueco de chip de la CoachBar (se alternan con el chip de entrada); la barra superior queda: ✕ · TimeBar (flex) · 🔁 Bucle · ⚙ · ▶/⏸ — con `flexShrink: 0` en los botones y `minWidth: 0` en la TimeBar. El botón 🔁 gana la etiqueta "Bucle".

## 3. Desatascos

- **Saltar nota en micrófono**: botón "Saltar →" visible en fase "te toca" del modo micrófono. Motor (TDD): `skipPending()` — completa el grupo pendiente sin sumar acierto ni fallo (limpia pending, avanza groupIdx, limpia guidedStep).
- **Oír la nota pedida en espera**: botón "🔊 ¿Cómo suena?" junto a la entrenadora cuando hay notas esperadas en modo espera (no mic): toca las notas esperadas con `playNote`.

## 4. Detalles

- **Confirmación al salir** (✕) si hay sesión a medias (`time > 0 && !ended`): `confirm('¿Salir? Perderás la posición actual.')`.
- **Señal al saltar el bucle**: si el tiempo retrocede entre frames (wrap B→A), feedback "🔁 Otra vez desde A".
- **Lecciones de Teoría**: botón "←" para retroceder un paso (visible si paso > 0).

## Restricciones

Motor: solo `seek` y `skipPending`, con tests; la suite actual (91) sigue verde. Sin dependencias nuevas. Tema Luminoso. iPhone horizontal (targets táctiles ≥ 32 px en la TimeBar).

## Fuera de alcance

Deshacer cambios de ajustes, marcadores guardados, historial de sesiones, velocidad por gesto, tooltips/onboarding general.
