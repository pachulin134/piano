import { describe, it, expect } from 'vitest';
import { simplifySong } from './simplifySong';
import type { Song, SongNote } from './types';

const n = (midi: number, time: number, hand: SongNote['hand']): SongNote =>
  ({ midi, time, duration: 0.4, hand });

function song(notes: SongNote[]): Song {
  return { id: 's', title: 's', notes, duration: 2, difficulty: 3, bestScore: null };
}

describe('simplifySong', () => {
  const base = song([
    n(60, 0, 'right'), n(64, 0.01, 'right'), n(67, 0.02, 'right'), // acorde derecha → aguda 67
    n(36, 0, 'left'), n(43, 0.01, 'left'),                          // acorde izquierda → grave 36
    n(72, 1, 'right'),
    n(40, 1, 'left'),
  ]);

  it('original devuelve la canción idéntica', () => {
    expect(simplifySong(base, 'original')).toBe(base);
  });

  it('easy: solo derecha y solo la nota más aguda de cada acorde', () => {
    const s = simplifySong(base, 'easy');
    expect(s.notes.map(x => x.midi)).toEqual([67, 72]);
    expect(s.notes.every(x => x.hand === 'right')).toBe(true);
    expect(s.duration).toBe(base.duration);
  });

  it('medium: derecha íntegra e izquierda reducida al bajo de cada acorde', () => {
    const s = simplifySong(base, 'medium');
    expect(s.notes.filter(x => x.hand === 'right').map(x => x.midi)).toEqual([60, 64, 67, 72]);
    expect(s.notes.filter(x => x.hand === 'left').map(x => x.midi)).toEqual([36, 40]);
  });

  it('easy con canción sin mano derecha devuelve la izquierda melodizada (no vacía)', () => {
    const onlyLeft = song([n(36, 0, 'left'), n(43, 0.01, 'left')]);
    const s = simplifySong(onlyLeft, 'easy');
    expect(s.notes.length).toBeGreaterThan(0); // fallback: usa la izquierda
    expect(s.notes.map(x => x.midi)).toEqual([43]); // la más aguda del acorde
  });

  it('las notas resultantes quedan ordenadas por tiempo', () => {
    const s = simplifySong(base, 'medium');
    const times = s.notes.map(x => x.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
