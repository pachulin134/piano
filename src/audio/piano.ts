import { SplendidGrandPiano } from 'smplr';

let context: AudioContext | undefined;
let piano: SplendidGrandPiano | undefined;
let loading: Promise<void> | undefined;

/** Debe llamarse desde un gesto del usuario (los navegadores bloquean el audio si no). */
export function initPiano(): Promise<void> {
  if (!loading) {
    context = new AudioContext();
    piano = new SplendidGrandPiano(context);
    loading = piano.load.then(() => undefined).catch(err => {
      loading = undefined;
      throw err;
    });
  }
  context?.resume();
  return loading;
}

export function playNote(midi: number, durationSeconds = 1): void {
  piano?.start({ note: midi, velocity: 85, duration: durationSeconds });
}
