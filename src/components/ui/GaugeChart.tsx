export interface GaugeThreshold {
  at: number;
  color: string;
}
export interface GaugeChartProps {
  value: number;
  label: string;
  thresholds?: GaugeThreshold[];
  ariaLabel?: string;
}
export function GaugeChart({
  value,
  label,
  thresholds = [
    { at: 0, color: '#3b82f6' },
    { at: 70, color: '#22a06b' },
  ],
  ariaLabel,
}: GaugeChartProps) {
  const safe = Math.max(0, Math.min(100, value));
  const color =
    [...thresholds].sort((a, b) => b.at - a.at).find((t) => safe >= t.at)?.color ??
    thresholds[0]?.color ??
    '#3b82f6';
  return (
    <div className="ui-gauge" role="img" aria-label={ariaLabel ?? `${label}: ${safe}%`}>
      <svg viewBox="0 0 100 60" aria-hidden="true">
        <path className="ui-gauge-track" d="M 10 50 A 40 40 0 0 1 90 50" />
        <path
          className="ui-gauge-fill"
          style={{ stroke: color }}
          pathLength="100"
          strokeDasharray={`${safe} 100`}
          d="M 10 50 A 40 40 0 0 1 90 50"
        />
      </svg>
      <strong>{safe}%</strong>
      <span>{label}</span>
    </div>
  );
}
