import { Midi } from '@tonejs/midi';
import { estimateDifficulty } from './difficulty';
import { uid } from './uid';
import type { Hand, Song, SongNote } from './types';

/** Parsea un archivo .mid. Lanza Error con mensaje entendible si es inválido o no tiene notas. */
export function parseMidi(data: ArrayBuffer, title: string): Song {
  let midi: Midi;
  try {
    midi = new Midi(data);
  } catch {
    throw new Error('El archivo no es un MIDI válido');
  }
  const tracks = midi.tracks.filter(t => t.notes.length > 0);
  if (tracks.length === 0) throw new Error('El archivo MIDI no contiene notas');

  const notes: SongNote[] = tracks
    .flatMap((track, i) =>
      track.notes.map(n => ({
        midi: n.midi,
        time: n.time,
        duration: n.duration,
        hand: assignHand(tracks.length, i, n.midi),
      })),
    )
    .sort((a, b) => a.time - b.time || a.midi - b.midi);

  const duration = Math.max(...notes.map(n => n.time + n.duration));
  const song: Song = {
    id: uid(),
    title,
    notes,
    duration,
    difficulty: 3,
    bestScore: null,
  };
  song.difficulty = estimateDifficulty(song);
  return song;
}

function assignHand(trackCount: number, trackIndex: number, midi: number): Hand {
  if (trackCount >= 2) return trackIndex === 0 ? 'right' : 'left';
  return midi >= 60 ? 'right' : 'left';
}
