import type { NoteGroup, SongNote } from './types';

/** Agrupa notas cuyo inicio dista <= epsilon del inicio del grupo (acordes). Asume notas ordenadas por time. */
export function groupNotes(notes: SongNote[], epsilon = 0.05): NoteGroup[] {
  const groups: NoteGroup[] = [];
  for (const note of notes) {
    const last = groups[groups.length - 1];
    if (last && note.time - last.time <= epsilon) last.notes.push(note);
    else groups.push({ time: note.time, notes: [note] });
  }
  return groups;
}
