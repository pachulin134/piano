# Paquete B — estructura · Plan (Fase 7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Inicio-panel con datos, setup compacto sin scroll en apaisado, cuenta atrás solo al empezar, puente Teoría↔Canciones, rejillas de 2 columnas en apaisado.

**Spec:** `docs/superpowers/specs/2026-07-17-paquete-b-estructura-design.md` — leerlo entero antes de empezar; define textos y umbrales exactos.

**Regla de oro:** 100 tests verdes; motor intacto; no romper memoria de ajustes/Seguir con/buscador del Paquete A.

---

### Task 1: Setup compacto + cuenta atrás solo al empezar

**Files:** Modify `src/screens/SongSetupScreen.tsx`, `src/screens/PracticeScreen.tsx`

- [ ] **SongSetupScreen**: cabecera pasa a `¿Cómo quieres practicar «{song.title}»?` (sin el párrafo "Elige cómo…"). Las puertas se renderizan en `display:grid, gridTemplateColumns:'1fr 1fr', gap:8`; cada tarjeta-puerta: `padding:10`, icono 20px a la izquierda, título `fontSize:14 fontWeight:800`, pista `fontSize:11` de UNA línea (textos EXACTOS del spec §2). El chip "Recomendado" de learn pasa a un punto naranja `●` junto al título (ahorra alto). Opciones (nivel/velocidad/mano/sonido/entrada) se agrupan en una única fila `display:flex, flexWrap:'wrap', gap:8, alignItems:'center'` sin la tarjeta `.card` contenedora (fondo transparente); el consejo de micro queda en una línea (`fontSize:12`). El botón "▶ Empezar" conserva su estilo.
- [ ] **PracticeScreen**: en `start()`, solo lanzar cuenta atrás si el tiempo es 0: `const engineTime = engineRef.current?.time ?? 0;` → si `engineTime > 0` hacer `setRunning(true)` directamente (sin `setCountingDown(true)`); si es 0, cuenta atrás como ahora. (El init de audio se mantiene en ambos casos.)
- [ ] Verificar: `npm test` (100/100) + build + dev 200. Commit: `feat(ui): setup compacto en rejilla y reanudar sin cuenta atrás`

### Task 2: Inicio-panel con datos

**Files:** Modify `src/App.tsx`

- [ ] El hub calcula: `const withScore = songs.filter(s => s.bestScore !== null).length;` y `const totalLessons = LEVELS.reduce((a, l) => a + l.lessons.length, 0);` (import LEVELS ya existe). Subtítulos dinámicos: Canciones → `${songs.length} canciones · ${withScore} con récord`; Teoría → `completed.size >= totalLessons ? '¡Teoría básica completada! 🏆' : `${completed.size}/${totalLessons} lecciones completadas``.
- [ ] Verificar + commit: `feat(ui): inicio con panel de progreso`

### Task 3: Puente Teoría ↔ Canciones

**Files:** Modify `src/App.tsx`, `src/screens/LessonScreen.tsx`, `src/screens/TheoryPathScreen.tsx`, `src/screens/SongSetupScreen.tsx`

- [ ] **App**: helper `suggestSong(): Song | null` — de `songs`, la de menor `difficulty` sin `bestScore`; si todas tienen récord, la de menor dificultad; null si no hay canciones. Prop nueva a `LessonScreen`: `onPracticeSong?: () => void` que hace `const s = suggestSong(); if (s) { setLesson(null); setArea('songs'); openSong(s); }`. Se pasa SOLO cuando la lección que se acaba de completar es la última de su nivel (App lo sabe: `lesson.lesson.id` es la última de `LEVELS.find(l => l.id === lesson.levelId)`).
- [ ] **LessonScreen**: props ganan `onPracticeSong?: () => void` y `isPathEnd?: boolean`. En el overlay de fin: si `isPathEnd`, título "🏆 ¡Teoría básica completada!" (en vez de "¡Lección completada!"); si `onPracticeSong` viene, botón extra `🎵 Practicar una canción` (btn-primary si no hay hasNext). App calcula `isPathEnd` = no hay siguiente lección en `flatLessons`.
- [ ] **TheoryPathScreen**: tras el último nivel, tarjeta estática: `<div className="card" style={{ opacity: 0.7, textAlign: 'center' }}>🚧 Más niveles en camino…</div>`.
- [ ] **SongSetupScreen**: props ganan `theoryHint?: boolean` y `onGoTheory?: () => void`; si `theoryHint`, banner bajo la cabecera: `<button className="coach coach-info" style={{ width: '100%', cursor: 'pointer', marginBottom: 10 }} onClick={onGoTheory}>¿Nuevo en el piano? Aprende las notas en Teoría →</button>`. App pasa `theoryHint` = Nivel 1 incompleto (`!LEVELS[0].lessons.every(ls => completed.has(ls.id))`) y `onGoTheory` = cerrar setup y `setArea('theory')`.
- [ ] Verificar + commit: `feat: puente entre Teoría y Canciones`

### Task 4: Rejillas apaisadas

**Files:** Modify `src/styles.css`, `src/screens/LibraryScreen.tsx`, `src/screens/TheoryPathScreen.tsx`

- [ ] `styles.css`:
```css
.grid-2col { display: flex; flex-direction: column; gap: 10px; }
@media (min-width: 700px) {
  .grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: start; }
}
```
- [ ] `LibraryScreen`: `maxWidth: 560` → `900`; el contenedor de tarjetas de cada grupo usa `className="grid-2col"` (sustituye su flex-column inline).
- [ ] `TheoryPathScreen`: `maxWidth: 560` → `900`; el contenedor de niveles usa `.grid-2col` (cada nivel-card una celda).
- [ ] Verificar + commit: `feat(ui): rejillas de dos columnas en pantallas anchas`

### Task 5: Verificación final

- [ ] `npm test` 100/100 + build limpio. Manual: setup sin scroll con ventana baja (~390px alto); pausar/reanudar sin 3-2-1 (pero con 3-2-1 al empezar y tras ⟲); inicio muestra contadores reales; completar último nivel → overlay 🏆 con "Practicar una canción" que abre el setup de una canción fácil; banner de teoría en setup si N1 incompleto (y desaparece al completarlo); biblioteca y teoría a 2 columnas en el navegador ancho, 1 columna estrecho; nada del Paquete A roto (memoria, Seguir con, buscador).
