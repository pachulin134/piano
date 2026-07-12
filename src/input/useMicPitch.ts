import { useEffect, useRef, useState } from 'react';
import {
  detectPitchCombined,
  hzToMidi,
  signalLevel,
} from '../audio/pitchDetect';

export type MicStatus = 'idle' | 'active' | 'denied' | 'unsupported' | 'quiet' | 'hearing';

export interface MicState {
  status: MicStatus;
  /** Última nota detectada (aunque aún no sea estable). */
  heardMidi: number | null;
  /** 0..100 — nivel de señal del micrófono. */
  signalPct: number;
}

interface Options {
  active: boolean;
  listening: boolean;
  onNote: (midi: number) => void;
}

const STABLE_FRAMES = 4;
const COOLDOWN_MS = 350;
const MIN_CLARITY = 0.35;
const PIANO_LO = 21;
const PIANO_HI = 108;
const FFT_SIZE = 8192;

function dominantMidi(recent: number[]): number | null {
  if (recent.length < STABLE_FRAMES) return null;
  const counts = new Map<number, number>();
  for (const m of recent) counts.set(m, (counts.get(m) ?? 0) + 1);
  let best = 0;
  let midi: number | null = null;
  for (const [m, c] of counts) {
    if (c > best) { best = c; midi = m; }
  }
  return best >= STABLE_FRAMES - 1 ? midi : null;
}

const IDLE: MicState = { status: 'idle', heardMidi: null, signalPct: 0 };

export function useMicPitch({ active, listening, onNote }: Options): MicState {
  const [state, setState] = useState<MicState>(IDLE);
  const onNoteRef = useRef(onNote);
  const listeningRef = useRef(listening);
  onNoteRef.current = onNote;
  listeningRef.current = listening;

  useEffect(() => {
    if (!active) {
      setState(IDLE);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState({ status: 'unsupported', heardMidi: null, signalPct: 0 });
      return;
    }

    let cancelled = false;
    let ctx: AudioContext | undefined;
    let stream: MediaStream | undefined;
    let raf = 0;
    const timeBuf = new Float32Array(FFT_SIZE);
    const freqBuf = new Float32Array(FFT_SIZE / 2);
    const recent: number[] = [];
    let lastFire = 0;
    let noPitchFrames = 0;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: true,
          },
        });
        if (cancelled) return;
        ctx = new AudioContext();
        await ctx.resume();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0.4;
        ctx.createMediaStreamSource(stream).connect(analyser);
        setState({ status: 'quiet', heardMidi: null, signalPct: 0 });

        const loop = () => {
          if (cancelled) return;
          analyser.getFloatTimeDomainData(timeBuf);
          analyser.getFloatFrequencyData(freqBuf);
          const rms = signalLevel(timeBuf);
          const signalPct = Math.min(100, Math.round(rms * 800));

          const result = detectPitchCombined(timeBuf, freqBuf, ctx!.sampleRate, FFT_SIZE);
          if (result && result.clarity >= MIN_CLARITY) {
            const midi = hzToMidi(result.hz);
            if (midi >= PIANO_LO && midi <= PIANO_HI) {
              noPitchFrames = 0;
              recent.push(midi);
              if (recent.length > 10) recent.shift();
              const stable = dominantMidi(recent);
              const now = performance.now();
              if (stable !== null && now - lastFire > COOLDOWN_MS && listeningRef.current) {
                lastFire = now;
                recent.length = 0;
                onNoteRef.current(stable);
              }
              setState({ status: 'active', heardMidi: midi, signalPct });
            } else {
              setState({ status: 'hearing', heardMidi: null, signalPct });
            }
          } else if (rms >= 0.004) {
            noPitchFrames += 1;
            if (noPitchFrames > 8) recent.length = 0;
            setState({ status: 'hearing', heardMidi: null, signalPct });
          } else {
            noPitchFrames += 1;
            if (noPitchFrames > 12) recent.length = 0;
            setState({ status: 'quiet', heardMidi: null, signalPct });
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        if (!cancelled) setState({ status: 'denied', heardMidi: null, signalPct: 0 });
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach(t => t.stop());
      void ctx?.close();
    };
  }, [active]);

  return state;
}
