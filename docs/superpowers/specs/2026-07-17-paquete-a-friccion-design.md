# Diseño: Paquete A — fricción diaria (Fase 6)

**Fecha:** 2026-07-17 · **Estado:** Aprobado (auditoría exhaustiva 2026-07-17, cruzada con auditor independiente)

## Objetivo

Eliminar la fricción de cada sesión: nada de reconfigurar, nada de buscar entre 24 tarjetas, nada de botones que fallan al dedo. No se toca el motor.

## 1. Memoria y defaults

- **Nuevo `src/storage/prefsStore.ts`** (KV inyectable, TDD): `getSongPrefs(songId): Promise<SessionConfig | null>`, `saveSongPrefs(songId, config)`, `getLastSession(): Promise<{ songId: string; config: SessionConfig } | null>`, `saveLastSession(...)`. Claves `prefs-v1` (mapa por canción) y `last-session-v1`.
- **`SongSetupScreen`** acepta prop `initialValues?: SessionConfig | null`: si viene, inicializa puerta/nivel/velocidad/mano/entrada/sonido desde ahí; si no, **defaults de principiante**: puerta `learn`, nivel `easy`, velocidad `0.6`, mano `both`, entrada automática.
- **`App`**: al abrir el setup carga `getSongPrefs(song.id)`; en `onStart` guarda prefs de la canción y `saveLastSession`. "Cambiar modo" desde práctica vuelve al setup **con la config actual de la sesión** como `initialValues` (no se pierde lo afinado).
- **"▶ Seguir con {título}"** en el inicio: si hay `last-session-v1` y la canción existe, tarjeta prominente que salta DIRECTA a practicar con esa config (sin pasar por setup). Debajo, las dos áreas de siempre.

## 2. Biblioteca ordenada y buscable

- **Orden de secciones: 📁 Tus canciones → ✨ Creadas para ti → 🎁 Incluidas.**
- Si "Tus canciones" está vacía, su sección muestra la tarjeta de ayuda de importación (la actual de biblioteca-vacía, que hoy es código muerto).
- **Buscador** (input arriba, filtra por título, sin distinguir mayúsculas/acentos) y **orden** (chips: Nombre · Dificultad · Duración) aplicados dentro de cada sección.
- **Tarjeta entera pulsable** (abre el setup); el botón "Aprender" desaparece (evita el choque con la puerta "Aprender"); borrar queda como icono pequeño en las tuyas.
- Barra de progreso: si `bestScore === null` se muestra chip "Nueva" en vez de barra al 0%.

## 3. Títulos limpios + estilo como dato

- `Song` gana `style?: string` (opcional). Los catálogos (`index.json`) ganan campo `style`; `loadCatalog` lo copia a la canción.
- Títulos de las 14 piezas de Claude SIN "— por Claude ✨" ni "(estilo)": p. ej. `Tren de Medianoche` + `style: "boogie blues"`. La autoría ya la da la sección "✨ Creadas para ti". Se regeneran los índices desde los scripts (los .mid no cambian).
- La tarjeta muestra el estilo como chip pequeño. (Filtro por estilo: fuera de alcance de A; el buscador ya encuentra "salsa" si se busca… solo si se busca también en `style` — sí: el buscador busca en título + estilo.)

## 4. Táctil correcto (44 px)

- `.btn-ghost`: mínimo táctil 44×44 (padding/min-width/min-height, display inline-flex centrado).
- Tiradores A/B del `LoopBar`: 40 px. Botón ⏪5s y "A aquí/B aquí/✕": área ≥ 40 px.
- Sin cambios visuales de concepto: solo áreas.

## Restricciones

Motor intacto. Suite verde + tests nuevos de `prefsStore`. Sin dependencias. Los .mid no se regeneran (solo índices). Regla del catálogo: ninguna pieza se retira.

## Fuera de alcance (paquetes B/C)

Inicio-panel completo, setup compacto apaisado, layouts apaisados, puente Teoría↔Canciones, metrónomo, volumen, racha diaria, renombrar, progreso en modos sin nota, arreglo del borrado silencioso en producción.
