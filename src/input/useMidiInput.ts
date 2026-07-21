import { useEffect, useState } from 'react';

export type KeyHandler = (midi: number, down: boolean) => void;

/**
 * Conecta con Web MIDI. Devuelve el nombre del dispositivo conectado,
 * null si no hay ninguno, o 'unsupported' si el navegador no soporta Web MIDI.
 */
export function useMidiInput(onKey: KeyHandler): string | null | 'unsupported' {
  const [device, setDevice] = useState<string | null | 'unsupported'>(null);

  useEffect(() => {
    if (!('requestMIDIAccess' in navigator)) {
      setDevice('unsupported');
      return;
    }
    let cancelled = false;
    let access: MIDIAccess | undefined;

    const attach = () => {
      if (!access || cancelled) return;
      try {
        let name: string | null = null;
        for (const input of access.inputs.values()) {
          name = input.name ?? 'Dispositivo MIDI';
          input.onmidimessage = (e: MIDIMessageEvent) => {
            if (!e.data) return;
            const [status, note, velocity] = e.data;
            const cmd = status & 0xf0;
            if (cmd === 0x90 && velocity > 0) onKey(note, true);
            else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) onKey(note, false);
          };
        }
        setDevice(name);
      } catch {
        // Algún navegador (p. ej. apps-envoltorio de iOS con su propio MIDI
        // "casero") expone requestMIDIAccess pero con un objeto incompleto
        // que no cumple el estándar; degradamos a "sin MIDI" en vez de
        // dejar una excepción sin capturar que se lleve por delante la app.
        setDevice('unsupported');
      }
    };

    try {
      const result = navigator.requestMIDIAccess();
      if (!result || typeof result.then !== 'function') {
        setDevice('unsupported');
      } else {
        result.then(a => {
          access = a;
          attach();
          a.onstatechange = attach;
        }).catch(() => setDevice('unsupported'));
      }
    } catch {
      // requestMIDIAccess puede lanzar de forma síncrona en vez de rechazar
      // la promesa, en implementaciones no estándar — mismo motivo que arriba.
      setDevice('unsupported');
    }

    return () => {
      cancelled = true;
      if (access) {
        access.onstatechange = null;
        for (const input of access.inputs.values()) input.onmidimessage = null;
      }
    };
  }, [onKey]);

  return device;
}
