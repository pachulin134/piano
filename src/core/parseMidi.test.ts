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

  it('ignora pistas de percusión (canal 10) para asignar manos', () => {
    const midi = new Midi();
    const drums = midi.addTrack();
    drums.channel = 9; // canal 10 (0-indexado) = percusión
    drums.addNote({ midi: 36, time: 0, duration: 0.25 });
    drums.addNote({ midi: 38, time: 0.5, duration: 0.25 });
    const melody = midi.addTrack();
    melody.addNote({ midi: 50, time: 0, duration: 0.5 }); // grave → izquierda
    melody.addNote({ midi: 70, time: 0.5, duration: 0.5 }); // agudo → derecha
    const song = parseMidi(midi.toArray().buffer as ArrayBuffer, 'Drums');
    expect(song.notes).toHaveLength(2);
    expect(song.notes.some(n => n.midi === 36 || n.midi === 38)).toBe(false);
    // La melodía queda como única pista → separación por Do central
    expect(song.notes.find(n => n.midi === 50)!.hand).toBe('left');
    expect(song.notes.find(n => n.midi === 70)!.hand).toBe('right');
  });

  it('descarta notas fuera del rango del piano (21..108)', () => {
    const midi = new Midi();
    const t = midi.addTrack();
    t.addNote({ midi: 15, time: 0, duration: 0.5 });
    t.addNote({ midi: 60, time: 0.5, duration: 0.5 });
    t.addNote({ midi: 115, time: 1, duration: 0.5 });
    const song = parseMidi(midi.toArray().buffer as ArrayBuffer, 'Rango');
    expect(song.notes.map(n => n.midi)).toEqual([60]);
  });

  it('lanza error con bytes que no son MIDI', () => {
    expect(() => parseMidi(new TextEncoder().encode('esto no es midi').buffer as ArrayBuffer, 'x')).toThrow(/válido/i);
  });

  it('las notas quedan ordenadas por tiempo', () => {
    const song = parseMidi(twoTrackMidi(), 'Orden');
    const times = song.notes.map(n => n.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('extrae el bpm del primer tempo del MIDI', () => {
    const midi = new Midi();
    midi.header.setTempo(100);
    const t = midi.addTrack();
    t.addNote({ midi: 60, time: 0, duration: 0.5 });
    const song = parseMidi(midi.toArray().buffer as ArrayBuffer, 'Tempo');
    expect(song.bpm).toBe(100);
  });

  it('sin tempo explícito, el bpm por defecto es 120', () => {
    const song = parseMidi(singleTrackMidi(), 'SinTempo');
    expect(song.bpm).toBe(120);
  });
});
