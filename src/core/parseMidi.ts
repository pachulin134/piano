import { Midi } from '@tonejs/midi';
import { estimateDifficulty } from './difficulty';
import { uid } from './uid';
import type { Hand, Song, SongNote } from './types';

/** Parsea un archivo .mid. Lanza Error con mensaje entendible si es inválido o no tiene notas. */
export function parseMidi(data: ArrayBuffer, title: string, id?: string): Song {
  let midi: Midi;
  try {
    midi = new Midi(data);
  } catch {
    throw new Error('El archivo no es un MIDI válido');
  }
  const tracks = midi.tracks.filter(t => t.notes.length > 0 && !t.instrument.percussion);
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
    .filter(n => n.midi >= 21 && n.midi <= 108) // rango del piano de 88 teclas
    .sort((a, b) => a.time - b.time || a.midi - b.midi);
  if (notes.length === 0) throw new Error('El archivo MIDI no contiene notas');

  const duration = notes.reduce((max, n) => Math.max(max, n.time + n.duration), 0);
  const bpm = Math.round(midi.header.tempos[0]?.bpm ?? 120);
  const song: Song = {
    id: id ?? uid(),
    title,
    notes,
    duration,
    difficulty: 3,
    bestScore: null,
    bpm,
  };
  song.difficulty = estimateDifficulty(song);
  return song;
}

function assignHand(trackCount: number, trackIndex: number, midi: number): Hand {
  if (trackCount >= 2) return trackIndex === 0 ? 'right' : 'left';
  return midi >= 60 ? 'right' : 'left';
}
