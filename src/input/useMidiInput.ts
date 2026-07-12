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
    };

    navigator.requestMIDIAccess().then(a => {
      access = a;
      attach();
      a.onstatechange = attach;
    }).catch(() => setDevice('unsupported'));

    return () => { cancelled = true; };
  }, [onKey]);

  return device;
}
