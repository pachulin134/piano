import { useMemo, useState } from 'react';
import Keyboard from '../Keyboard';
import { initPiano, playNote } from '../../audio/piano';
import { matchExpected } from '../../audio/pitchDetect';
import type { StepPlay } from '../../core/theory/types';

interface Props { step: StepPlay; width: number; kbHeight: number; onDone: () => void }

export default function PlayStep({ step, width, kbHeight, onDone }: Props) {
  const target = useMemo(() => step.keys, [step]);
  const [hit, setHit] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<Set<number>>(new Set());

  const expected = new Set(target.filter(k => !hit.has(k)));

  const onKey = (midi: number, down: boolean) => {
    if (!down) return;
    // el navegador solo deja crear/activar el audio tras un gesto del usuario:
    // este toque de tecla es ese gesto, así que suena aunque no se pulsara "Escuchar".
    void initPiano().then(() => playNote(midi, 0.6)).catch(() => {});
    const remaining = target.filter(k => !hit.has(k));
    const match = step.anyOctave ? matchExpected(midi, remaining) : (remaining.includes(midi) ? midi : null);
    if (match !== null) {
      const nextHit = new Set(hit).add(match);
      setHit(nextHit);
      if (target.every(k => nextHit.has(k))) window.setTimeout(onDone, 250);
    } else {
      setWrong(prev => new Set(prev).add(midi));
      window.setTimeout(() => setWrong(prev => { const n = new Set(prev); n.delete(midi); return n; }), 350);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={{ fontSize: 17, lineHeight: 1.5 }}>{step.text}</p>
        {hit.size > 0 && <div className="coach coach-ok" style={{ marginTop: 12 }}>✓ ¡Bien!</div>}
      </div>
      <Keyboard loMidi={48} hiMidi={83} width={width} height={kbHeight}
        pressed={hit} expected={expected} wrong={wrong} onKey={onKey} interactive />
    </div>
  );
}
