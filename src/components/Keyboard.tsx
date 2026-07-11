import { useMemo } from 'react';
import { keyLayout } from '../core/keyLayout';

interface Props {
  loMidi: number;
  hiMidi: number;
  width: number;
  height: number;
  pressed: Set<number>;   // teclas que el usuario mantiene pulsadas
  expected: Set<number>;  // teclas que pide el modo espera
  onKey: (midi: number, down: boolean) => void;
}

const COLORS = {
  white: '#f5f3ee', black: '#1c1e26',
  expectedWhite: '#7fb4ff', expectedBlack: '#3d6db3',
  pressed: '#4caf7d',
};

export default function Keyboard({ loMidi, hiMidi, width, height, pressed, expected, onKey }: Props) {
  const keys = useMemo(() => keyLayout(loMidi, hiMidi, width, height), [loMidi, hiMidi, width, height]);
  const fill = (midi: number, black: boolean) => {
    if (pressed.has(midi)) return COLORS.pressed;
    if (expected.has(midi)) return black ? COLORS.expectedBlack : COLORS.expectedWhite;
    return black ? COLORS.black : COLORS.white;
  };
  // Blancas primero para que las negras queden dibujadas encima
  const ordered = [...keys.filter(k => !k.black), ...keys.filter(k => k.black)];
  return (
    <svg width={width} height={height} style={{ display: 'block', touchAction: 'none' }}>
      {ordered.map(k => (
        <rect
          key={k.midi}
          x={k.x} y={0} width={k.w} height={k.h}
          fill={fill(k.midi, k.black)}
          stroke="#101218" strokeWidth={1} rx={3}
          onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onKey(k.midi, true); }}
          onPointerUp={() => onKey(k.midi, false)}
          onPointerCancel={() => onKey(k.midi, false)}
        />
      ))}
    </svg>
  );
}
