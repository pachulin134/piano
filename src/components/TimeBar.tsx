import { useRef, type PointerEvent as ReactPointerEvent } from 'react';

interface Props {
  time: number;
  duration: number;
  /** false = solo lectura (modo micrófono). */
  seekable: boolean;
  onSeek: (t: number) => void;
}

export function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
}

/** Barra de tiempo interactiva: tocar/arrastrar para saltar + tiempo m:ss. */
export default function TimeBar({ time, duration, seekable, onSeek }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  function timeAt(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return frac * duration;
  }

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!seekable) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onSeek(timeAt(e.clientX));
    const move = (ev: PointerEvent) => onSeek(timeAt(ev.clientX));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
      {seekable && (
        <button className="btn-ghost" style={{ fontSize: 13, padding: '2px 4px', flexShrink: 0 }}
          onClick={() => onSeek(Math.max(0, time - 5))}>
          ⏪5s
        </button>
      )}
      <div
        ref={trackRef}
        onPointerDown={startDrag}
        style={{
          flex: 1, minWidth: 40, height: seekable ? 22 : 8,
          display: 'flex', alignItems: 'center',
          touchAction: 'none', cursor: seekable ? 'pointer' : 'default',
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: 8, background: 'var(--bg-chip)', borderRadius: 4 }}>
          <div style={{ width: `${pct}%`, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, var(--right-soft), var(--right))' }} />
          {seekable && (
            <div style={{
              position: 'absolute', top: -5, left: `${pct}%`, marginLeft: -9,
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--right)', boxShadow: 'var(--shadow)',
            }} />
          )}
        </div>
      </div>
      <span style={{ fontSize: 11, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {fmtTime(time)} / {fmtTime(duration)}
      </span>
    </div>
  );
}
