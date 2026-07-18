import { describe, it, expect } from 'vitest';
import { computeStreak } from './streak';

// Fecha ancla fija para no depender del reloj real; UTC para evitar líos de huso horario.
const TODAY = '2026-07-18';
const YESTERDAY = '2026-07-17';
const DAY_BEFORE = '2026-07-16';

describe('computeStreak', () => {
  it('lista vacía → 0', () => {
    expect(computeStreak([], TODAY)).toBe(0);
  });

  it('solo hoy → 1', () => {
    expect(computeStreak([TODAY], TODAY)).toBe(1);
  });

  it('solo ayer → 1 (racha viva)', () => {
    expect(computeStreak([YESTERDAY], TODAY)).toBe(1);
  });

  it('solo hace 2 días (sin hoy ni ayer) → 0 (racha muerta)', () => {
    expect(computeStreak(['2026-07-15'], TODAY)).toBe(0);
  });

  it('hoy, ayer, antier consecutivos → 3', () => {
    expect(computeStreak([TODAY, YESTERDAY, DAY_BEFORE], TODAY)).toBe(3);
  });

  it('duplicados no inflan la racha', () => {
    expect(computeStreak([TODAY, TODAY, YESTERDAY, YESTERDAY], TODAY)).toBe(2);
  });

  it('desorden no afecta el cálculo', () => {
    expect(computeStreak([DAY_BEFORE, TODAY, YESTERDAY], TODAY)).toBe(3);
  });

  it('un hueco corta la racha', () => {
    // hoy y ayer están, pero antier falta y hace 3 días sí está: la racha viva es solo 2
    expect(computeStreak([TODAY, YESTERDAY, '2026-07-14'], TODAY)).toBe(2);
  });

  it('cruza el límite de mes correctamente (racha viva por ayer 31 jul, sin registrar hoy 1 ago)', () => {
    // today = 2026-08-01 no está en la lista; la racha viva sigue por "ayer" (31, 30, 29 de julio)
    expect(computeStreak(['2026-07-31', '2026-07-30', '2026-07-29'], '2026-08-01')).toBe(3);
  });

  it('cruza límite de mes con hueco (falta el 31 de julio, ayer inmediato) → 0', () => {
    expect(computeStreak(['2026-07-30'], '2026-08-01')).toBe(0);
  });
});
