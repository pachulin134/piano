export type Hand = 'left' | 'right';

export interface SongNote {
  midi: number;      // número MIDI 21..108 (A0..C8)
  time: number;      // segundos desde el inicio, al tempo original
  duration: number;  // segundos
  hand: Hand;
}

export interface Song {
  id: string;
  title: string;
  notes: SongNote[]; // ordenadas por time
  duration: number;  // segundos
  difficulty: 1 | 2 | 3 | 4 | 5;
  bestScore: number | null; // % 0..100
  style?: string; // estilo musical (chip en la biblioteca)
}

export interface NoteGroup {
  time: number;
  notes: SongNote[];
}
