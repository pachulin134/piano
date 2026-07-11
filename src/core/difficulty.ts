import { groupNotes } from './groupNotes';
import type { Song } from './types';

/** Heurística: densidad de notas por segundo + proporción de acordes. */
export function estimateDifficulty(song: Song): 1 | 2 | 3 | 4 | 5 {
  const nps = song.notes.length / Math.max(song.duration, 1);
  const groups = groupNotes(song.notes);
  const chordRatio = groups.filter(g => g.notes.length > 1).length / Math.max(groups.length, 1);

  let level: number;
  if (nps < 1.5) level = 1;
  else if (nps < 3) level = 2;
  else if (nps < 5) level = 3;
  else if (nps < 8) level = 4;
  else level = 5;

  if (chordRatio > 0.3) level += 1;
  return Math.min(5, Math.max(1, level)) as 1 | 2 | 3 | 4 | 5;
}
