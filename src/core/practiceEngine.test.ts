import { describe, it, expect } from 'vitest';
import { PracticeEngine } from './practiceEngine';
import type { Song, SongNote } from './types';

const note = (midi: number, time: number, hand: SongNote['hand'] = 'right'): SongNote =>
  ({ midi, time, duration: 0.4, hand });

function song(notes: SongNote[]): Song {
  return {
    id: 's', title: 's', notes,
    duration: Math.max(...notes.map(n => n.time + n.duration)),
    difficulty: 1, bestScore: null,
  };
}

describe('PracticeEngine — modo espera', () => {
  it('se detiene en el primer grupo y espera la nota correcta', () => {
    const e = new PracticeEngine(song([note(60, 0.5), note(62, 1.0)]),
      { waitMode: true, speed: 1, hand: 'both' });
    e.tick(2); // intenta avanzar 2s
    expect(e.time).toBeCloseTo(0.5, 5); // clavado en el grupo
    expect(e.expectedNotes()).toEqual([60]);

    expect(e.onKeyDown(61)).toBe('wrong');
    expect(e.onKeyDown(60)).toBe('correct');
    expect(e.expectedNotes()).toEqual([]);

    e.tick(2);
    expect(e.time).toBeCloseTo(1.0, 5); // siguiente grupo
    expect(e.expectedNotes()).toEqual([62]);
  });

  it('un acorde requiere todas sus notas', () => {
    const e = new PracticeEngine(song([note(60, 0), note(64, 0.01)]),
      { waitMode: true, speed: 1, hand: 'both' });
    e.tick(1);
    expect(new Set(e.expectedNotes())).toEqual(new Set([60, 64]));
    e.onKeyDown(60);
    expect(e.finished).toBe(false);
    e.onKeyDown(64);
    e.tick(5);
    expect(e.finished).toBe(true);
  });

  it('la puntuación refleja aciertos y fallos', () => {
    const e = new PracticeEngine(song([note(60, 0)]),
      { waitMode: true, speed: 1, hand: 'both' });
    e.tick(1);
    e.onKeyDown(59); // fallo
    e.onKeyDown(60); // acierto
    expect(e.score()).toBe(50);
  });

  it('hand="right" practica solo la derecha y devuelve la izquierda como acompañamiento', () => {
    const e = new PracticeEngine(song([note(48, 0.2, 'left'), note(72, 0.5, 'right')]),
      { waitMode: true, speed: 1, hand: 'right' });
    const played = e.tick(0.3); // pasa por 0.2s
    expect(played.map(n => n.midi)).toEqual([48]); // la app toca la izquierda
    e.tick(1);
    expect(e.expectedNotes()).toEqual([72]); // el usuario debe tocar la derecha
  });

  it('speed=0.5 avanza el tiempo musical a la mitad', () => {
    const e = new PracticeEngine(song([note(60, 1)]),
      { waitMode: true, speed: 0.5, hand: 'both' });
    e.tick(1); // 1s real = 0.5s musical
    expect(e.time).toBeCloseTo(0.5, 5);
  });
});

describe('PracticeEngine — modo continuo (sin espera)', () => {
  it('un tick grande atraviesa varios grupos sin quedarse pegado al primero', () => {
    const e = new PracticeEngine(song([note(60, 0.1), note(62, 0.2), note(64, 0.3)]),
      { waitMode: false, speed: 1, hand: 'both' });
    e.tick(0.5); // cruza los 3 grupos en un solo tick
    expect(e.time).toBeCloseTo(0.5, 5);
  });
});
