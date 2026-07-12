import { get, set } from 'idb-keyval';
import type { Song } from '../core/types';

export interface KV {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

const KEY = 'songs-v1';

export function createSongStore(kv: KV = { get, set }) {
  const read = async (): Promise<Song[]> => ((await kv.get(KEY)) as Song[] | undefined) ?? [];
  const write = (songs: Song[]) => kv.set(KEY, songs);

  return {
    list: read,
    async add(song: Song): Promise<void> {
      await write([...(await read()), song]);
    },
    async remove(id: string): Promise<void> {
      await write((await read()).filter(s => s.id !== id));
    },
    async recordScore(id: string, score: number): Promise<void> {
      await write((await read()).map(s =>
        s.id === id && (s.bestScore === null || score > s.bestScore)
          ? { ...s, bestScore: score } : s,
      ));
    },
  };
}

export type SongStore = ReturnType<typeof createSongStore>;
