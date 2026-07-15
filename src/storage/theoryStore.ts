import { get, set } from 'idb-keyval';

export interface KV {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

const KEY = 'theory-completed-v1';

export function createTheoryStore(kv: KV = { get, set }) {
  const read = async (): Promise<string[]> => ((await kv.get(KEY)) as string[] | undefined) ?? [];
  return {
    listCompleted: read,
    async markCompleted(lessonId: string): Promise<void> {
      const done = await read();
      if (done.includes(lessonId)) return;
      await kv.set(KEY, [...done, lessonId]);
    },
  };
}

export type TheoryStore = ReturnType<typeof createTheoryStore>;
