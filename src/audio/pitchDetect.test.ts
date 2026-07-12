import { describe, it, expect } from 'vitest';
import {
  detectPitch,
  detectPitchCombined,
  detectPitchSpectrum,
  hzToMidi,
  matchExpected,
  nearestExpected,
} from '../audio/pitchDetect';

function sineWave(freq: number, sampleRate: number, length: number): Float32Array {
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buf[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return buf;
}

function pianoLike(freq: number, sampleRate: number, length: number): Float32Array {
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    buf[i] =
      0.55 * Math.sin(2 * Math.PI * freq * t) +
      0.28 * Math.sin(2 * Math.PI * freq * 2 * t) +
      0.12 * Math.sin(2 * Math.PI * freq * 3 * t);
  }
  return buf;
}

function spectrumFromWave(freq: number, sampleRate: number, fftSize: number): Float32Array {
  const spectrum = new Float32Array(fftSize / 2).fill(-120);
  const binHz = sampleRate / fftSize;
  for (let bin = 1; bin < spectrum.length; bin++) {
    const hz = bin * binHz;
    let energy = 0;
    for (let h = 1; h <= 4; h++) {
      if (Math.abs(hz - h * freq) < binHz * 1.5) energy += 1 / h;
    }
    if (energy > 0) spectrum[bin] = 20 * Math.log10(energy * 0.08);
  }
  return spectrum;
}

describe('pitchDetect', () => {
  it('convierte 440 Hz a La4 (midi 69)', () => {
    expect(hzToMidi(440)).toBe(69);
  });

  it('convierte 261.63 Hz a Do4 (midi 60)', () => {
    expect(hzToMidi(261.63)).toBe(60);
  });

  it('detecta un tono puro sintético', () => {
    const sr = 44100;
    const buf = sineWave(440, sr, 8192);
    const result = detectPitch(buf, sr);
    expect(result).not.toBeNull();
    expect(hzToMidi(result!.hz)).toBeGreaterThanOrEqual(68);
    expect(hzToMidi(result!.hz)).toBeLessThanOrEqual(70);
    expect(result!.clarity).toBeGreaterThan(0.4);
  });

  it('detecta un tono con armónicos (como piano)', () => {
    const sr = 44100;
    const buf = pianoLike(261.63, sr, 8192);
    const result = detectPitch(buf, sr);
    expect(result).not.toBeNull();
    expect(hzToMidi(result!.hz)).toBeGreaterThanOrEqual(59);
    expect(hzToMidi(result!.hz)).toBeLessThanOrEqual(61);
  });

  it('detecta Do4 por espectro armónico', () => {
    const sr = 44100;
    const fftSize = 8192;
    const spectrum = spectrumFromWave(261.63, sr, fftSize);
    const result = detectPitchSpectrum(spectrum, sr, fftSize);
    expect(result).not.toBeNull();
    expect(hzToMidi(result!.hz)).toBe(60);
  });

  it('combina métodos para piano', () => {
    const sr = 44100;
    const fftSize = 8192;
    const buf = pianoLike(329.63, sr, fftSize);
    const spectrum = spectrumFromWave(329.63, sr, fftSize);
    const result = detectPitchCombined(buf, spectrum, sr, fftSize);
    expect(result).not.toBeNull();
    expect(hzToMidi(result!.hz)).toBeGreaterThanOrEqual(63);
    expect(hzToMidi(result!.hz)).toBeLessThanOrEqual(65);
  });

  it('devuelve null con silencio', () => {
    expect(detectPitch(new Float32Array(2048), 44100)).toBeNull();
  });

  it('nearestExpected ignora notas lejanas', () => {
    expect(nearestExpected(64, [60], 1)).toBeNull();
    expect(nearestExpected(61, [60], 1)).toBe(60);
  });
});

describe('matchExpected (tolerancia de octava)', () => {
  it('prefiere la coincidencia exacta', () => {
    expect(matchExpected(60, [60, 72])).toBe(60);
  });

  it('acepta la misma nota en otra octava (error típico del detector)', () => {
    expect(matchExpected(72, [60, 64, 67])).toBe(60); // Do5 detectado, Do4 esperado
    expect(matchExpected(48, [60])).toBe(60);         // Do3 detectado, Do4 esperado
  });

  it('rechaza notas de distinta clase aunque estén cerca', () => {
    expect(matchExpected(61, [60])).toBe(null); // Do# no vale por Do
    expect(matchExpected(62, [60, 64])).toBe(null);
  });

  it('con varias octavas esperadas elige la más cercana', () => {
    expect(matchExpected(60, [48, 84])).toBe(48); // Do4 → Do3 (a 1 octava) antes que Do6 (a 2)
  });
});

describe('detectPitchCombined (graves)', () => {
  it('cuando autocorrelación y espectro discrepan en graves, manda la autocorrelación', () => {
    const sampleRate = 48000;
    const fftSize = 8192;
    // La2 = 110 Hz: onda limpia para la autocorrelación...
    const samples = sineWave(110, sampleRate, fftSize);
    // ...pero un espectro engañoso centrado en el 2º armónico (220 Hz)
    const spectrum = spectrumFromWave(220, sampleRate, fftSize);
    const result = detectPitchCombined(samples, spectrum, sampleRate, fftSize);
    expect(result).not.toBeNull();
    expect(hzToMidi(result!.hz)).toBe(45); // La2, no La3
  });
});
