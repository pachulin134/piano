import Keyboard from '../Keyboard';
import { initPiano, playNote } from '../../audio/piano';
import type { StepTeach } from '../../core/theory/types';

interface Props { step: StepTeach; width: number; kbHeight: number; onNext: () => void }

export default function TeachStep({ step, width, kbHeight, onNext }: Props) {
  const expected = new Set(step.keys);
  const sound = async () => {
    await initPiano();
    step.keys.forEach((m, i) => window.setTimeout(() => playNote(m, 0.8), i * 350));
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
        <p style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--ink)' }}>{step.text}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {step.play && step.keys.length > 0 && (
            <button className="btn-primary" onClick={sound}>▶ Escuchar</button>
          )}
          <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={onNext}>Siguiente →</button>
        </div>
      </div>
      <Keyboard loMidi={48} hiMidi={83} width={width} height={kbHeight}
        pressed={new Set()} expected={expected} wrong={new Set()} onKey={() => {}} interactive={false} />
    </div>
  );
}
