interface Props {
  score: number | null;      // null = sesión sin puntuación (escuchar / salida sin intentos)
  maxStreak: number;
  isRecord: boolean;
  onRepeat: () => void;
  onChangeMode: () => void;
  onLibrary: () => void;
}

const CONFETTI_COLORS = ['#e8734a', '#f5a623', '#7bc47f', '#5b8fd4', '#d9534f'];

/** Pantalla de final con puntuación grande y confeti si hay récord. Presentacional. */
export default function EndOverlay({ score, maxStreak, isRecord, onRepeat, onChangeMode, onLibrary }: Props) {
  return (
    <div className="overlay">
      {isRecord && Array.from({ length: 30 }, (_, i) => (
        <div
          key={i}
          className="confetti"
          style={{
            left: `${(i * 37) % 100}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDuration: `${2 + (i % 5) * 0.4}s`,
            animationDelay: `${(i % 7) * 0.15}s`,
          }}
        />
      ))}
      <div className="card pop" style={{ width: 'min(92vw, 380px)', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 40 }}>{isRecord ? '🏆' : score !== null && score >= 80 ? '🎉' : '👏'}</div>
        <h2 style={{ fontSize: 22, margin: '8px 0 2px' }}>
          {isRecord ? '¡Nuevo récord!' : '¡Canción terminada!'}
        </h2>
        {score !== null && (
          <div style={{ fontSize: 56, fontWeight: 800, color: score >= 80 ? 'var(--left)' : score >= 50 ? 'var(--right-soft)' : 'var(--error)' }}>
            {score}%
          </div>
        )}
        {maxStreak > 1 && (
          <div className="chip" style={{ margin: '6px auto 0' }}>🔥 Mejor racha: {maxStreak} seguidas</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
          <button className="btn-primary" onClick={onRepeat}>↻ Repetir</button>
          <button onClick={onChangeMode}>Cambiar modo</button>
          <button className="btn-ghost" onClick={onLibrary}>← Biblioteca</button>
        </div>
      </div>
    </div>
  );
}
