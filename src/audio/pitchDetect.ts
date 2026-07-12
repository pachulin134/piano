/** Convierte frecuencia en Hz a número MIDI (A4=440 → 69). */
export function hzToMidi(hz: number): number {
  return Math.round(69 + 12 * Math.log2(hz / 440));
}

export interface PitchResult {
  hz: number;
  clarity: number; // 0..1 — qué tan claro es el pitch (1 = muy claro)
}

/** Nivel de señal RMS normalizado (0..1). */
export function signalLevel(samples: Float32Array): number {
  let rms = 0;
  for (let i = 0; i < samples.length; i++) rms += samples[i] * samples[i];
  return Math.sqrt(rms / samples.length);
}

/**
 * Detección monofónica por autocorrelación normalizada.
 * Funciona bien con tonos puros; el piano real se complementa con FFT.
 */
export function detectPitch(samples: Float32Array, sampleRate: number): PitchResult | null {
  const n = samples.length;
  const rms = signalLevel(samples);
  if (rms < 0.004) return null;

  const minLag = Math.floor(sampleRate / 2100);
  const maxLag = Math.floor(sampleRate / 65);
  if (maxLag >= n) return null;

  const nsdfAt = (lag: number): number => {
    let corr = 0;
    let norm = 0;
    for (let i = 0; i < n - lag; i++) {
      corr += samples[i] * samples[i + lag];
      norm += samples[i] * samples[i] + samples[i + lag] * samples[i + lag];
    }
    return norm > 0 ? (2 * corr) / norm : 0;
  };

  // Regla de MPM: los desfases pequeños siempre correlacionan alto ("hombro"
  // inicial), así que solo valen picos posteriores al primer cruce por cero
  // del NSDF. Sin esto, las notas graves (periodo largo) devuelven una
  // frecuencia altísima falsa sacada del hombro.
  let start = minLag;
  while (start < maxLag && nsdfAt(start) > 0) start++;
  if (start >= maxLag) return null;

  const peaks: { lag: number; nsdf: number }[] = [];
  for (let lag = start; lag < maxLag; lag++) {
    const nsdf = nsdfAt(lag);
    if (nsdf >= 0.42) peaks.push({ lag, nsdf });
  }

  if (peaks.length === 0) return null;

  const maxNsdf = Math.max(...peaks.map(p => p.nsdf));
  const strong = peaks.filter(p => p.nsdf >= maxNsdf * 0.9);

  // El primer pico (tramo contiguo de lags fuertes) es la fundamental; los
  // tramos posteriores son sus múltiplos. Dentro del pico nos quedamos con el
  // lag de mejor correlación: el borde izquierdo sesgaría la frecuencia hacia
  // arriba (hasta un semitono en notas graves).
  let fundamental = strong[0];
  let prevLag = strong[0].lag;
  for (let i = 1; i < strong.length; i++) {
    const p = strong[i];
    if (p.lag - prevLag > 3) break;
    if (p.nsdf > fundamental.nsdf) fundamental = p;
    prevLag = p.lag;
  }

  return { hz: sampleRate / fundamental.lag, clarity: Math.min(1, fundamental.nsdf) };
}

/** Espectro armónico (HPS) — mejor para piano con muchos armónicos. */
export function detectPitchSpectrum(
  spectrum: Float32Array,
  sampleRate: number,
  fftSize: number,
): PitchResult | null {
  const binHz = sampleRate / fftSize;
  const minBin = Math.max(1, Math.floor(65 / binHz));
  const maxBin = Math.min(spectrum.length - 1, Math.ceil(2100 / binHz));
  if (maxBin <= minBin) return null;

  const range = maxBin - minBin + 1;
  const hps = new Float32Array(range);

  const toLinear = (db: number) => (db > -90 ? 10 ** (db / 20) : 0);

  for (let i = 0; i < range; i++) {
    const bin = minBin + i;
    let sum = 0;
    let count = 0;
    for (let h = 1; h <= 5; h++) {
      const hb = Math.round(bin / h);
      if (hb >= minBin && hb <= maxBin) {
        const mag = toLinear(spectrum[hb]);
        if (mag > 0) {
          sum += mag;
          count += 1;
        }
      }
    }
    hps[i] = count > 0 ? sum / count : 0;
  }

  let peakIdx = 0;
  let peakVal = 0;
  let total = 0;
  for (let i = 0; i < range; i++) {
    total += hps[i];
    if (hps[i] > peakVal) {
      peakVal = hps[i];
      peakIdx = i;
    }
  }

  if (peakVal <= 0 || total <= 0) return null;

  const avg = total / range;
  const prominence = peakVal / avg;
  if (prominence < 1.8) return null;

  const left = peakIdx > 0 ? hps[peakIdx - 1] : 0;
  const right = peakIdx < range - 1 ? hps[peakIdx + 1] : 0;
  const denom = left - 2 * peakVal + right;
  const shift = denom !== 0 ? (left - right) / (2 * denom) : 0;
  const refinedBin = minBin + peakIdx + (Number.isFinite(shift) ? shift : 0);

  return {
    hz: refinedBin * binHz,
    clarity: Math.min(1, prominence / 12),
  };
}

/** Combina autocorrelación + espectro; prioriza espectro para piano. */
export function detectPitchCombined(
  samples: Float32Array,
  spectrum: Float32Array,
  sampleRate: number,
  fftSize: number,
): PitchResult | null {
  const ac = detectPitch(samples, sampleRate);
  const sp = detectPitchSpectrum(spectrum, sampleRate, fftSize);

  if (ac && sp) {
    const midiAc = hzToMidi(ac.hz);
    const midiSp = hzToMidi(sp.hz);
    if (Math.abs(midiAc - midiSp) <= 2) {
      return ac.clarity >= sp.clarity ? ac : sp;
    }
    // En graves la FFT no resuelve semitonos (con fftSize 8192 los bins miden
    // ~6 Hz y bajo ~165 Hz los semitonos distan menos que eso): ahí manda la
    // autocorrelación, que trabaja en el dominio del tiempo.
    return ac.hz < 165 ? ac : sp;
  }
  return sp ?? ac;
}

/** @deprecated Usa detectPitch */
export function detectPitchHz(samples: Float32Array, sampleRate: number): number | null {
  return detectPitch(samples, sampleRate)?.hz ?? null;
}

/**
 * Empareja la nota detectada con una esperada admitiendo errores de octava:
 * los detectores de tono confunden a menudo una nota con su octava (armónicos
 * del piano), así que si la clase de nota coincide (mismo nombre, p. ej. Do),
 * damos la esperada por tocada. Prefiere la coincidencia exacta.
 */
export function matchExpected(midi: number, expected: number[]): number | null {
  if (expected.includes(midi)) return midi;
  const sameClass = expected.filter(e => e % 12 === midi % 12);
  if (sameClass.length === 0) return null;
  return sameClass.reduce((a, b) => (Math.abs(b - midi) < Math.abs(a - midi) ? b : a));
}

/** ¿La nota detectada está cerca de alguna esperada? */
export function nearestExpected(midi: number, expected: number[], tolerance = 1): number | null {
  let best: number | null = null;
  let bestDist = tolerance + 1;
  for (const e of expected) {
    const d = Math.abs(e - midi);
    if (d <= tolerance && d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

export function midiToName(midi: number): string {
  const names = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12]}${octave}`;
}
