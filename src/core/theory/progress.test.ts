import { describe, it, expect } from 'vitest';
import { isLessonUnlocked, isLevelUnlocked, levelProgress } from './progress';
import type { Level } from './types';

const levels: Level[] = [
  { id: 'n1', index: 1, title: 'N1', subtitle: '', lessons: [
    { id: 'n1l1', title: 'a', steps: [] },
    { id: 'n1l2', title: 'b', steps: [] },
  ]},
  { id: 'n2', index: 2, title: 'N2', subtitle: '', lessons: [
    { id: 'n2l1', title: 'c', steps: [] },
  ]},
];

describe('progress', () => {
  it('la primera lección siempre está desbloqueada', () => {
    expect(isLessonUnlocked(levels, new Set(), 'n1', 'n1l1')).toBe(true);
  });
  it('la segunda lección se desbloquea al completar la primera', () => {
    expect(isLessonUnlocked(levels, new Set(), 'n1', 'n1l2')).toBe(false);
    expect(isLessonUnlocked(levels, new Set(['n1l1']), 'n1', 'n1l2')).toBe(true);
  });
  it('el nivel 2 se desbloquea al completar todas las lecciones del nivel 1', () => {
    expect(isLevelUnlocked(levels, new Set(['n1l1']), 'n2')).toBe(false);
    expect(isLevelUnlocked(levels, new Set(['n1l1', 'n1l2']), 'n2')).toBe(true);
  });
  it('la primera lección del nivel 2 se desbloquea con el nivel 1 completo', () => {
    expect(isLessonUnlocked(levels, new Set(['n1l1', 'n1l2']), 'n2', 'n2l1')).toBe(true);
  });
  it('levelProgress cuenta completadas del nivel', () => {
    expect(levelProgress(levels[0], new Set(['n1l1']))).toEqual({ done: 1, total: 2 });
  });
  it('ignora ids completados inexistentes', () => {
    expect(isLevelUnlocked(levels, new Set(['fantasma']), 'n2')).toBe(false);
  });
});
