import { describe, it, expect } from 'vitest';
import { LEVELS } from './content';

describe('content', () => {
  it('hay 3 niveles con lecciones', () => {
    expect(LEVELS).toHaveLength(3);
    for (const lv of LEVELS) expect(lv.lessons.length).toBeGreaterThanOrEqual(3);
  });
  it('ids de lección únicos', () => {
    const ids = LEVELS.flatMap(l => l.lessons.map(ls => ls.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('todas las teclas están en 48..83; play exige teclas; choose válido', () => {
    for (const lv of LEVELS) for (const ls of lv.lessons) for (const st of ls.steps) {
      if (st.kind === 'teach' || st.kind === 'play') {
        if (st.kind === 'play') expect(st.keys.length).toBeGreaterThan(0); // teach puede ser conceptual (0 teclas)
        for (const k of st.keys) { expect(k).toBeGreaterThanOrEqual(48); expect(k).toBeLessThanOrEqual(83); }
      } else {
        expect(st.options.length).toBeGreaterThanOrEqual(2);
        expect(st.answer).toBeGreaterThanOrEqual(0);
        expect(st.answer).toBeLessThan(st.options.length);
      }
    }
  });
  it('cada lección tiene al menos un paso', () => {
    for (const lv of LEVELS) for (const ls of lv.lessons) expect(ls.steps.length).toBeGreaterThan(0);
  });
});
