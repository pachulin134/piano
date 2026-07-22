import { describe, it, expect } from 'vitest';
import { splitIntoFragments } from './fragments';
import type { Song, SongNote } from './types';

const note = (midi: number, time: number): SongNote => ({ midi, time, duration: 0.4, hand: 'right' });

function song(notes: SongNote[], duration: number): Song {
  return { id: 's', title: 's', notes, duration, difficulty: 1, bestScore: null };
}

describe('splitIntoFragments', () => {
  it('canciones cortas (menos de 20s) no se trocean', () => {
    const notes = Array.from({ length: 10 }, (_, i) => note(60 + i, i * 1.5));
    const s = song(notes, 15);
    const frags = splitIntoFragments(s);
    expect(frags).toEqual([{ index: 0, start: 0, end: 15 }]);
  });

  it('canción larga: varios fragmentos, contiguos, cubren toda la duración', () => {
    const notes = Array.from({ length: 60 }, (_, i) => note(60 + (i % 12), i * 1));
    const s = song(notes, 60);
    const frags = splitIntoFragments(s);
    expect(frags.length).toBeGreaterThan(1);
    expect(frags[0].start).toBe(0);
    expect(frags[frags.length - 1].end).toBe(60);
    for (let i = 0; i < frags.length - 1; i++) {
      expect(frags[i].end).toBe(frags[i + 1].start);
    }
  });

  it('los límites internos caen exactamente en el inicio de alguna nota (nunca a mitad de silencio)', () => {
    const notes = Array.from({ length: 60 }, (_, i) => note(60 + (i % 12), i * 1));
    const s = song(notes, 60);
    const frags = splitIntoFragments(s);
    const onsets = new Set(notes.map(n => n.time));
    for (let i = 1; i < frags.length; i++) {
      expect(onsets.has(frags[i].start)).toBe(true);
    }
  });

  it('los índices son 0..N-1 en orden', () => {
    const notes = Array.from({ length: 60 }, (_, i) => note(60 + (i % 12), i * 1));
    const s = song(notes, 60);
    const frags = splitIntoFragments(s);
    frags.forEach((f, i) => expect(f.index).toBe(i));
  });

  it('canción sin notas no revienta: un solo fragmento', () => {
    const s = song([], 40);
    expect(splitIntoFragments(s)).toEqual([{ index: 0, start: 0, end: 40 }]);
  });
});
