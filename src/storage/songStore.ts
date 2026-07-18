import { get, set } from 'idb-keyval';
import { parseMidi } from '../core/parseMidi';
import type { Song } from '../core/types';

export interface KV {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

const SCORES_KEY = 'scores-v1';
const LEGACY_SONGS_KEY = 'songs-v1';
const TITLES_KEY = 'titles-v1';
const HIDDEN_KEY = 'hidden-v1';
const PLAYED_KEY = 'played-v1';

type ScoresMap = Record<string, number>;
type TitlesMap = Record<string, string>;
type PlayedMap = Record<string, number>;

interface CatalogItem {
  file: string;
  title: string;
  id?: string;
  style?: string;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function readScores(kv: KV): Promise<ScoresMap> {
  return ((await kv.get(SCORES_KEY)) as ScoresMap | undefined) ?? {};
}

async function writeScores(kv: KV, scores: ScoresMap): Promise<void> {
  await kv.set(SCORES_KEY, scores);
}

function applyScores(songs: Song[], scores: ScoresMap): Song[] {
  return songs.map(s => ({
    ...s,
    bestScore: scores[s.id] ?? s.bestScore ?? null,
  }));
}

async function readTitles(kv: KV): Promise<TitlesMap> {
  return ((await kv.get(TITLES_KEY)) as TitlesMap | undefined) ?? {};
}

async function writeTitles(kv: KV, titles: TitlesMap): Promise<void> {
  await kv.set(TITLES_KEY, titles);
}

function applyTitles(songs: Song[], titles: TitlesMap): Song[] {
  return songs.map(s => (titles[s.id] ? { ...s, title: titles[s.id] } : s));
}

async function readHidden(kv: KV): Promise<string[]> {
  return ((await kv.get(HIDDEN_KEY)) as string[] | undefined) ?? [];
}

async function writeHidden(kv: KV, hidden: string[]): Promise<void> {
  await kv.set(HIDDEN_KEY, hidden);
}

async function readPlayed(kv: KV): Promise<PlayedMap> {
  return ((await kv.get(PLAYED_KEY)) as PlayedMap | undefined) ?? {};
}

async function writePlayed(kv: KV, played: PlayedMap): Promise<void> {
  await kv.set(PLAYED_KEY, played);
}

function applyPlayed(songs: Song[], played: PlayedMap): Song[] {
  return songs.map(s => (played[s.id] !== undefined ? { ...s, playedPct: played[s.id] } : s));
}

async function loadCatalog(
  indexUrl: string,
  baseUrl: string,
  idFor: (item: CatalogItem) => string,
): Promise<Song[]> {
  try {
    const index: CatalogItem[] = await (await fetch(indexUrl)).json();
    const songs: Song[] = [];
    for (const item of index) {
      const id = item.id ?? idFor(item);
      const buf = await (await fetch(`${baseUrl}${item.file}`)).arrayBuffer();
      const parsed = parseMidi(buf, item.title, id);
      if (item.style) parsed.style = item.style;
      songs.push(parsed);
    }
    return songs;
  } catch {
    return [];
  }
}

async function loadLegacySongs(kv: KV): Promise<Song[]> {
  return ((await kv.get(LEGACY_SONGS_KEY)) as Song[] | undefined) ?? [];
}

async function saveToDisk(song: Song, midi: ArrayBuffer): Promise<boolean> {
  if (!import.meta.env.DEV) return false;
  try {
    const res = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: song.id,
        title: song.title,
        midi: arrayBufferToBase64(midi),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function removeFromDisk(id: string): Promise<boolean> {
  if (!import.meta.env.DEV) return false;
  try {
    const res = await fetch(`/api/songs/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export function createSongStore(kv: KV = { get, set }) {
  const read = async (): Promise<Song[]> => {
    const scores = await readScores(kv);
    const titles = await readTitles(kv);
    const played = await readPlayed(kv);
    const hidden = await readHidden(kv);
    const claude = await loadCatalog(
      'songs/claude/index.json',
      'songs/claude/',
      item => `claude:${item.file}`,
    );
    const builtin = await loadCatalog(
      'songs/index.json',
      'songs/',
      item => `builtin:${item.file}`,
    );
    const userFromDisk = await loadCatalog(
      'songs/user/index.json',
      'songs/user/',
      item => item.id ?? item.file,
    );
    const legacy = await loadLegacySongs(kv);

    const seen = new Set<string>();
    const songs: Song[] = [];
    for (const s of [...claude, ...builtin, ...userFromDisk, ...legacy]) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      songs.push(s);
    }
    const visible = songs.filter(s => !hidden.includes(s.id));
    return applyPlayed(applyTitles(applyScores(visible, scores), titles), played);
  };

  const writeLegacy = async (songs: Song[]) => kv.set(LEGACY_SONGS_KEY, songs);

  return {
    list: read,
    async add(song: Song, midi?: ArrayBuffer): Promise<void> {
      if (midi && await saveToDisk(song, midi)) return;

      const songs = await read();
      if (songs.some(s => s.id === song.id)) return;
      const legacy = await loadLegacySongs(kv);
      await writeLegacy([...legacy, song]);
    },
    async remove(id: string): Promise<void> {
      // Las colecciones de fábrica (incluidas y compuestas por Claude) no se borran
      if (id.startsWith('builtin:') || id.startsWith('claude:')) return;

      // Borrado suave: se oculta siempre, sea o no posible el borrado físico
      // (idempotente; así funciona también en producción sin API de disco).
      const hidden = await readHidden(kv);
      if (!hidden.includes(id)) {
        await writeHidden(kv, [...hidden, id]);
      }

      if (await removeFromDisk(id)) {
        const scores = await readScores(kv);
        delete scores[id];
        await writeScores(kv, scores);
        return;
      }

      const legacy = await loadLegacySongs(kv);
      await writeLegacy(legacy.filter(s => s.id !== id));
      const scores = await readScores(kv);
      delete scores[id];
      await writeScores(kv, scores);
    },
    async recordScore(id: string, score: number): Promise<void> {
      const scores = await readScores(kv);
      const prev = scores[id] ?? null;
      if (prev !== null && score <= prev) return;
      scores[id] = score;
      await writeScores(kv, scores);

      const legacy = await loadLegacySongs(kv);
      if (legacy.some(s => s.id === id)) {
        await writeLegacy(legacy.map(s =>
          s.id === id ? { ...s, bestScore: score } : s,
        ));
      }
    },
    async rename(id: string, title: string): Promise<void> {
      const trimmed = title.trim();
      if (!trimmed) return;
      const titles = await readTitles(kv);
      titles[id] = trimmed;
      await writeTitles(kv, titles);
    },
    async recordPlayed(id: string, pct: number): Promise<void> {
      const clamped = Math.round(Math.max(0, Math.min(100, pct)));
      const played = await readPlayed(kv);
      const prev = played[id] ?? 0;
      if (clamped <= prev) return;
      played[id] = clamped;
      await writePlayed(kv, played);
    },
  };
}

export type SongStore = ReturnType<typeof createSongStore>;
