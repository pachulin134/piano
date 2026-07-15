import { describe, it, expect } from 'vitest';
import { createTheoryStore, type KV } from './theoryStore';

function memoryKV(): KV {
  const m = new Map<string, unknown>();
  return { get: async k => m.get(k), set: async (k, v) => { m.set(k, v); } };
}

describe('theoryStore', () => {
  it('marca y lista completadas, idempotente', async () => {
    const s = createTheoryStore(memoryKV());
    expect(await s.listCompleted()).toEqual([]);
    await s.markCompleted('n1l1');
    await s.markCompleted('n1l1'); // idempotente
    await s.markCompleted('n1l2');
    expect(new Set(await s.listCompleted())).toEqual(new Set(['n1l1', 'n1l2']));
  });
});
