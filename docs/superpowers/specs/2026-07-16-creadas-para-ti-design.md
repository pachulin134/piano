# Diseño: Sección "Creadas para ti" (Fase 5)

**Fecha:** 2026-07-16 · **Estado:** Aprobado por el usuario

Piezas de piano **compuestas por Claude** (originales al 100%, sin derechos de terceros — publicables), como colección propia de la biblioteca. El usuario pidió empezar por algo al estilo de Nuvole Bianche (Einaudi); al tener derechos, no se copia: se compone una pieza original en ese lenguaje (minimalismo calmado).

## Contenido
- **"Cielo Abierto"** (primera pieza): La menor (mayormente teclas blancas), 4/4 a 76 bpm, ~2 min. MI en arpegios suaves (patrón raíz-5ª-8ª), MD melodía lírica; forma Intro–A–A'–B–A''–Coda con clímax suave en B/A''. Compuesta como datos en `scripts/makeClaudeSongs.mjs` → genera `public/songs/claude/*.mid` + `index.json` (mismo patrón que makeSongs.mjs). Script npm `songs:claude`.

## Integración
- `songStore.read()`: tercer catálogo `songs/claude/index.json` con ids `claude:<file>`, cargado entre builtin y usuario; `remove()` ignora también ids `claude:` (con test).
- `LibraryScreen`: tres grupos con cabecera — **✨ Creadas para ti** (`claude:`), **🎁 Incluidas** (`builtin:`), **📁 Tus canciones** (resto). Sin botón borrar en las dos primeras. Grupos vacíos no muestran cabecera.

## Restricciones
Originalidad estricta (progresiones/melodías propias; el estilo no es protegible, la obra sí). Suite de tests verde + test nuevo del guard de `remove`. Sin dependencias nuevas.

## Fuera de alcance
Más piezas (se añaden luego como datos), portadas personalizadas, ordenación configurable.
