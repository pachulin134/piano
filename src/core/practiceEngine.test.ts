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

  it('onKeyDown devuelve "ignored" y no puntúa cuando no hay grupo pendiente', () => {
    const e = new PracticeEngine(song([note(60, 0.5)]),
      { waitMode: false, speed: 1, hand: 'both' });
    e.tick(0.05); // en modo continuo nunca hay grupo pendiente
    expect(e.onKeyDown(60)).toBe('ignored');
    expect(e.attempted).toBe(false); // sin pulsaciones evaluadas, score()=100 no significa nada
    expect(e.score()).toBe(100);
  });
});

describe('PracticeEngine — attempted y acompañamiento', () => {
  it('attempted pasa a true tras una pulsación evaluada en modo espera', () => {
    const e = new PracticeEngine(song([note(60, 0)]),
      { waitMode: true, speed: 1, hand: 'both' });
    expect(e.attempted).toBe(false);
    e.tick(1);
    e.onKeyDown(60);
    expect(e.attempted).toBe(true);
  });

  it('en modo espera, tick() devuelve [] cuando hand es "both" (sin acompañamiento)', () => {
    const e = new PracticeEngine(song([note(48, 0.2, 'left'), note(72, 0.5, 'right')]),
      { waitMode: true, speed: 1, hand: 'both' });
    expect(e.tick(0.1)).toEqual([]); // antes de cualquier grupo
    expect(e.tick(1)).toEqual([]);   // el tick que arma el primer grupo tampoco suena nada
  });
});

describe('PracticeEngine — modo escuchar', () => {
  it('reproduce todas las notas automáticamente sin esperar al usuario', () => {
    const e = new PracticeEngine(song([note(60, 0.1), note(62, 0.3)]),
      { waitMode: false, speed: 1, hand: 'both', listenMode: true });
    const played = e.tick(0.5);
    expect(played.map(n => n.midi)).toEqual([60, 62]);
    expect(e.finished).toBe(false);
    e.tick(1);
    expect(e.finished).toBe(true);
    expect(e.onKeyDown(60)).toBe('ignored');
  });

  it('respeta la velocidad al avanzar el tiempo', () => {
    const e = new PracticeEngine(song([note(60, 1)]),
      { waitMode: false, speed: 0.5, hand: 'both', listenMode: true });
    const played = e.tick(1); // 1s real = 0.5s musical
    expect(played).toEqual([]);
    expect(e.time).toBeCloseTo(0.5, 5);
    const played2 = e.tick(1);
    expect(played2.map(n => n.midi)).toEqual([60]);
  });

  it('toca ambas manos aunque hand no sea "both"', () => {
    const e = new PracticeEngine(song([note(48, 0, 'left'), note(72, 0.2, 'right')]),
      { waitMode: false, speed: 1, hand: 'right', listenMode: true });
    const played = e.tick(0.5);
    expect(played.map(n => n.midi)).toEqual([48, 72]);
  });
});

const guided = { waitMode: true, speed: 1, hand: 'both' as const, guidedMode: true };

describe('PracticeEngine — modo guiado (escuchar y tocar)', () => {
  it('toca la demo y luego espera que el usuario repita', () => {
    const e = new PracticeEngine(song([note(60, 0.5)]), guided);
    const demo = e.tick(0.01);
    expect(demo.map(n => n.midi)).toEqual([60]);
    expect(e.guidedPhase).toBe('demo');
    expect(e.onKeyDown(60)).toBe('ignored');

    e.tick(0.5); // termina la demo
    expect(e.guidedPhase).toBe('repeat');
    expect(e.expectedNotes()).toEqual([60]);

    expect(e.onKeyDown(61)).toBe('wrong');
    expect(e.onKeyDown(60)).toBe('correct');
    expect(e.finished).toBe(true);
  });

  it('un acorde: demo conjunta y luego todas las notas requeridas', () => {
    const e = new PracticeEngine(song([note(60, 0), note(64, 0.01)]), guided);
    const demo = e.tick(0.01);
    expect(new Set(demo.map(n => n.midi))).toEqual(new Set([60, 64]));
    e.tick(0.5);
    expect(new Set(e.expectedNotes())).toEqual(new Set([60, 64]));
    e.onKeyDown(60);
    expect(e.finished).toBe(false);
    e.onKeyDown(64);
    expect(e.finished).toBe(true);
  });

  it('avanza grupo a grupo con demo entre cada uno', () => {
    const e = new PracticeEngine(song([note(60, 0), note(62, 1)]), guided);
    e.tick(0.01); // demo grupo 1
    e.tick(0.5);
    e.onKeyDown(60);
    const demo2 = e.tick(0.01);
    expect(demo2.map(n => n.midi)).toEqual([62]);
    expect(e.time).toBeCloseTo(1, 5);
  });

  it('puntúa aciertos y fallos', () => {
    const e = new PracticeEngine(song([note(60, 0)]), guided);
    e.tick(0.01);
    e.tick(0.5);
    e.onKeyDown(59);
    e.onKeyDown(60);
    expect(e.score()).toBe(50);
  });
});

const playAlong = { waitMode: false, speed: 1, hand: 'both' as const, playAlongMode: true };

describe('PracticeEngine — modo play-along (toca y corrígeme)', () => {
  it('evalúa notas en la ventana de tiempo mientras avanza', () => {
    const e = new PracticeEngine(song([note(60, 0.5)]), playAlong);
    e.tick(0.01);
    expect(e.onKeyDown(60)).toBe('ignored'); // aún no es momento

    e.tick(0.5); // time = 0.5
    expect(e.onKeyDown(61)).toBe('wrong');
    expect(e.onKeyDown(60)).toBe('correct');
    expect(e.score()).toBe(50);
  });

  it('no cuenta dos veces la misma nota', () => {
    const e = new PracticeEngine(song([note(60, 0)]), playAlong);
    e.tick(0.01);
    expect(e.onKeyDown(60)).toBe('correct');
    expect(e.onKeyDown(60)).toBe('ignored');
  });

  it('muestra las notas esperadas en la ventana actual', () => {
    const e = new PracticeEngine(song([note(60, 0.5), note(64, 0.52)]), playAlong);
    e.tick(0.5);
    expect(new Set(e.expectedNotes())).toEqual(new Set([60, 64]));
  });

  it('termina al llegar al final de la canción', () => {
    const e = new PracticeEngine(song([note(60, 0)]), playAlong);
    e.tick(10);
    expect(e.finished).toBe(true);
  });
});

describe('PracticeEngine — setSpeed en vivo', () => {
  it('cambia el ritmo sin reiniciar y con clamp', () => {
    const e = new PracticeEngine(song([note(60, 10)]),
      { waitMode: false, speed: 1, hand: 'both' });
    e.tick(1);
    expect(e.time).toBeCloseTo(1, 5);
    e.setSpeed(0.5);
    e.tick(1);
    expect(e.time).toBeCloseTo(1.5, 5); // no se reinició, y va a la mitad
    expect(e.speed).toBe(0.5);
    e.setSpeed(99);
    expect(e.speed).toBe(2);    // clamp superior
    e.setSpeed(0);
    expect(e.speed).toBe(0.05); // clamp inferior
  });
});

describe('PracticeEngine — freeMode', () => {
  it('avanza continuo, devuelve las notas que cruzan y nunca evalúa', () => {
    const e = new PracticeEngine(song([note(60, 0.5), note(62, 1.5)]),
      { waitMode: true, speed: 1, hand: 'both', freeMode: true });
    const played = e.tick(1);
    expect(played.map(n => n.midi)).toEqual([60]); // cruzó la primera
    expect(e.time).toBeCloseTo(1, 5);              // sin congelarse (waitMode inerte)
    expect(e.onKeyDown(60)).toBe('ignored');
    expect(e.attempted).toBe(false);
    expect(e.expectedNotes()).toEqual([]);
    e.tick(5);
    expect(e.finished).toBe(true);
  });
});

describe('PracticeEngine — bucle A-B', () => {
  it('en continuo: al llegar a B salta a A y las notas se repiten', () => {
    const e = new PracticeEngine(song([note(48, 1, 'left'), note(50, 3, 'left')]),
      { waitMode: false, speed: 1, hand: 'right' }); // izquierda = acompañamiento
    e.setLoop(0.5, 2);
    e.tick(1.2); // llega a 1.2: suena la nota de t=1
    expect(e.time).toBeCloseTo(1.2, 5);
    e.tick(1);   // target 2.2 >= B(2) → salta a A(0.5)
    expect(e.time).toBeCloseTo(0.5, 5);
    const again = e.tick(1); // 0.5→1.5: la nota de t=1 vuelve a sonar
    expect(again.map(n => n.midi)).toEqual([48]);
    expect(e.finished).toBe(false);
  });

  it('en espera: el salto limpia la nota pendiente y vuelve a pedir desde A', () => {
    const e = new PracticeEngine(song([note(60, 1), note(62, 3)]),
      { waitMode: true, speed: 1, hand: 'both' });
    e.setLoop(0.5, 2.5);
    e.tick(2); // se congela en el grupo de t=1
    expect(e.expectedNotes()).toEqual([60]);
    e.onKeyDown(60);
    e.tick(2); // target 3 >= B(2.5) → salta a A, pendiente limpio
    expect(e.time).toBeCloseTo(0.5, 5);
    expect(e.expectedNotes()).toEqual([]);
    e.tick(1); // vuelve a congelarse en el grupo de t=1
    expect(e.expectedNotes()).toEqual([60]); // el mismo grupo se pide otra vez
  });

  it('normaliza argumentos invertidos y fuera de rango, y clearLoop reanuda', () => {
    const e = new PracticeEngine(song([note(60, 1)]),
      { waitMode: false, speed: 1, hand: 'both' });
    e.setLoop(50, -3); // invertido y fuera de [0, duración]
    e.tick(0.2);
    // normalizado a [0, duración]: nunca sale del rango
    expect(e.time).toBeLessThanOrEqual(1.4);
    e.clearLoop();
    e.tick(10);
    expect(e.finished).toBe(true);
  });

  it('en play-along: al saltar, las notas del tramo se pueden volver a acertar', () => {
    const e = new PracticeEngine(song([note(60, 1)]),
      { waitMode: true, speed: 1, hand: 'both', playAlongMode: true });
    e.setLoop(0.5, 2);
    e.tick(1); // t=1: la nota está en ventana
    expect(e.onKeyDown(60)).toBe('correct');
    e.tick(1.2); // target 2.2 >= B → salta a A(0.5)
    e.tick(0.5); // t=1 otra vez: en ventana de nuevo
    expect(e.onKeyDown(60)).toBe('correct'); // se puede repetir el acierto
    expect(e.correct).toBe(2);
  });

  it('en espera: un tick gigante no salta el grupo dentro del bucle', () => {
    const e = new PracticeEngine(song([note(60, 0.6), note(62, 3)]),
      { waitMode: true, speed: 1, hand: 'both' });
    e.setLoop(0.5, 2);
    e.tick(5); // dt enorme (pestaña en segundo plano)
    expect(e.expectedNotes()).toEqual([60]); // el grupo se pide, no se salta
    expect(e.time).toBeCloseTo(0.6, 5);
  });

  it('freeMode con bucle también salta', () => {
    const e = new PracticeEngine(song([note(60, 1)]),
      { waitMode: true, speed: 1, hand: 'both', freeMode: true });
    e.setLoop(0, 1.2);
    e.tick(1.5); // target >= B → salta a 0
    expect(e.time).toBeCloseTo(0, 5);
    expect(e.finished).toBe(false);
  });
});
