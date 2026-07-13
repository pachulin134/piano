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
  interactive?: boolean;
}

const KEY_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

const COLORS = {
  white: '#ffffff', whiteEdge: '#e5ddd0',
  black: '#3a352d', blackEdge: '#2b2620',
  expectedWhite: '#f5a623', expectedBlack: '#c07f10',
  pressed: '#7bc47f',
  wrongKey: '#d9534f',
  labelWhite: '#b0a695', labelExpected: '#7a5200', labelBlack: '#cfc8bd',
};

export default function Keyboard({ loMidi, hiMidi, width, height, pressed, expected, wrong, onKey, interactive = true }: Props) {
  const keys = useMemo(() => keyLayout(loMidi, hiMidi, width, height), [loMidi, hiMidi, width, height]);
  const fill = (midi: number, black: boolean) => {
    if (wrong.has(midi)) return COLORS.wrongKey;
    if (pressed.has(midi)) return COLORS.pressed;
    if (expected.has(midi)) return black ? COLORS.expectedBlack : COLORS.expectedWhite;
    return black ? COLORS.black : COLORS.white;
  };
  const labelColor = (midi: number, black: boolean) => {
    if (wrong.has(midi) || pressed.has(midi)) return '#ffffff';
    if (expected.has(midi)) return COLORS.labelExpected;
    return black ? COLORS.labelBlack : COLORS.labelWhite;
  };
  // Blancas primero para que las negras queden dibujadas encima
  const ordered = [...keys.filter(k => !k.black), ...keys.filter(k => k.black)];
  const showLabels = keys.filter(k => !k.black)[0]?.w >= 18; // en rangos enormes no caben
  return (
    <svg width={width} height={height} style={{ display: 'block', touchAction: 'none', background: '#efe9df' }}>
      {ordered.map(k => (
        <g key={k.midi} className={wrong.has(k.midi) ? 'shake' : undefined}>
          <rect
            x={k.x} y={0} width={k.w} height={k.h}
            fill={fill(k.midi, k.black)}
            stroke={k.black ? COLORS.blackEdge : COLORS.whiteEdge} strokeWidth={1} rx={4}
            onPointerDown={interactive ? e => { e.currentTarget.setPointerCapture(e.pointerId); onKey(k.midi, true); } : undefined}
            onPointerUp={interactive ? () => onKey(k.midi, false) : undefined}
            onPointerCancel={interactive ? () => onKey(k.midi, false) : undefined}
          />
          {showLabels && !k.black && (
            <text
              x={k.x + k.w / 2} y={k.h - 6}
              textAnchor="middle" fontSize={Math.min(11, k.w * 0.42)}
              fill={labelColor(k.midi, k.black)} fontWeight={expected.has(k.midi) ? 800 : 500}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {KEY_NAMES[k.midi % 12]}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
