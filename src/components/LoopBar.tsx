import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

interface Props {
  duration: number;       // segundos de la canción
  start: number;          // segundos del marcador A
  end: number;            // segundos del marcador B
  currentTime: number;
  onChange: (start: number, end: number) => void;
  onSetAHere: () => void;
  onSetBHere: () => void;
  onClear: () => void;
}

const MIN_GAP = 1; // segundos mínimos entre A y B

/** Barra de bucle A-B con tiradores arrastrables. Presentacional. */
export default function LoopBar({ duration, start, end, currentTime, onChange, onSetAHere, onSetBHere, onClear }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  function timeAt(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return frac * duration;
  }

  function dragHandle(which: 'a' | 'b') {
    return (e: ReactPointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        const t = timeAt(ev.clientX);
        if (which === 'a') onChange(Math.min(t, end - MIN_GAP), end);
        else onChange(start, Math.max(t, start + MIN_GAP));
      };
      // pointercancel además de pointerup: un gesto del sistema en iOS puede
      // cancelar el arrastre sin disparar pointerup, y sin esto los listeners
      // quedarían colgados y el tirador se "pegaría" al dedo.
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    };
  }

  const pct = (t: number) => `${duration > 0 ? (t / duration) * 100 : 0}%`;
  const handleStyle: CSSProperties = {
    position: 'absolute', top: -14, width: 40, height: 40, marginLeft: -20,
    borderRadius: '50%', background: 'var(--right)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 800, touchAction: 'none',
    boxShadow: 'var(--shadow)', cursor: 'grab',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 4px' }}>
      <span className="chip">🔁</span>
      <div ref={trackRef} style={{ position: 'relative', flex: 1, height: 12, background: 'var(--bg-chip)', borderRadius: 6 }}>
        <div style={{
          position: 'absolute', left: pct(start), width: `calc(${pct(end)} - ${pct(start)})`,
          height: 12, background: 'var(--right-pale)', border: '1px solid var(--right-soft)', borderRadius: 6,
        }} />
        <div style={{ position: 'absolute', left: pct(currentTime), width: 2, height: 12, background: 'var(--right)' }} />
        <div style={{ ...handleStyle, left: pct(start) }} onPointerDown={dragHandle('a')}>A</div>
        <div style={{ ...handleStyle, left: pct(end), background: 'var(--left)' }} onPointerDown={dragHandle('b')}>B</div>
      </div>
      <button className="btn-ghost" style={{ fontSize: 12 }} onClick={onSetAHere}>A aquí</button>
      <button className="btn-ghost" style={{ fontSize: 12 }} onClick={onSetBHere}>B aquí</button>
      <button className="btn-ghost" style={{ fontSize: 14 }} onClick={onClear}>✕</button>
    </div>
  );
}
