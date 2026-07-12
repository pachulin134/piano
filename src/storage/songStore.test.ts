import { describe, it, expect } from 'vitest';
import { createSongStore, type KV } from './songStore';
import type { Song } from '../core/types';

function memoryKV(): KV {
  const m = new Map<string, unknown>();
  return {
    get: async k => m.get(k),
    set: async (k, v) => { m.set(k, v); },
  };
}

const song = (id: string): Song =>
  ({ id, title: id, notes: [{ midi: 60, time: 0, duration: 1, hand: 'right' }], duration: 1, difficulty: 1, bestScore: null });

describe('songStore', () => {
  it('guarda, lista y borra canciones', async () => {
    const store = createSongStore(memoryKV());
    await store.add(song('a'));
    await store.add(song('b'));
    expect((await store.list()).map(s => s.id)).toEqual(['a', 'b']);
    await store.remove('a');
    expect((await store.list()).map(s => s.id)).toEqual(['b']);
  });

  it('actualiza la mejor puntuación solo si mejora', async () => {
    const store = createSongStore(memoryKV());
    await store.add(song('a'));
    await store.recordScore('a', 70);
    await store.recordScore('a', 50); // peor: no debe pisar
    expect((await store.list())[0].bestScore).toBe(70);
  });
});
