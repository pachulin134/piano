import { describe, it, expect } from 'vitest';
import { isBlack, keyLayout, fitRange } from './keyLayout';
import type { SongNote } from './types';

describe('keyLayout', () => {
  it('una octava C4..B4 tiene 7 blancas y 5 negras', () => {
    const keys = keyLayout(60, 71, 700, 100);
    expect(keys.filter(k => !k.black)).toHaveLength(7);
    expect(keys.filter(k => k.black)).toHaveLength(5);
  });

  it('las blancas reparten el ancho completo', () => {
    const keys = keyLayout(60, 71, 700, 100);
    const whites = keys.filter(k => !k.black);
    expect(whites[0].x).toBe(0);
    expect(whites[6].x + whites[6].w).toBeCloseTo(700, 5);
    for (const w of whites) expect(w.w).toBeCloseTo(100, 5);
  });

  it('las negras son más cortas y quedan entre blancas', () => {
    const keys = keyLayout(60, 71, 700, 100);
    const cSharp = keys.find(k => k.midi === 61)!;
    expect(cSharp.black).toBe(true);
    expect(cSharp.h).toBeLessThan(100);
    expect(cSharp.x).toBeGreaterThan(0);
    expect(cSharp.x + cSharp.w).toBeLessThan(200);
  });

  it('isBlack acierta con las 12 clases', () => {
    expect([60, 62, 64, 65, 67, 69, 71].some(isBlack)).toBe(false);
    expect([61, 63, 66, 68, 70].every(isBlack)).toBe(true);
  });
});

describe('fitRange', () => {
  const n = (midi: number): SongNote => ({ midi, time: 0, duration: 1, hand: 'right' });

  it('expande a octavas completas y respeta los límites del piano', () => {
    const [lo, hi] = fitRange([n(62), n(75)]);
    expect(lo).toBe(60);  // C4
    expect(hi).toBe(83);  // B5
    expect(lo).toBeGreaterThanOrEqual(21);
    expect(hi).toBeLessThanOrEqual(108);
  });

  it('garantiza un mínimo de dos octavas', () => {
    const [lo, hi] = fitRange([n(60)]);
    expect(hi - lo).toBeGreaterThanOrEqual(23);
  });
});
