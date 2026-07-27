import type { ProjectDetailProgressPoint } from './model/projectDetailTypes';
import { useTranslation } from '../../i18n/useTranslation';
import { formatDate } from '../../i18n/formatters';

/**
 * Lightweight SVG progress-history visualization (spec D4: "a lightweight SVG/HTML visualization
 * is preferred; only reach for ECharts if genuinely needed"). Two points is already enough to draw
 * a meaningful line for the illustrative dataset, so ECharts was never needed here — this keeps
 * Project Detail's initial chunk free of the ECharts dependency entirely (spec D6).
 *
 * A text alternative (the `<table>` below, `.visually-hidden` visually but present to
 * screen readers/text browsers) always renders alongside the chart (spec D7: "any chart has a text
 * summary").
 */
export function ProgressHistorySparkline({
  points,
}: {
  points: readonly ProjectDetailProgressPoint[];
}) {
  const { t, locale } = useTranslation();
  if (points.length === 0) {
    return <p>{t('progressHistory.empty')}</p>;
  }

  const width = 480;
  const height = 160;
  const padding = 24;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const xFor = (index: number) =>
    points.length === 1
      ? padding + plotWidth / 2
      : padding + (index / (points.length - 1)) * plotWidth;
  const yFor = (value: number) =>
    padding + plotHeight - (Math.max(0, Math.min(100, value)) / 100) * plotHeight;

  const line = (pick: (p: ProjectDetailProgressPoint) => number) =>
    points.map((p, i) => `${xFor(i)},${yFor(pick(p))}`).join(' ');

  return (
    <div className="progress-history">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t('progressHistory.chartAria', { count: points.length })}
        className="progress-history__chart"
      >
        <line
          x1={padding}
          y1={padding + plotHeight}
          x2={width - padding}
          y2={padding + plotHeight}
          className="progress-history__axis"
        />
        <polyline
          points={line((p) => p.plannedPhysicalProgress)}
          className="progress-history__line progress-history__line--planned"
        />
        <polyline
          points={line((p) => p.physicalProgress)}
          className="progress-history__line progress-history__line--actual"
        />
        {points.map((p, i) => (
          <circle
            key={p.observedAt}
            cx={xFor(i)}
            cy={yFor(p.physicalProgress)}
            r={3}
            className="progress-history__point"
          />
        ))}
      </svg>
      <p className="progress-history__legend">
        <span className="progress-history__legend-item progress-history__legend-item--planned">
          {t('progressHistory.legendPlanned')}
        </span>
        <span className="progress-history__legend-item progress-history__legend-item--actual">
          {t('progressHistory.legendActual')}
        </span>
      </p>
      <table className="visually-hidden">
        <caption>{t('progressHistory.tableCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('progressHistory.col.observedAt')}</th>
            <th scope="col">{t('progressHistory.col.plannedProgress')}</th>
            <th scope="col">{t('progressHistory.col.actualProgress')}</th>
            <th scope="col">{t('progressHistory.col.financialProgress')}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.observedAt}>
              <td>{formatDate(p.observedAt, locale)}</td>
              <td>{p.plannedPhysicalProgress}</td>
              <td>{p.physicalProgress}</td>
              <td>{p.financialProgress}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
