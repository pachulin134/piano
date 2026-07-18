import { describe, it, expect } from 'vitest';
import { createPrefsStore, type KV } from './prefsStore';
import type { SessionConfig } from '../core/sessionModes';

function memoryKV(): KV {
  const m = new Map<string, unknown>();
  return { get: async k => m.get(k), set: async (k, v) => { m.set(k, v); } };
}

const cfg = (speed: number): SessionConfig =>
  ({ door: 'learn', input: 'screen', level: 'easy', speed, hand: 'both', waitMode: true });

describe('prefsStore', () => {
  it('guarda y recupera la config por canción', async () => {
    const s = createPrefsStore(memoryKV());
    expect(await s.getSongPrefs('a')).toBe(null);
    await s.saveSongPrefs('a', cfg(0.6));
    await s.saveSongPrefs('b', cfg(1));
    expect((await s.getSongPrefs('a'))?.speed).toBe(0.6);
    expect((await s.getSongPrefs('b'))?.speed).toBe(1);
  });
  it('guarda y recupera la última sesión', async () => {
    const s = createPrefsStore(memoryKV());
    expect(await s.getLastSession()).toBe(null);
    await s.saveLastSession('a', cfg(0.75));
    const last = await s.getLastSession();
    expect(last?.songId).toBe('a');
    expect(last?.config.speed).toBe(0.75);
  });

  it('registra días de práctica', async () => {
    const s = createPrefsStore(memoryKV());
    expect(await s.listPracticeDays()).toEqual([]);
    await s.recordPracticeDay('2026-07-17');
    await s.recordPracticeDay('2026-07-18');
    expect(await s.listPracticeDays()).toEqual(['2026-07-17', '2026-07-18']);
  });

  it('deduplica días repetidos', async () => {
    const s = createPrefsStore(memoryKV());
    await s.recordPracticeDay('2026-07-18');
    await s.recordPracticeDay('2026-07-18');
    await s.recordPracticeDay('2026-07-18');
    expect(await s.listPracticeDays()).toEqual(['2026-07-18']);
  });

  it('recorta a los 60 días más recientes', async () => {
    const s = createPrefsStore(memoryKV());
    for (let i = 1; i <= 65; i++) {
      await s.recordPracticeDay(`2026-01-${String(i).padStart(3, '0')}`);
    }
    const days = await s.listPracticeDays();
    expect(days).toHaveLength(60);
    // se conservan los 60 últimos añadidos, en orden (los 5 primeros se descartan)
    expect(days[0]).toBe('2026-01-006');
    expect(days[59]).toBe('2026-01-065');
  });
});
