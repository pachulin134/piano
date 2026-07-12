# Diseño: Niveles de dificultad automáticos (Fase 2a)

**Fecha:** 2026-07-12
**Estado:** Aprobado por el usuario (concepto y los 3 niveles)

## Motivación

El usuario quiere practicar canciones reales (Succession, La Foule, Childish Gambino…) que en su forma original son difíciles para nivel básico. En vez de empaquetar arreglos por nivel (imposible con canciones con derechos, y multiplicaría la biblioteca), la app genera versiones simplificadas de **cualquier** canción importada, al vuelo.

## Decisiones

| Decisión | Elección |
|---|---|
| Dónde vive el nivel | Selector en la pantalla de práctica (como manos/velocidad), NO entradas duplicadas en la biblioteca |
| Transformación | Función pura `simplifySong(song, level)` en `src/core` (testeable) |
| Persistencia | Ninguna: se calcula al practicar; la biblioteca guarda solo el original |
| Puntuación | Sin cambios: una mejor puntuación por canción (igual que ya pasa con manos/velocidad) |

## Niveles

- **`easy` (Fácil):** solo notas de mano derecha; dentro de cada grupo simultáneo (acorde, ventana de 50 ms) se conserva únicamente la nota más aguda (la melodía). Resultado: una sola voz.
- **`medium` (Medio):** mano derecha íntegra; la mano izquierda se reduce a la nota más grave de cada grupo (un bajo simple).
- **`original` (Original):** la canción tal cual (por defecto).

La duración de la canción no cambia. La cascada, el rango del teclado y el motor de práctica usan la canción transformada.

## Fuera de alcance

Arreglos musicales inteligentes (transposición, cambio de figuración), niveles persistidos por canción, puntuaciones separadas por nivel.
