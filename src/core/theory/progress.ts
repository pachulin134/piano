import type { Level } from './types';

/** Lista plana [levelId, lessonId] en orden de recorrido. */
function order(levels: Level[]): { levelId: string; lessonId: string }[] {
  return levels.flatMap(lv => lv.lessons.map(ls => ({ levelId: lv.id, lessonId: ls.id })));
}

export function isLessonUnlocked(levels: Level[], completed: Set<string>, levelId: string, lessonId: string): boolean {
  const flat = order(levels);
  const idx = flat.findIndex(x => x.levelId === levelId && x.lessonId === lessonId);
  if (idx <= 0) return idx === 0; // la primera siempre; -1 (no existe) → false
  return completed.has(flat[idx - 1].lessonId);
}

export function isLevelUnlocked(levels: Level[], completed: Set<string>, levelId: string): boolean {
  const i = levels.findIndex(l => l.id === levelId);
  if (i <= 0) return i === 0;
  return levels[i - 1].lessons.every(ls => completed.has(ls.id));
}

export function levelProgress(level: Level, completed: Set<string>): { done: number; total: number } {
  return {
    done: level.lessons.filter(ls => completed.has(ls.id)).length,
    total: level.lessons.length,
  };
}
