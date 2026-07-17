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
});
