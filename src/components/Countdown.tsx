import { useEffect, useState } from 'react';

interface Props {
  /** Al llegar a 0 se llama una única vez. */
  onDone: () => void;
}

/** Cuenta atrás 3-2-1 superpuesta a la cascada. Montar solo cuando toque. */
export default function Countdown({ onDone }: Props) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n === 0) { onDone(); return; }
    const t = window.setTimeout(() => setN(v => v - 1), 700);
    return () => window.clearTimeout(t);
  }, [n, onDone]);
  if (n === 0) return null;
  return (
    <div className="overlay" style={{ background: 'rgba(43,38,32,0.25)' }}>
      <div key={n} className="pop" style={{
        fontSize: 96, fontWeight: 800, color: '#fff',
        textShadow: '0 4px 16px rgba(60,40,20,0.4)',
      }}>
        {n}
      </div>
    </div>
  );
}
