import type { Fragment } from '../core/fragments';

interface Props {
  fragments: Fragment[];
  activeIndex: number | null;
  masteredScores: Record<number, number>;
  onSelect: (fragment: Fragment) => void;
}

const MASTERY_THRESHOLD = 80;

/** Franja de fragmentos: verde=dominado, naranja=activo, gris=pendiente. Tocar uno salta y lo pone en bucle. */
export default function FragmentBar({ fragments, activeIndex, masteredScores, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0, height: 20 }}>
      {fragments.map(f => {
        const mastered = (masteredScores[f.index] ?? 0) >= MASTERY_THRESHOLD;
        const isActive = activeIndex === f.index;
        const bg = isActive ? 'var(--right-soft)' : mastered ? 'var(--left-soft)' : 'var(--bg-chip)';
        const border = isActive ? '2px solid var(--right)' : mastered ? '1px solid var(--left)' : '1px solid var(--border)';
        return (
          <button
            key={f.index}
            onClick={() => onSelect(f)}
            style={{
              flex: Math.max(0.3, f.end - f.start),
              minWidth: 6, height: 20, padding: 0,
              background: bg, border, borderRadius: 4,
              cursor: 'pointer',
            }}
            aria-label={`Fragmento ${f.index + 1} de ${fragments.length}${mastered ? ' (dominado)' : ''}`}
          />
        );
      })}
    </div>
  );
}
