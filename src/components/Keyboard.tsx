import { useMemo } from 'react';
import { keyLayout } from '../core/keyLayout';

interface Props {
  loMidi: number;
  hiMidi: number;
  width: number;
  height: number;
  pressed: Set<number>;   // teclas que el usuario mantiene pulsadas
  expected: Set<number>;  // teclas que pide el modo espera
  wrong: Set<number>;     // teclas falladas (feedback rojo temporal)
  onKey: (midi: number, down: boolean) => void;
  interactive?: boolean;  // false = solo visualización (p. ej. piano MIDI real)
}

const COLORS = {
  white: '#f5f3ee', black: '#1c1e26',
  expectedWhite: '#7fb4ff', expectedBlack: '#3d6db3',
  pressed: '#4caf7d',
  wrongKey: '#e05555',
};

export default function Keyboard({ loMidi, hiMidi, width, height, pressed, expected, wrong, onKey, interactive = true }: Props) {
  const keys = useMemo(() => keyLayout(loMidi, hiMidi, width, height), [loMidi, hiMidi, width, height]);
  const fill = (midi: number, black: boolean) => {
    if (wrong.has(midi)) return COLORS.wrongKey;
    if (pressed.has(midi)) return COLORS.pressed;
    if (expected.has(midi)) return black ? COLORS.expectedBlack : COLORS.expectedWhite;
    return black ? COLORS.black : COLORS.white;
  };
  // Blancas primero para que las negras queden dibujadas encima
  const ordered = [...keys.filter(k => !k.black), ...keys.filter(k => k.black)];
  return (
    <svg width={width} height={height} style={{ display: 'block', touchAction: interactive ? 'none' : 'auto' }}>
      {ordered.map(k => (
        <rect
          key={k.midi}
          x={k.x} y={0} width={k.w} height={k.h}
          fill={fill(k.midi, k.black)}
          stroke="#101218" strokeWidth={1} rx={3}
          style={{ pointerEvents: interactive ? 'auto' : 'none' }}
          onPointerDown={interactive ? e => { e.currentTarget.setPointerCapture(e.pointerId); onKey(k.midi, true); } : undefined}
          onPointerUp={interactive ? () => onKey(k.midi, false) : undefined}
          onPointerCancel={interactive ? () => onKey(k.midi, false) : undefined}
        />
      ))}
    </svg>
  );
}
