export type ProgressTone = 'gold' | 'orange' | 'green' | 'blue' | 'red';
export interface ProgressBarProps {
  value: number;
  tone?: ProgressTone;
  /** Accessible name; defaults to the visible percentage. */
  label?: string;
  /** Short visible text next to the bar (default: the percentage). */
  valueText?: string;
}
export function ProgressBar({ value, tone = 'green', label, valueText }: ProgressBarProps) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="ui-progress-wrap">
      <div
        className="ui-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safe}
        aria-label={label ?? `${safe}%`}
      >
        <span className={`ui-progress-fill ui-progress-${tone}`} style={{ width: `${safe}%` }} />
      </div>
      <span className="ui-progress-label">{valueText ?? `${safe}%`}</span>
    </div>
  );
}
