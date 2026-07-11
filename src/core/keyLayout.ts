import type { SongNote } from './types';

export interface KeyRect {
  midi: number;
  x: number;
  w: number;
  h: number;
  black: boolean;
}

const BLACK_CLASSES = new Set([1, 3, 6, 8, 10]);

export function isBlack(midi: number): boolean {
  return BLACK_CLASSES.has(midi % 12);
}

/**
 * Geometría de teclas para el rango [loMidi, hiMidi] en un área width×height.
 * Compartida por el teclado SVG y el canvas de notas para que estén alineados.
 */
export function keyLayout(loMidi: number, hiMidi: number, width: number, height: number): KeyRect[] {
  const whites: number[] = [];
  for (let m = loMidi; m <= hiMidi; m++) if (!isBlack(m)) whites.push(m);
  const whiteW = width / whites.length;
  const blackW = whiteW * 0.6;
  const blackH = height * 0.62;

  const keys: KeyRect[] = [];
  let whiteIdx = 0;
  for (let m = loMidi; m <= hiMidi; m++) {
    if (isBlack(m)) {
      keys.push({ midi: m, x: whiteIdx * whiteW - blackW / 2, w: blackW, h: blackH, black: true });
    } else {
      keys.push({ midi: m, x: whiteIdx * whiteW, w: whiteW, h: height, black: false });
      whiteIdx += 1;
    }
  }
  return keys;
}

/** Rango de teclado ajustado a la canción: octavas completas, mínimo 2, dentro de 21..108. */
export function fitRange(notes: SongNote[]): [number, number] {
  const min = notes.reduce((m, n) => Math.min(m, n.midi), 108);
  const max = notes.reduce((m, n) => Math.max(m, n.midi), 21);
  let lo = Math.floor(min / 12) * 12;
  let hi = Math.floor(max / 12) * 12 + 11;
  while (hi - lo < 23) { // mínimo 2 octavas
    if (lo > 21) lo -= 12; else hi += 12;
  }
  return [Math.max(21, lo), Math.min(108, hi)];
}
