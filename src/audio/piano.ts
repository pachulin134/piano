import { SplendidGrandPiano } from 'smplr';

let context: AudioContext | undefined;
let piano: SplendidGrandPiano | undefined;
let loading: Promise<void> | undefined;
let pendingVolume: number | undefined;

/** Debe llamarse desde un gesto del usuario (los navegadores bloquean el audio si no). */
export function initPiano(): Promise<void> {
  if (!loading) {
    context = new AudioContext();
    piano = new SplendidGrandPiano(context);
    if (pendingVolume !== undefined) piano.output.setVolume(pendingVolume);
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

/** Click de metrónomo sintetizado con un oscilador del mismo AudioContext (sin muestras nuevas). */
export function playClick(accent = false): void {
  if (!context) return;
  const t0 = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.frequency.value = accent ? 1400 : 1000;
  gain.gain.setValueAtTime(0.5, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(t0);
  osc.stop(t0 + 0.07);
}

/**
 * Volumen del piano (0..100). smplr expone `output.setVolume` en escala 0..127
 * (curva tipo velocity MIDI: gain = (vol/127)^2 — ver node_modules/smplr/dist/index.js,
 * `midiVelToGain`). Si el piano aún no existe, se recuerda el valor y se aplica en
 * initPiano() en cuanto se crea el sampler.
 */
export function setVolume(pct: number): void {
  const clamped = Math.max(0, Math.min(100, pct));
  const vol = Math.round(clamped * 1.27);
  pendingVolume = vol;
  piano?.output.setVolume(vol);
}
