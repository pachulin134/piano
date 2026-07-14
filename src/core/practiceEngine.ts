import { groupNotes } from './groupNotes';
import type { Hand, NoteGroup, Song, SongNote } from './types';

export interface EngineConfig {
  waitMode: boolean;
  speed: number;          // 0.25 .. 1
  hand: Hand | 'both';    // mano que practica el usuario
  listenMode?: boolean;   // la app toca la canción sola (sin interacción)
  guidedMode?: boolean;   // demo de cada grupo y luego el usuario lo repite
  playAlongMode?: boolean; // el usuario toca a ritmo; la app evalúa por MIDI en tiempo real
  freeMode?: boolean;     // la canción avanza sola; el usuario toca sin evaluación
}

const PLAY_ALONG_BEFORE = 0.2;  // segundos musicales de anticipación permitida
const PLAY_ALONG_AFTER = 0.35;  // segundos musicales de retardo permitido

export type KeyResult = 'correct' | 'wrong' | 'ignored';
export type GuidedPhase = 'demo' | 'repeat';

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
  private practiced: SongNote[];        // notas que suena la app en modo escuchar
  private accompaniment: SongNote[];    // notas que reproduce la app
  private accompanimentIdx = 0;
  private practicedIdx = 0;
  private groupIdx = 0;
  private pending: Set<number> | null = null;
  private guidedStep: GuidedPhase | null = null;
  private demoLeft = 0;                 // segundos reales restantes de la demo
  private targets: SongNote[] = [];      // notas que evalúa el modo play-along
  private hitKeys = new Set<string>();
  private readonly songDuration: number;
  private _speed: number;
  private loop: { start: number; end: number } | null = null;

  constructor(song: Song, readonly config: EngineConfig) {
    this._speed = config.speed;
    if (config.listenMode || config.freeMode) {
      this.practiced = [...song.notes];
      this.accompaniment = [];
      this.groups = [];
    } else {
      const handNotes = config.hand === 'both'
        ? song.notes
        : song.notes.filter(n => n.hand === config.hand);
      this.practiced = [];
      this.accompaniment = config.hand === 'both'
        ? []
        : song.notes.filter(n => n.hand !== config.hand);
      this.groups = groupNotes(handNotes);
      if (config.playAlongMode) this.targets = [...handNotes];
    }
    this.songDuration = song.duration;
  }

  /** true si hubo al menos una pulsación evaluada (sin esto, score()=100 no significa nada). */
  get attempted(): boolean {
    return this.correct + this.wrong > 0;
  }

  get finished(): boolean {
    if (this.loop) return false;
    if (this.config.listenMode) {
      return this.time >= this.songDuration
        && this.practicedIdx >= this.practiced.length;
    }
    if (this.config.guidedMode) {
      return this.groupIdx >= this.groups.length
        && this.pending === null
        && this.guidedStep === null;
    }
    if (this.config.playAlongMode) {
      return this.time >= this.songDuration;
    }
    return this.pending === null
      && this.groupIdx >= this.groups.length
      && this.time >= this.songDuration;
  }

  /** Fase actual del modo guiado (demo / tu turno). */
  get guidedPhase(): GuidedPhase | null {
    if (!this.config.guidedMode) return null;
    if (this.guidedStep === 'demo') return 'demo';
    if (this.pending) return 'repeat';
    return null;
  }

  /** Notas que el usuario debe pulsar ahora (vacío si no está en espera). */
  expectedNotes(): number[] {
    if (this.config.playAlongMode) {
      return [...new Set(this.expectedInWindow().map(n => n.midi))];
    }
    return this.pending ? [...this.pending] : [];
  }

  /** Avanza dt segundos reales. Devuelve las notas que la app debe sonar. */
  tick(dtSeconds: number): SongNote[] {
    if (this.config.listenMode || this.config.freeMode) {
      const raw = this.time + dtSeconds * this._speed;
      if (this.loop && raw >= this.loop.end) {
        const toPlay = this.collectPracticed(this.loop.end);
        this.seekTo(this.loop.start);
        return toPlay;
      }
      const target = Math.min(raw, this.songDuration);
      const toPlay = this.collectPracticed(target);
      this.time = target;
      return toPlay;
    }

    if (this.config.guidedMode) {
      if (this.pending) return [];

      if (this.guidedStep === 'demo') {
        this.demoLeft -= dtSeconds;
        if (this.demoLeft <= 0) {
          const group = this.groups[this.groupIdx];
          this.pending = new Set(group.notes.map(n => n.midi));
          this.guidedStep = 'repeat';
        }
        return [];
      }

      if (this.groupIdx >= this.groups.length) {
        this.time = this.songDuration;
        return [];
      }

      return this.beginGuidedGroup();
    }

    if (this.config.playAlongMode) {
      const raw = this.time + dtSeconds * this._speed;
      if (this.loop && raw >= this.loop.end) {
        const toPlay = this.collectAccompaniment(this.loop.end);
        this.seekTo(this.loop.start);
        return toPlay;
      }
      const target = Math.min(raw, this.songDuration);
      const toPlay = this.collectAccompaniment(target);
      this.time = target;
      return toPlay;
    }

    if (this.pending) return []; // congelado esperando al usuario

    let target = this.time + dtSeconds * this._speed;

    if (this.loop && target >= this.loop.end) {
      const toPlay = this.collectAccompaniment(this.loop.end);
      this.seekTo(this.loop.start);
      return toPlay;
    }

    if (this.config.waitMode) {
      const nextGroup = this.groups[this.groupIdx];
      if (nextGroup && target >= nextGroup.time) {
        target = nextGroup.time;
        this.pending = new Set(nextGroup.notes.map(n => n.midi));
      }
    } else {
      while (
        this.groupIdx < this.groups.length &&
        this.groups[this.groupIdx].time <= target
      ) {
        this.groupIdx += 1;
      }
    }

    const toPlay = this.collectAccompaniment(target);

    this.time = Math.min(target, this.songDuration);
    return toPlay;
  }

  private collectPracticed(upTo: number): SongNote[] {
    const toPlay: SongNote[] = [];
    while (
      this.practicedIdx < this.practiced.length &&
      this.practiced[this.practicedIdx].time <= upTo
    ) {
      toPlay.push(this.practiced[this.practicedIdx]);
      this.practicedIdx += 1;
    }
    return toPlay;
  }

  private collectAccompaniment(upTo: number): SongNote[] {
    const toPlay: SongNote[] = [];
    while (
      this.accompanimentIdx < this.accompaniment.length &&
      this.accompaniment[this.accompanimentIdx].time <= upTo
    ) {
      toPlay.push(this.accompaniment[this.accompanimentIdx]);
      this.accompanimentIdx += 1;
    }
    return toPlay;
  }

  onKeyDown(midi: number): KeyResult {
    if (this.config.listenMode || this.config.freeMode) return 'ignored';
    if (this.config.guidedMode && this.guidedStep === 'demo') return 'ignored';

    if (this.config.playAlongMode) {
      const due = this.expectedInWindow();
      const match = due.find(n => n.midi === midi);
      if (match) {
        this.hitKeys.add(this.noteKey(match));
        this.correct += 1;
        return 'correct';
      }
      if (due.length > 0) {
        this.wrong += 1;
        return 'wrong';
      }
      return 'ignored';
    }

    if (!this.pending) return 'ignored';
    if (this.pending.has(midi)) {
      this.pending.delete(midi);
      this.correct += 1;
      if (this.pending.size === 0) {
        this.pending = null;
        if (this.config.guidedMode) this.guidedStep = null;
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

  /** Velocidad actual (0.05–2). */
  get speed(): number {
    return this._speed;
  }

  /** Cambia el ritmo en vivo, sin reiniciar la canción. */
  setSpeed(v: number): void {
    this._speed = Math.min(2, Math.max(0.05, v));
  }

  /** Activa el bucle A-B (normaliza: intercambia si vienen invertidos y recorta a [0, duración]). */
  setLoop(startSec: number, endSec: number): void {
    let a = Math.min(startSec, endSec);
    let b = Math.max(startSec, endSec);
    a = Math.max(0, Math.min(a, this.songDuration));
    b = Math.max(0, Math.min(b, this.songDuration));
    if (b - a < 0.5) return; // tramo degenerado: se ignora
    this.loop = { start: a, end: b };
  }

  clearLoop(): void {
    this.loop = null;
  }

  /** Recoloca el reloj y todos los índices internos en el instante t. */
  private seekTo(t: number): void {
    this.time = t;
    this.pending = null;
    this.groupIdx = this.groups.findIndex(g => g.time >= t);
    if (this.groupIdx === -1) this.groupIdx = this.groups.length;
    this.accompanimentIdx = this.accompaniment.findIndex(n => n.time >= t);
    if (this.accompanimentIdx === -1) this.accompanimentIdx = this.accompaniment.length;
    this.practicedIdx = this.practiced.findIndex(n => n.time >= t);
    if (this.practicedIdx === -1) this.practicedIdx = this.practiced.length;
    // Las dianas del play-along del tramo vuelven a estar disponibles
    this.hitKeys = new Set([...this.hitKeys].filter(k => Number(k.split('-')[1]) < t));
  }

  private beginGuidedGroup(): SongNote[] {
    const group = this.groups[this.groupIdx];
    this.time = group.time;

    const toPlay: SongNote[] = [];
    while (
      this.accompanimentIdx < this.accompaniment.length &&
      this.accompaniment[this.accompanimentIdx].time <= group.time
    ) {
      toPlay.push(this.accompaniment[this.accompanimentIdx]);
      this.accompanimentIdx += 1;
    }
    toPlay.push(...group.notes);

    const longest = Math.max(...group.notes.map(n => n.duration), 0.35);
    this.demoLeft = longest / this._speed;
    this.guidedStep = 'demo';
    return toPlay;
  }

  private noteKey(n: SongNote): string {
    return `${n.midi}-${n.time}`;
  }

  private expectedInWindow(): SongNote[] {
    return this.targets.filter(n =>
      !this.hitKeys.has(this.noteKey(n))
      && n.time >= this.time - PLAY_ALONG_BEFORE
      && n.time <= this.time + PLAY_ALONG_AFTER,
    );
  }
}
