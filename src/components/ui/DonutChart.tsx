export interface DonutSegment {
  label: string;
  value: number;
  tone: string;
}
export interface DonutChartProps {
  segments: DonutSegment[];
  totalLabel?: string;
  ariaLabel?: string;
}
export function DonutChart({ segments, totalLabel, ariaLabel }: DonutChartProps) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  return (
    <div className="ui-donut-layout">
      <div className="ui-donut" role="img" aria-label={ariaLabel}>
        <svg viewBox="0 0 42 42" aria-hidden="true">
          <circle className="ui-donut-track" cx="21" cy="21" r="15.9" />
          <g transform="rotate(-90 21 21)">
            {total > 0 &&
              segments.map((s) => {
                const length = (s.value / total) * 100;
                const node = (
                  <circle
                    key={s.label}
                    className="ui-donut-segment"
                    cx="21"
                    cy="21"
                    r="15.9"
                    stroke={s.tone}
                    strokeDasharray={`${length} ${100 - length}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += length;
                return node;
              })}
          </g>
        </svg>
        <span className="ui-donut-center">
          <strong>{total}</strong>
          {totalLabel && <small>{totalLabel}</small>}
        </span>
      </div>
      <ul className="ui-legend">
        {segments.map((s) => (
          <li key={s.label}>
            <span className="ui-legend-swatch" style={{ backgroundColor: s.tone }} />
            <span>{s.label}</span>
            <strong>{s.value}</strong>
            <small>{total ? Math.round((s.value / total) * 100) : 0}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
