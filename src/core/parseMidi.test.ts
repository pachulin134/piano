import { describe, it, expect } from 'vitest';
import { Midi } from '@tonejs/midi';
import { parseMidi } from './parseMidi';

function twoTrackMidi(): ArrayBuffer {
  const midi = new Midi();
  const right = midi.addTrack();
  right.addNote({ midi: 72, time: 0, duration: 0.5 });
  right.addNote({ midi: 74, time: 0.5, duration: 0.5 });
  const left = midi.addTrack();
  left.addNote({ midi: 48, time: 0, duration: 1 });
  return midi.toArray().buffer as ArrayBuffer;
}

function singleTrackMidi(): ArrayBuffer {
  const midi = new Midi();
  const t = midi.addTrack();
  t.addNote({ midi: 40, time: 0, duration: 0.5 }); // grave → izquierda
  t.addNote({ midi: 72, time: 0, duration: 0.5 }); // agudo → derecha
  return midi.toArray().buffer as ArrayBuffer;
}

describe('parseMidi', () => {
  it('con 2+ pistas: pista 0 = derecha, resto = izquierda', () => {
    const song = parseMidi(twoTrackMidi(), 'Test');
    expect(song.title).toBe('Test');
    expect(song.notes).toHaveLength(3);
    expect(song.notes.find(n => n.midi === 72)!.hand).toBe('right');
    expect(song.notes.find(n => n.midi === 48)!.hand).toBe('left');
    expect(song.duration).toBeCloseTo(1, 1);
  });

  it('con 1 pista: separa manos por el Do central (midi 60)', () => {
    const song = parseMidi(singleTrackMidi(), 'Mono');
    expect(song.notes.find(n => n.midi === 40)!.hand).toBe('left');
    expect(song.notes.find(n => n.midi === 72)!.hand).toBe('right');
  });

  it('lanza error si no hay notas', () => {
    const empty = new Midi().toArray().buffer as ArrayBuffer;
    expect(() => parseMidi(empty, 'Vacío')).toThrow(/notas/i);
  });

  it('las notas quedan ordenadas por tiempo', () => {
    const song = parseMidi(twoTrackMidi(), 'Orden');
    const times = song.notes.map(n => n.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
