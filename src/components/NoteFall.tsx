import { useEffect, useMemo, useRef } from 'react';
import { keyLayout } from '../core/keyLayout';
import type { SongNote } from '../core/types';

interface Props {
  notes: SongNote[];
  currentTime: number;   // segundos musicales
  loMidi: number;
  hiMidi: number;
  width: number;
  height: number;
  lookAhead?: number;    // segundos visibles por delante (default 4)
}

const HAND_COLORS = { right: '#5c9dff', left: '#4caf7d' } as const;

export default function NoteFall({ notes, currentTime, loMidi, hiMidi, width, height, lookAhead = 4 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keyByMidi = useMemo(() => {
    const map = new Map<number, { x: number; w: number }>();
    for (const k of keyLayout(loMidi, hiMidi, width, 10)) map.set(k.midi, { x: k.x, w: k.w });
    return map;
  }, [loMidi, hiMidi, width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pxPerSecond = height / lookAhead;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#181b23';
    ctx.fillRect(0, 0, width, height);

    for (const n of notes) {
      const end = n.time + n.duration;
      if (end < currentTime || n.time > currentTime + lookAhead) continue;
      const key = keyByMidi.get(n.midi);
      if (!key) continue;
      // y: el borde inferior de la nota llega a height justo cuando n.time == currentTime
      const yBottom = height - (n.time - currentTime) * pxPerSecond;
      const h = Math.max(6, n.duration * pxPerSecond);
      ctx.fillStyle = HAND_COLORS[n.hand];
      ctx.beginPath();
      ctx.roundRect(key.x + 1, yBottom - h, key.w - 2, h, 4);
      ctx.fill();
    }
    // línea de "ahora"
    ctx.fillStyle = '#ffffff44';
    ctx.fillRect(0, height - 2, width, 2);
  }, [notes, currentTime, keyByMidi, width, height, lookAhead]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block' }} />;
}
