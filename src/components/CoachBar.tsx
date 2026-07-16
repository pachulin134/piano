export type CoachTone = 'ok' | 'warn' | 'err' | 'info';

interface Props {
  text: string;
  tone: CoachTone;
  /** Chip pequeño a la derecha (estado de entrada: "🎹 tu piano", "🎤 87%"...). */
  chip?: string | null;
  /** Botón de acción contextual (p. ej. "🔊 ¿Cómo suena?" o "Saltar →"). */
  action?: { label: string; onClick: () => void } | null;
}

/** Franja entrenadora: un solo mensaje grande + chip de estado. Presentacional. */
export default function CoachBar({ text, tone, chip, action }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 12px' }}>
      <div className={`coach coach-${tone}`} style={{ flex: 1, minWidth: 0 }}>{text}</div>
      {action && (
        <button className="chip" style={{ cursor: 'pointer', fontWeight: 700, flexShrink: 0 }} onClick={action.onClick}>
          {action.label}
        </button>
      )}
      {chip && <span className="chip" style={{ flexShrink: 0 }}>{chip}</span>}
    </div>
  );
}
