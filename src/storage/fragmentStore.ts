import { get, set } from 'idb-keyval';

export interface KV {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

const KEY = 'fragments-v1';
type ScoresBySong = Record<string, Record<number, number>>;

export function createFragmentStore(kv: KV = { get, set }) {
  const readAll = async (): Promise<ScoresBySong> =>
    ((await kv.get(KEY)) as ScoresBySong | undefined) ?? {};
  return {
    async getFragmentScores(songId: string): Promise<Record<number, number>> {
      return (await readAll())[songId] ?? {};
    },
    async recordFragmentScore(songId: string, fragmentIndex: number, score: number): Promise<void> {
      const all = await readAll();
      const forSong = all[songId] ?? {};
      const prev = forSong[fragmentIndex];
      if (prev !== undefined && score <= prev) return;
      await kv.set(KEY, { ...all, [songId]: { ...forSong, [fragmentIndex]: score } });
    },
  };
}

export type FragmentStore = ReturnType<typeof createFragmentStore>;
