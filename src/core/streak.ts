const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD → medianoche UTC en milisegundos (evita líos de huso horario). */
function toUtcMs(date: string): number {
  return new Date(`${date}T00:00:00Z`).getTime();
}

function toDateString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Días consecutivos de práctica terminando hoy o ayer (racha viva). Fechas YYYY-MM-DD. */
export function computeStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  const todayMs = toUtcMs(today);

  let cursorMs: number;
  if (set.has(today)) {
    cursorMs = todayMs;
  } else if (set.has(toDateString(todayMs - DAY_MS))) {
    cursorMs = todayMs - DAY_MS;
  } else {
    return 0;
  }

  let count = 0;
  while (set.has(toDateString(cursorMs))) {
    count++;
    cursorMs -= DAY_MS;
  }
  return count;
}
