import { describe, it, expect } from 'vitest';
import { createFragmentStore, type KV } from './fragmentStore';

function memoryKV(): KV {
  const m = new Map<string, unknown>();
  return { get: async k => m.get(k), set: async (k, v) => { m.set(k, v); } };
}

describe('fragmentStore', () => {
  it('sin datos previos, la lista de una canción está vacía', async () => {
    const store = createFragmentStore(memoryKV());
    expect(await store.getFragmentScores('song-a')).toEqual({});
  });

  it('guarda el score por fragmento y por canción, separados', async () => {
    const store = createFragmentStore(memoryKV());
    await store.recordFragmentScore('song-a', 0, 90);
    await store.recordFragmentScore('song-a', 1, 70);
    await store.recordFragmentScore('song-b', 0, 60);
    expect(await store.getFragmentScores('song-a')).toEqual({ 0: 90, 1: 70 });
    expect(await store.getFragmentScores('song-b')).toEqual({ 0: 60 });
  });

  it('solo sube el score si mejora (igual que songStore.recordScore)', async () => {
    const store = createFragmentStore(memoryKV());
    await store.recordFragmentScore('song-a', 0, 90);
    await store.recordFragmentScore('song-a', 0, 60);
    expect(await store.getFragmentScores('song-a')).toEqual({ 0: 90 });
  });
});
