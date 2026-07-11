import { describe, it, expect } from 'vitest';
import { estimateDifficulty } from './difficulty';
import type { Song, SongNote } from './types';

function makeSong(notesPerSecond: number, seconds: number, chords: boolean): Song {
  const notes: SongNote[] = [];
  const total = Math.round(notesPerSecond * seconds);
  for (let i = 0; i < total; i++) {
    const time = i / notesPerSecond;
    notes.push({ midi: 60 + (i % 12), time, duration: 0.3, hand: 'right' });
    if (chords && i % 2 === 0) {
      notes.push({ midi: 48 + (i % 12), time, duration: 0.3, hand: 'left' });
    }
  }
  return { id: 'x', title: 'x', notes, duration: seconds, difficulty: 3, bestScore: null };
}

describe('estimateDifficulty', () => {
  it('pocas notas por segundo y sin acordes → fácil (1-2)', () => {
    expect(estimateDifficulty(makeSong(1, 30, false))).toBeLessThanOrEqual(2);
  });
  it('densidad media → medio (2-3)', () => {
    const d = estimateDifficulty(makeSong(3, 30, false));
    expect(d).toBeGreaterThanOrEqual(2);
    expect(d).toBeLessThanOrEqual(3);
  });
  it('muy denso y con acordes → difícil (4-5)', () => {
    expect(estimateDifficulty(makeSong(8, 30, true))).toBeGreaterThanOrEqual(4);
  });
});
