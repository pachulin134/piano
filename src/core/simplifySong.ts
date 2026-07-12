import { groupNotes } from './groupNotes';
import type { Song, SongNote } from './types';

export type Level = 'easy' | 'medium' | 'original';

export const LEVEL_LABELS: Record<Level, string> = {
  easy: 'Fácil', medium: 'Medio', original: 'Original',
};

/**
 * Versión simplificada de una canción para practicar por niveles.
 * easy: solo melodía (derecha; la nota más aguda de cada acorde). Si la canción
 *       no tiene mano derecha, se usa la izquierda como fuente de melodía.
 * medium: derecha íntegra + izquierda reducida a su nota más grave por acorde.
 * original: la canción tal cual (misma referencia).
 */
export function simplifySong(song: Song, level: Level): Song {
  if (level === 'original') return song;

  const right = song.notes.filter(nt => nt.hand === 'right');
  const left = song.notes.filter(nt => nt.hand === 'left');

  let notes: SongNote[];
  if (level === 'easy') {
    const source = right.length > 0 ? right : left;
    notes = topNotePerGroup(source);
  } else {
    notes = [...right, ...bottomNotePerGroup(left)]
      .sort((a, b) => a.time - b.time || a.midi - b.midi);
  }
  return { ...song, notes };
}

function topNotePerGroup(notes: SongNote[]): SongNote[] {
  return groupNotes(notes).map(g =>
    g.notes.reduce((top, nt) => (nt.midi > top.midi ? nt : top)));
}

function bottomNotePerGroup(notes: SongNote[]): SongNote[] {
  return groupNotes(notes).map(g =>
    g.notes.reduce((low, nt) => (nt.midi < low.midi ? nt : low)));
}
