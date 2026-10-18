export type StatusTone = 'danger' | 'warning' | 'info' | 'success' | 'neutral' | 'progress';
export interface StatusChipProps {
  label: string;
  tone: StatusTone;
  dot?: boolean;
}
export function StatusChip({ label, tone, dot = false }: StatusChipProps) {
  return (
    <span className={`ui-status ui-status-${tone}`}>
      {dot && <span className="ui-status-dot" aria-hidden="true" />}
      {label}
    </span>
  );
}
