export type CoachTone = 'ok' | 'warn' | 'err' | 'info';

interface Props {
  text: string;
  tone: CoachTone;
  /** Chip pequeño a la derecha (estado de entrada: "🎹 tu piano", "🎤 87%"...). */
  chip?: string | null;
}

/** Franja entrenadora: un solo mensaje grande + chip de estado. Presentacional. */
export default function CoachBar({ text, tone, chip }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 12px' }}>
      <div className={`coach coach-${tone}`} style={{ flex: 1 }}>{text}</div>
      {chip && <span className="chip">{chip}</span>}
    </div>
  );
}
