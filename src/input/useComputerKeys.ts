import { useEffect } from 'react';
import type { KeyHandler } from './useMidiInput';

const KEY_TO_MIDI: Record<string, number> = {
  a: 60, s: 62, d: 64, f: 65, g: 67, h: 69, j: 71, k: 72, l: 74,
  w: 61, e: 63, t: 66, y: 68, u: 70, o: 73, p: 75,
};

export function useComputerKeys(onKey: KeyHandler): void {
  useEffect(() => {
    const held = new Set<string>();
    const down = (e: KeyboardEvent) => {
      const midi = KEY_TO_MIDI[e.key.toLowerCase()];
      if (midi === undefined || held.has(e.key) || e.repeat) return;
      held.add(e.key);
      onKey(midi, true);
    };
    const up = (e: KeyboardEvent) => {
      const midi = KEY_TO_MIDI[e.key.toLowerCase()];
      if (midi === undefined) return;
      held.delete(e.key);
      onKey(midi, false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [onKey]);
}
