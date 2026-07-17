import { get, set } from 'idb-keyval';
import type { SessionConfig } from '../core/sessionModes';

export interface KV {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

const PREFS_KEY = 'prefs-v1';
const LAST_KEY = 'last-session-v1';

export function createPrefsStore(kv: KV = { get, set }) {
  const readAll = async (): Promise<Record<string, SessionConfig>> =>
    ((await kv.get(PREFS_KEY)) as Record<string, SessionConfig> | undefined) ?? {};
  return {
    async getSongPrefs(songId: string): Promise<SessionConfig | null> {
      return (await readAll())[songId] ?? null;
    },
    async saveSongPrefs(songId: string, config: SessionConfig): Promise<void> {
      const all = await readAll();
      await kv.set(PREFS_KEY, { ...all, [songId]: config });
    },
    async getLastSession(): Promise<{ songId: string; config: SessionConfig } | null> {
      return ((await kv.get(LAST_KEY)) as { songId: string; config: SessionConfig } | undefined) ?? null;
    },
    async saveLastSession(songId: string, config: SessionConfig): Promise<void> {
      await kv.set(LAST_KEY, { songId, config });
    },
  };
}

export type PrefsStore = ReturnType<typeof createPrefsStore>;
