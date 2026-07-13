import type { EngineConfig } from './practiceEngine';
import type { Level } from './simplifySong';

/** Las "tres puertas" que ve el usuario. */
export type Door = 'listen' | 'learn' | 'play';
/** Cómo escucha la app al usuario. */
export type InputKind = 'midi' | 'mic' | 'screen';

export interface SessionConfig {
  door: Door;
  input: InputKind;
  level: Level;
  speed: number;
  hand: EngineConfig['hand'];
  /** Solo relevante en aprender sin micrófono; por defecto true. */
  waitMode: boolean;
}

export const DOOR_LABELS: Record<Door, { icon: string; title: string; hint: string }> = {
  listen: { icon: '🎧', title: 'Escuchar', hint: 'Mira y escucha cómo suena' },
  learn: { icon: '🪜', title: 'Aprender paso a paso', hint: 'Nota a nota, a tu ritmo' },
  play: { icon: '🎹', title: 'Tocar con la canción', hint: 'A ritmo real, como un concierto' },
};

export const INPUT_LABELS: Record<InputKind, string> = {
  midi: 'cable MIDI (tu piano)',
  mic: 'micrófono',
  screen: 'pantalla o teclas A–L',
};

/** Traduce la elección del usuario a los flags que ya entiende PracticeEngine. */
export function resolveEngineMode(cfg: SessionConfig): { engine: EngineConfig; micMode: boolean } {
  const micMode = cfg.door === 'learn' && cfg.input === 'mic';
  const engine: EngineConfig = {
    speed: cfg.speed,
    hand: cfg.hand,
    // inerte fuera de aprender: el motor comprueba listen/guided/playAlong antes que waitMode
    waitMode: cfg.door === 'learn' && !micMode ? cfg.waitMode : true,
    listenMode: cfg.door === 'listen',
    guidedMode: micMode,
    playAlongMode: cfg.door === 'play',
  };
  return { engine, micMode };
}

/** Entrada por defecto: cable si está; si no, micrófono para aprender y pantalla para el resto. */
export function pickDefaultInput(hasMidi: boolean, door: Door): InputKind {
  if (hasMidi) return 'midi';
  return door === 'learn' ? 'mic' : 'screen';
}
