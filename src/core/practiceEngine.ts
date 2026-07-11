import { groupNotes } from './groupNotes';
import type { Hand, NoteGroup, Song, SongNote } from './types';

export interface EngineConfig {
  waitMode: boolean;
  speed: number;          // 0.25 .. 1
  hand: Hand | 'both';    // mano que practica el usuario
}

export type KeyResult = 'correct' | 'wrong' | 'ignored';

/**
 * Motor puro de práctica. La UI llama a tick(dt) en cada frame y a
 * onKeyDown(midi) con cada tecla del usuario. En modo espera, el reloj
 * se congela en cada grupo hasta completar sus notas.
 */
export class PracticeEngine {
  time = 0;               // segundos musicales
  correct = 0;
  wrong = 0;

  private groups: NoteGroup[];          // grupos que practica el usuario
  private accompaniment: SongNote[];    // notas que reproduce la app
  private accompanimentIdx = 0;
  private groupIdx = 0;
  private pending: Set<number> | null = null;
  private readonly songDuration: number;

  constructor(song: Song, readonly config: EngineConfig) {
    const practiced = config.hand === 'both'
      ? song.notes
      : song.notes.filter(n => n.hand === config.hand);
    this.accompaniment = config.hand === 'both'
      ? []
      : song.notes.filter(n => n.hand !== config.hand);
    this.groups = groupNotes(practiced);
    this.songDuration = song.duration;
  }

  /** true si hubo al menos una pulsación evaluada (sin esto, score()=100 no significa nada). */
  get attempted(): boolean {
    return this.correct + this.wrong > 0;
  }

  get finished(): boolean {
    return this.pending === null
      && this.groupIdx >= this.groups.length
      && this.time >= this.songDuration;
  }

  /** Notas que el usuario debe pulsar ahora (vacío si no está en espera). */
  expectedNotes(): number[] {
    return this.pending ? [...this.pending] : [];
  }

  /** Avanza dt segundos reales. Devuelve las notas de acompañamiento que la app debe sonar. */
  tick(dtSeconds: number): SongNote[] {
    if (this.pending) return []; // congelado esperando al usuario

    let target = this.time + dtSeconds * this.config.speed;

    if (this.config.waitMode) {
      // En espera nos detenemos en el primer grupo sin tocar, aunque el
      // salto de tiempo (target) alcance o supere varios grupos futuros.
      const nextGroup = this.groups[this.groupIdx];
      if (nextGroup && target >= nextGroup.time) {
        target = nextGroup.time;
        // Simplificación deliberada de Fase 1: notas repetidas dentro de la
        // ventana de 50 ms del acorde colapsan en una sola pulsación requerida
        // (el Set deduplica midis iguales del mismo grupo).
        this.pending = new Set(nextGroup.notes.map(n => n.midi));
      }
    } else {
      // Modo continuo: no hay que congelarse en cada grupo, así que un
      // salto de tiempo grande puede atravesar varios grupos en un solo tick.
      while (
        this.groupIdx < this.groups.length &&
        this.groups[this.groupIdx].time <= target
      ) {
        this.groupIdx += 1;
      }
    }

    const toPlay: SongNote[] = [];
    while (
      this.accompanimentIdx < this.accompaniment.length &&
      this.accompaniment[this.accompanimentIdx].time <= target
    ) {
      toPlay.push(this.accompaniment[this.accompanimentIdx]);
      this.accompanimentIdx += 1;
    }

    this.time = Math.min(target, this.songDuration);
    return toPlay;
  }

  onKeyDown(midi: number): KeyResult {
    if (!this.pending) return 'ignored';
    if (this.pending.has(midi)) {
      this.pending.delete(midi);
      this.correct += 1;
      if (this.pending.size === 0) {
        this.pending = null;
        this.groupIdx += 1;
      }
      return 'correct';
    }
    this.wrong += 1;
    return 'wrong';
  }

  /** % de aciertos sobre pulsaciones evaluadas. 100 si aún no hay ninguna. */
  score(): number {
    const total = this.correct + this.wrong;
    return total === 0 ? 100 : Math.round((this.correct / total) * 100);
  }
}
