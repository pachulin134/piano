import { describe, it, expect } from 'vitest';
import { resolveEngineMode, pickDefaultInput, type SessionConfig } from './sessionModes';

const base: SessionConfig = {
  door: 'learn', input: 'screen', level: 'original', speed: 1, hand: 'both', waitMode: true,
};

describe('resolveEngineMode', () => {
  it('escuchar → listenMode, sin interacción', () => {
    const r = resolveEngineMode({ ...base, door: 'listen' });
    expect(r.engine.listenMode).toBe(true);
    expect(r.micMode).toBe(false);
    expect(r.engine.guidedMode).toBeFalsy();
    expect(r.engine.playAlongMode).toBeFalsy();
  });

  it('aprender + micrófono → modo guiado con mic', () => {
    const r = resolveEngineMode({ ...base, door: 'learn', input: 'mic' });
    expect(r.engine.guidedMode).toBe(true);
    expect(r.micMode).toBe(true);
    expect(r.engine.listenMode).toBeFalsy();
  });

  it('aprender + MIDI o pantalla → práctica con espera', () => {
    for (const input of ['midi', 'screen'] as const) {
      const r = resolveEngineMode({ ...base, door: 'learn', input });
      expect(r.engine.waitMode).toBe(true);
      expect(r.engine.guidedMode).toBeFalsy();
      expect(r.micMode).toBe(false);
    }
  });

  it('tocar → playAlongMode (nunca mic)', () => {
    const r = resolveEngineMode({ ...base, door: 'play', input: 'midi' });
    expect(r.engine.playAlongMode).toBe(true);
    expect(r.micMode).toBe(false);
  });

  it('conserva speed y hand; waitMode solo aplica en aprender sin mic', () => {
    const r = resolveEngineMode({ ...base, door: 'learn', input: 'midi', speed: 0.5, hand: 'right' });
    expect(r.engine.speed).toBe(0.5);
    expect(r.engine.hand).toBe('right');
  });

  it('tocar + entrada mic no produce micMode (combo inválido del spec)', () => {
    const r = resolveEngineMode({ ...base, door: 'play', input: 'mic' });
    expect(r.micMode).toBe(false);
    expect(r.engine.playAlongMode).toBe(true);
  });
  it('aprender sin espera respeta waitMode=false', () => {
    const r = resolveEngineMode({ ...base, door: 'learn', input: 'screen', waitMode: false });
    expect(r.engine.waitMode).toBe(false);
  });
});

describe('pickDefaultInput', () => {
  it('con MIDI conectado siempre gana el cable', () => {
    expect(pickDefaultInput(true, 'learn')).toBe('midi');
    expect(pickDefaultInput(true, 'play')).toBe('midi');
  });
  it('sin MIDI: aprender → micrófono; tocar/escuchar → pantalla', () => {
    expect(pickDefaultInput(false, 'learn')).toBe('mic');
    expect(pickDefaultInput(false, 'play')).toBe('screen');
    expect(pickDefaultInput(false, 'listen')).toBe('screen');
  });
  it('pickDefaultInput con MIDI también gana en escuchar', () => {
    expect(pickDefaultInput(true, 'listen')).toBe('midi');
  });
});
