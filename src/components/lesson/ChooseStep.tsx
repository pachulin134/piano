import { useEffect, useState } from 'react';
import type { StepChoose } from '../../core/theory/types';

interface Props { step: StepChoose; onDone: () => void }

export default function ChooseStep({ step, onDone }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  // Con dos preguntas seguidas React reutiliza el componente: sin esto, el color
  // de la respuesta anterior se arrastraría a la nueva pregunta.
  useEffect(() => setPicked(null), [step]);
  const choose = (i: number) => {
    setPicked(i);
    if (i === step.answer) window.setTimeout(onDone, 500);
    else window.setTimeout(() => setPicked(null), 600);
  };
  const bg = (i: number) => {
    if (picked === null) return 'var(--bg-card)';
    if (i === step.answer && picked === i) return 'var(--left-pale)';
    if (i === picked) return 'var(--error-pale)';
    return 'var(--bg-card)';
  };
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: 12 }}>
      <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4 }}>{step.text}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {step.options.map((opt, i) => (
          <button key={i} className="card" style={{ textAlign: 'left', background: bg(i), fontSize: 16 }}
            onClick={() => choose(i)}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
