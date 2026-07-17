# Paquete A — fricción diaria · Plan (Fase 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Memoria de ajustes + defaults de principiante + "Seguir con X" + biblioteca ordenada/buscable con títulos limpios + táctil 44px.

**Architecture:** Nuevo `prefsStore` (KV inyectable, TDD); `Song.style` opcional alimentado por los catálogos; `LibraryScreen` reordenada con buscador/orden; `SongSetupScreen` con `initialValues`; `App` orquesta prefs y "Seguir con". Motor intacto.

**Spec:** `docs/superpowers/specs/2026-07-17-paquete-a-friccion-design.md`

**Regla de oro:** 98 tests verdes siempre; ninguna pieza del catálogo se retira; los `.mid` NO se regeneran con cambios musicales (solo cambian los `index.json`).

---

### Task 1: prefsStore (TDD)

**Files:** Create `src/storage/prefsStore.ts`, `src/storage/prefsStore.test.ts`

- [ ] **Step 1: test que falla — `src/storage/prefsStore.test.ts`:**

```ts
import { describe, it, expect } from 'vitest';
import { createPrefsStore, type KV } from './prefsStore';
import type { SessionConfig } from '../core/sessionModes';

function memoryKV(): KV {
  const m = new Map<string, unknown>();
  return { get: async k => m.get(k), set: async (k, v) => { m.set(k, v); } };
}

const cfg = (speed: number): SessionConfig =>
  ({ door: 'learn', input: 'screen', level: 'easy', speed, hand: 'both', waitMode: true });

describe('prefsStore', () => {
  it('guarda y recupera la config por canción', async () => {
    const s = createPrefsStore(memoryKV());
    expect(await s.getSongPrefs('a')).toBe(null);
    await s.saveSongPrefs('a', cfg(0.6));
    await s.saveSongPrefs('b', cfg(1));
    expect((await s.getSongPrefs('a'))?.speed).toBe(0.6);
    expect((await s.getSongPrefs('b'))?.speed).toBe(1);
  });
  it('guarda y recupera la última sesión', async () => {
    const s = createPrefsStore(memoryKV());
    expect(await s.getLastSession()).toBe(null);
    await s.saveLastSession('a', cfg(0.75));
    const last = await s.getLastSession();
    expect(last?.songId).toBe('a');
    expect(last?.config.speed).toBe(0.75);
  });
});
```

- [ ] **Step 2:** correr → FAIL. **Step 3: implementar `src/storage/prefsStore.ts`:**

```ts
import { get, set } from 'idb-keyval';
import type { SessionConfig } from '../core/sessionModes';

export interface KV {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

const PREFS_KEY = 'prefs-v1';
const LAST_KEY = 'last-session-v1';

export function createPrefsStore(kv: KV = { get, set }) {
  const readAll = async (): Promise<Record<string, SessionConfig>> =>
    ((await kv.get(PREFS_KEY)) as Record<string, SessionConfig> | undefined) ?? {};
  return {
    async getSongPrefs(songId: string): Promise<SessionConfig | null> {
      return (await readAll())[songId] ?? null;
    },
    async saveSongPrefs(songId: string, config: SessionConfig): Promise<void> {
      const all = await readAll();
      await kv.set(PREFS_KEY, { ...all, [songId]: config });
    },
    async getLastSession(): Promise<{ songId: string; config: SessionConfig } | null> {
      return ((await kv.get(LAST_KEY)) as { songId: string; config: SessionConfig } | undefined) ?? null;
    },
    async saveLastSession(songId: string, config: SessionConfig): Promise<void> {
      await kv.set(LAST_KEY, { songId, config });
    },
  };
}

export type PrefsStore = ReturnType<typeof createPrefsStore>;
```

- [ ] **Step 4:** `npm test` → 100/100. **Step 5: Commit** — `git add src/storage/prefsStore* && git commit -m "feat: prefsStore — memoria de ajustes por canción y última sesión"`

---

### Task 2: estilo como dato + títulos limpios

**Files:** Modify `src/core/types.ts`, `src/storage/songStore.ts`, `scripts/makeClaudeSongs.mjs`, `scripts/claudeSongs-vol2.mjs`, `scripts/makeSongs.mjs`; regenerar `public/songs/index.json` y `public/songs/claude/index.json`

- [ ] **Step 1:** `src/core/types.ts` — en `Song`, añadir tras `bestScore`: `style?: string; // estilo musical (chip en la biblioteca)`
- [ ] **Step 2:** `src/storage/songStore.ts` — el tipo `CatalogItem` gana `style?: string` (búscalo al inicio del archivo) y en `loadCatalog`, tras `parseMidi(...)`, copiar: la línea `songs.push(parseMidi(buf, item.title, id));` pasa a:
```ts
      const parsed = parseMidi(buf, item.title, id);
      if (item.style) parsed.style = item.style;
      songs.push(parsed);
```
- [ ] **Step 3:** scripts — en `scripts/makeClaudeSongs.mjs` y `scripts/claudeSongs-vol2.mjs`, cada entrada de `SONGS`/`SONGS2` cambia `title` a limpio y gana `style`:
  - makeClaudeSongs: `{ file: 'tren-de-medianoche.mid', title: 'Tren de Medianoche', style: 'boogie blues', ... }`, `neon.mid` → `'Neón'` / `'R&B funk'`, `calle-soleada.mid` → `'Calle Soleada'` / `'soul R&B'`, `sabor-de-verano.mid` → `'Sabor de Verano'` / `'salsa'`.
  - vol2: `Vals de la Plaza`/`vals criollo`, `Mambo Caliente`/`salsa`, `Cha-Cha del Parque`/`cha-cha-chá`, `Blues del Corazón`/`blues romántico`, `Rock del Garaje`/`rock and roll`, `Ragtime de Feria`/`ragtime`, `Tango del Farol`/`tango`, `Swing de la Esquina`/`jazz swing`, `Bachata de la Luna`/`bachata`, `Cumbia de Estrellas`/`cumbia`.
  - En AMBOS scripts, el `writeFileSync(...index.json...)` pasa a serializar `{ file, title, style }`: `JSON.stringify(SONGS.map(s => ({ file: s.file, title: s.title, style: s.style })), null, 2)`.
  - `scripts/makeSongs.mjs` (las 3 incluidas): añadir `style: 'clásica'` a estrellita e himno-alegria... exacto: estrellita `'infantil'`, himno-alegria `'clásica'`, cumpleanos `'celebración'`, y el índice serializa igualmente `{ file, title, style }`.
- [ ] **Step 4:** `npm run songs && npm run songs:claude` — verificar con `git diff public/` que SOLO cambian los `index.json` (los .mid deben quedar byte-idénticos; si un .mid cambia, PARAR y revisar).
- [ ] **Step 5:** `npm test` (100/100) + build. **Step 6: Commit** — `git add -A && git commit -m "feat: estilo musical como metadato y títulos limpios en los catálogos"`

---

### Task 3: Biblioteca — orden, buscador, tarjeta pulsable, táctil

**Files:** Modify `src/screens/LibraryScreen.tsx`, `src/styles.css`, `src/components/LoopBar.tsx`, `src/components/TimeBar.tsx`

- [ ] **Step 1: `src/styles.css`** — `.btn-ghost` pasa a:
```css
.btn-ghost {
  background: transparent;
  border: none;
  box-shadow: none;
  color: var(--ink-3);
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}
```
- [ ] **Step 2: `LoopBar.tsx`** — `handleStyle`: `width: 40, height: 40, marginLeft: -20, top: -14`; los botones "A aquí"/"B aquí"/"✕" ya heredan el mínimo de `.btn-ghost`.
- [ ] **Step 3: `TimeBar.tsx`** — el botón ⏪5s: quitar `padding: '2px 4px'` (hereda el mínimo 44px de `.btn-ghost`; dejar `fontSize: 13, flexShrink: 0`).
- [ ] **Step 4: `LibraryScreen.tsx`** — reescritura de la lista (cabecera e importación se conservan):
  - Estado nuevo: `const [query, setQuery] = useState('');` y `const [order, setOrder] = useState<'nombre' | 'dificultad' | 'duracion'>('nombre');`
  - Normalizador y filtro:
```ts
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const matches = (s: Song) => norm(s.title + ' ' + (s.style ?? '')).includes(norm(query));
const sortFn = (a: Song, b: Song) =>
  order === 'dificultad' ? a.difficulty - b.difficulty
  : order === 'duracion' ? a.duration - b.duration
  : a.title.localeCompare(b.title, 'es');
```
  - Bajo la cabecera: input de búsqueda (`<input type="search" placeholder="Buscar por nombre o estilo…" className="chip" style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)' }} …/>`) y fila de chips de orden (tres `<button className="chip">` con borde activo `var(--right)`).
  - **Orden de grupos**: user primero, luego claude, luego builtin (mover la entrada `user` al principio del array de grupos y cambiar título a `'📁 Tus canciones'` con subtítulo implícito).
  - Cada grupo filtra `songs.filter(group.match).filter(matches).sort(sortFn)`. Si `query` está vacía y el grupo `user` no tiene canciones, en su lugar renderizar la tarjeta de ayuda de importación (la del estado vacío actual, reutilizada con texto: "Añade tu primera canción — arrastra un .mid aquí o pulsa + Añadir"). El estado-vacío global actual (`songs.length === 0`) puede quedarse como fallback.
  - **Tarjeta pulsable**: el `div.card` gana `onClick={() => onOpen(s)}` y `style={{ cursor: 'pointer' }}`; se ELIMINA el botón "Aprender"; el botón 🗑 (solo grupo user) hace `e.stopPropagation()` antes del confirm. A la derecha de la tarjeta, un simple `<span style={{ color: 'var(--ink-3)', fontSize: 18 }}>›</span>` como afordancia.
  - **Chip de estilo**: en la línea de metadatos, si `s.style`: `<span className="chip" style={{ fontSize: 11, padding: '2px 8px' }}>{s.style}</span>` junto a las estrellas.
  - **"Nueva" en vez de barra al 0%**: si `s.bestScore === null`, en lugar de la barra mostrar `<span className="chip" style={{ fontSize: 11 }}>Nueva</span>`; con puntuación, la barra actual.
- [ ] **Step 5:** `npm test` + build + dev-server 200. **Step 6: Commit** — `git add -A && git commit -m "feat(ui): biblioteca con tus canciones primero, buscador, orden y táctil 44px"`

---

### Task 4: memoria de ajustes + defaults + "Seguir con X"

**Files:** Modify `src/screens/SongSetupScreen.tsx`, `src/App.tsx`

- [ ] **Step 1: `SongSetupScreen.tsx`** — props ganan `initialValues?: SessionConfig | null`. Los `useState` iniciales pasan a:
```ts
const [door, setDoor] = useState<Door>(initialValues?.door ?? 'learn');
const [input, setInput] = useState<InputKind | null>(initialValues?.input ?? null);
const [level, setLevel] = useState<Level>(initialValues?.level ?? 'easy');
const [speed, setSpeed] = useState(initialValues?.speed ?? 0.6);
const [hand, setHand] = useState<EngineConfig['hand']>(initialValues?.hand ?? 'both');
const [appSound, setAppSound] = useState(initialValues?.appSound ?? true);
```
(OJO: `input` guardado se respeta tal cual; el chip "automático" solo aplica si es null.)
- [ ] **Step 2: `App.tsx`** —
  - `const prefs = useMemo(() => createPrefsStore(), []);` (+import).
  - Estado: `const [setupInitial, setSetupInitial] = useState<SessionConfig | null>(null);` y `const [lastSession, setLastSession] = useState<{ songId: string; config: SessionConfig } | null>(null);`
  - Carga al montar: `useEffect(() => { prefs.getLastSession().then(setLastSession); }, [prefs]);`
  - Al abrir una canción desde la biblioteca (`onOpen`): antes de `setSetupSong(s)`, cargar `prefs.getSongPrefs(s.id).then(cfg => { setSetupInitial(cfg); setSetupSong(s); });` (función `openSong`).
  - `SongSetupScreen` recibe `initialValues={setupInitial}`; en `onStart`: `prefs.saveSongPrefs(setupSong.id, config); prefs.saveLastSession(setupSong.id, config); setLastSession({ songId: setupSong.id, config }); setSession(...)`.
  - **"Cambiar modo" conserva la config**: `onChangeMode={() => { setSetupInitial(session.config); setSession(null); }}` (setupSong sigue montado).
  - **Tarjeta "Seguir con X"** en el hub (encima de las dos áreas), solo si `lastSession` y la canción existe en `songs`:
```tsx
{lastSession && (() => {
  const s = songs.find(x => x.id === lastSession.songId);
  if (!s) return null;
  return (
    <button className="card" style={{ width: '100%', display: 'flex', gap: 14, alignItems: 'center', textAlign: 'left', marginBottom: 12, border: '2px solid var(--right-soft)' }}
      onClick={() => setSession({ song: s, config: lastSession.config })}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--right-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>▶</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Seguir con {s.title}</div>
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Como la última vez — directo a tocar</div>
      </div>
    </button>
  );
})()}
```
- [ ] **Step 3:** `npm test` (100/100) + build + dev 200. **Step 4: Commit** — `git add -A && git commit -m "feat: memoria de ajustes por canción, defaults de principiante y 'Seguir con'"`

---

### Task 5: Verificación final

- [ ] `npm test` 100/100 + build limpio.
- [ ] Manual: abrir canción → defaults Fácil/60% → cambiar a 75%/derecha → empezar → salir → reabrir la MISMA canción → recuerda 75%/derecha; el inicio muestra "Seguir con X" que salta directo; "Cambiar modo" al terminar conserva la config; biblioteca: tus canciones arriba (o ayuda de importar si vacía), buscador encuentra "salsa", orden por dificultad funciona, tarjeta entera abre, 🗑 no abre la canción, chips de estilo visibles, "Nueva" en no jugadas.
- [ ] iPhone: botones fantasma y tiradores cómodos al dedo.
