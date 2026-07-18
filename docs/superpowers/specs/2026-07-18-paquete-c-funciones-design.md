# Diseño: Paquete C — funciones (Fase 8)

**Fecha:** 2026-07-18 · **Estado:** Aprobado (cierre de la auditoría exhaustiva; A y B fusionados)

## 1. Metrónomo

- `Song` gana `bpm?: number` (de `parseMidi`: primer tempo del MIDI, redondeado; 120 si no hay — con test).
- `piano.ts` gana `playClick(accent: boolean)`: click sintetizado con oscilador del mismo `AudioContext` (~60 ms, 1000 Hz normal / 1400 Hz acentuado), sin muestras nuevas.
- `PracticeScreen`: interruptor "Metrónomo" en ⚙ (default off, NO persistido en prefs de momento). En el rAF, al cruzar cada pulso musical (`60/bpm` en tiempo musical; el acento en el pulso 1 de cada 4) suena el click. Funciona en todos los modos con reloj lineal; en modo micrófono no se ofrece (reloj por pasos).

## 2. Volumen

- `piano.ts` gana `setVolume(pct: 0..100)` mapeado a la API real de smplr (el implementador VERIFICA la firma en `node_modules/smplr/dist`; si no existe control de volumen, adaptar con GainNode propio entre el sampler y `destination`).
- Slider "Volumen" en ⚙ (0–100, default 80). Vive en estado de App (global, no por canción) y se aplica al montar y al cambiar.

## 3. Racha diaria

- `src/core/streak.ts` (puro, TDD): `computeStreak(dates: string[], today: string): number` — días consecutivos terminando hoy o ayer (racha "viva"); fechas `YYYY-MM-DD`, duplicados ignorados, desorden tolerado.
- `prefsStore` gana `recordPracticeDay(date)` y `listPracticeDays()` (clave `practice-days-v1`, lista acotada a 60 días).
- Se registra el día al **empezar** una sesión de canción (primer ▶) y al **completar** una lección de teoría.
- El inicio muestra "🔥 Racha: N días" (solo si N ≥ 2) junto al saludo.

## 4. Progreso en modos sin puntuación

- `songStore` gana `recordPlayed(id, pct)` (clave `played-v1`, guarda el máximo 0..100) y `read()` lo expone como `playedPct?: number` en `Song`.
- `PracticeScreen`: al terminar (`finished`) o salir con ✕, informa `onProgress(pct)` con `round(100 * time/duration)` (si > 0). App lo guarda.
- Biblioteca: si `bestScore === null` pero `playedPct > 0`, la barra se muestra en azul (`--listen`) con etiqueta implícita (sin chip "Nueva"). Con `bestScore`, todo como hasta ahora.

## 5. Renombrar canciones importadas

- `songStore` gana `rename(id, title)` (clave `titles-v1`, mapa id→título aplicado en `read()` tras cargar catálogos; vale para canciones de disco y legacy, y es prod-safe). Solo UI en las del grupo "Tus canciones": icono ✏️ en la tarjeta (con `stopPropagation`) → `prompt('Nuevo nombre', títuloActual)`; vacío/cancelar = no-op.

## 6. Borrado real en producción

- `remove()` para canciones de usuario que no se pueden borrar del disco (prod): se apuntan en `hidden-v1` (lista de ids) y `read()` las filtra. En dev sigue el borrado físico. Resultado: borrar funciona SIEMPRE (borrado suave donde no hay API).

## Restricciones

Motor intacto (bpm sale del parser, el click lo programa la pantalla). Tests: parser bpm, streak, songStore (rename/hidden/played). Sin dependencias.

## Fuera de alcance

Persistir metrónomo/volumen por canción, compás real del MIDI (se asume 4/4 para el acento), estadísticas históricas, logros.
