import { describe, it, expect } from 'vitest';
import { groupNotes } from './groupNotes';
import type { SongNote } from './types';

const n = (midi: number, time: number): SongNote =>
  ({ midi, time, duration: 0.5, hand: 'right' });

describe('groupNotes', () => {
  it('agrupa notas casi simultáneas en un acorde', () => {
    const groups = groupNotes([n(60, 0), n(64, 0.02), n(67, 0.04), n(72, 1)]);
    expect(groups).toHaveLength(2);
    expect(groups[0].notes.map(x => x.midi)).toEqual([60, 64, 67]);
    expect(groups[1].notes.map(x => x.midi)).toEqual([72]);
  });

  it('devuelve vacío para lista vacía', () => {
    expect(groupNotes([])).toEqual([]);
  });
});
