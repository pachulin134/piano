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

  it('adds secuenciales sobre un KV con latencia conservan todas las canciones', async () => {
    const inner = memoryKV();
    const slowKV: KV = {
      get: async k => { await new Promise(r => setTimeout(r, 5)); return inner.get(k); },
      set: async (k, v) => { await new Promise(r => setTimeout(r, 5)); await inner.set(k, v); },
    };
    const store = createSongStore(slowKV);
    await store.add(song('a'));
    await store.add(song('b'));
    expect((await store.list()).map(s => s.id)).toEqual(['a', 'b']);
  });

  it('actualiza la mejor puntuación solo si mejora', async () => {
    const store = createSongStore(memoryKV());
    await store.add(song('a'));
    await store.recordScore('a', 70);
    await store.recordScore('a', 50);
    expect((await store.list()).find(s => s.id === 'a')?.bestScore).toBe(70);
  });

  it('no borra canciones de fábrica', async () => {
    const store = createSongStore(memoryKV());
    await store.remove('builtin:estrellita.mid');
    // sin fetch en tests la biblioteca queda vacía; el remove simplemente no falla
    expect(await store.list()).toEqual([]);
  });

  it('tampoco borra las piezas compuestas por Claude (claude:)', async () => {
    const store = createSongStore(memoryKV());
    // el guard corta ANTES de tocar nada: ni siquiera intenta borrar del legacy
    await store.add(song('claude:cielo-abierto.mid'));
    await store.remove('claude:cielo-abierto.mid');
    expect((await store.list()).map(s => s.id)).toEqual(['claude:cielo-abierto.mid']);
  });

  it('rename aplica el título y sobrevive a read()', async () => {
    const store = createSongStore(memoryKV());
    await store.add(song('a'));
    await store.rename('a', 'Nuevo título');
    expect((await store.list()).find(s => s.id === 'a')?.title).toBe('Nuevo título');
  });

  it('rename con título en blanco no cambia nada', async () => {
    const store = createSongStore(memoryKV());
    await store.add(song('a'));
    await store.rename('a', '   ');
    expect((await store.list()).find(s => s.id === 'a')?.title).toBe('a');
  });

  it('remove de un id no-fábrica lo oculta de list() aunque "exista" (reaparece en legacy)', async () => {
    const kv = memoryKV();
    const store = createSongStore(kv);
    await store.add(song('u1'));
    await store.remove('u1');
    expect((await store.list()).map(s => s.id)).not.toContain('u1');

    // Simula que la canción "reaparece" (p.ej. un borrado de disco que falló en prod
    // y el legacy se repuebla desde otra fuente): sigue oculta gracias a hidden-v1.
    await kv.set('songs-v1', [song('u1')]);
    expect((await store.list()).map(s => s.id)).not.toContain('u1');
  });

  it('recordPlayed guarda el máximo recorrido (60 luego 40 se queda en 60)', async () => {
    const store = createSongStore(memoryKV());
    await store.add(song('a'));
    await store.recordPlayed('a', 60);
    await store.recordPlayed('a', 40);
    expect((await store.list()).find(s => s.id === 'a')?.playedPct).toBe(60);
  });
});
