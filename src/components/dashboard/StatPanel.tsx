import metadata from '../../assets/maps/daklak/daklak-metadata.json';
import metrics from '../../assets/maps/daklak/daklak-metrics.json';
import dashboardData from '../../assets/data/dashboard-sources.json';
import { useMapStore } from '../../stores/mapStore';
import { useTranslation } from '../../i18n/useTranslation';
import { formatNumber } from '../../i18n/formatters';

const CHART_HEIGHT = 105;
const CHART_LABEL_ROW_HEIGHT = 22;
const BAR_WIDTH = 15;
const BAR_AREA_HEIGHT = CHART_HEIGHT - CHART_LABEL_ROW_HEIGHT;
const CHART_VIEWBOX_WIDTH = 150;

/**
 * Bar chart nội bộ vẽ bằng SVG thuần — thay cho ECharts (core+BarChart+GridComponent+SVGRenderer+
 * echarts-for-react), vốn nặng ~172KB gzip riêng cho việc vẽ đúng 3 cột. Ba chỉ số theo mode luôn
 * đơn giản (3 danh mục, 1 series) nên không cần một thư viện chart tổng quát. Xem
 * docs/performance.md cho số byte trước/sau.
 */
function MiniBarChart({ bars }: { bars: { label: string; value: number }[] }) {
  const maxValue = Math.max(...bars.map((b) => b.value), 1);
  const gap = CHART_VIEWBOX_WIDTH / bars.length;
  return (
    <svg
      viewBox={`0 0 ${CHART_VIEWBOX_WIDTH} ${CHART_HEIGHT}`}
      width="100%"
      height={CHART_HEIGHT}
      role="presentation"
      focusable="false"
    >
      {bars.map((bar, index) => {
        const barHeight = (bar.value / maxValue) * BAR_AREA_HEIGHT;
        const x = gap * index + (gap - BAR_WIDTH) / 2;
        const y = BAR_AREA_HEIGHT - barHeight;
        return (
          <g key={bar.label}>
            <rect x={x} y={y} width={BAR_WIDTH} height={barHeight} rx={4} ry={4} fill="#d4a446" />
            <text
              x={x + BAR_WIDTH / 2}
              y={CHART_HEIGHT - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#8eaaa3"
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function StatPanel() {
  const { t, locale } = useTranslation();
  const dataMode = useMapStore((state) => state.dataMode);
  const values = Object.values(metrics);
  const population = values.reduce((s, v) => s + v.population, 0);
  const bars =
    dataMode === 'energy'
      ? [
          { label: t('statPanel.bar.hydro'), value: 83 },
          { label: t('statPanel.bar.renewable'), value: 76 },
          { label: t('statPanel.bar.load'), value: 92 },
        ]
      : dataMode === 'heatmap'
        ? [
            { label: t('statPanel.bar.low'), value: 42 },
            { label: t('statPanel.bar.medium'), value: 68 },
            { label: t('statPanel.bar.high'), value: 94 },
          ]
        : [
            { label: t('statPanel.bar.west'), value: 62 },
            { label: t('statPanel.bar.central'), value: 84 },
            { label: t('statPanel.bar.east'), value: 73 },
          ];
  const chartAriaLabel = t('statPanel.chartAria', {
    summary: bars.map((bar) => `${bar.label} ${bar.value}`).join(', '),
  });
  return (
    <aside className="stat-panel glass">
      <p className="eyebrow">
        {dataMode === 'energy'
          ? t('statPanel.eyebrow.energy')
          : dataMode === 'heatmap'
            ? t('statPanel.eyebrow.heatmap')
            : t('statPanel.eyebrow.overview')}
      </p>
      <span className="data-badge">
        {dataMode === 'overview'
          ? t('statPanel.badge.overview')
          : t('statPanel.badge.illustrative')}
      </span>
      <div className="hero-stat">
        <strong>
          {dataMode === 'overview'
            ? metadata.totalUnits
            : dataMode === 'energy'
              ? dashboardData.energy.nodes.length
              : 20}
        </strong>
        <span>
          {dataMode === 'overview'
            ? t('statPanel.heroLabel.overview')
            : dataMode === 'energy'
              ? t('statPanel.heroLabel.energy')
              : t('statPanel.heroLabel.heatmap')}
        </span>
      </div>
      {dataMode === 'overview' && (
        <div className="stat-pair">
          <div>
            <b>{metadata.communeCount}</b>
            <small>{t('statPanel.communeUnit')}</small>
          </div>
          <div>
            <b>{metadata.wardCount}</b>
            <small>{t('statPanel.wardUnit')}</small>
          </div>
        </div>
      )}
      <div className="divider" />
      <div className={dataMode === 'overview' ? 'metric' : 'metric metric--mock'}>
        <span>
          {dataMode === 'overview'
            ? t('statPanel.metricLabel.grdp')
            : dataMode === 'energy'
              ? t('statPanel.metricLabel.energyStatus')
              : t('statPanel.metricLabel.heatmapIndicator')}
        </span>
        <b>
          {dataMode === 'overview'
            ? `+${dashboardData.overview.grdpGrowthPercent}%`
            : dataMode === 'energy'
              ? t('statPanel.metricValue.illustrative')
              : t('statPanel.metricValue.simulatedPopulation')}
        </b>
      </div>
      {dataMode === 'overview' && (
        <div className="metric">
          <span>{t('statPanel.newBusinesses')}</span>
          <b>{formatNumber(dashboardData.overview.newBusinesses, locale)}</b>
        </div>
      )}
      {dataMode === 'overview' && (
        <div className="metric metric--mock">
          <span>{t('statPanel.communePopulation')}</span>
          <b>{t('statPanel.metricValue.illustrative')}</b>
        </div>
      )}
      <div className="chart-title">
        {dataMode === 'energy'
          ? t('statPanel.chartTitle.energy')
          : dataMode === 'heatmap'
            ? t('statPanel.chartTitle.heatmap')
            : t('statPanel.chartTitle.overview')}
      </div>
      <div role="img" aria-label={chartAriaLabel}>
        <MiniBarChart bars={bars} />
      </div>
      <p className="mock-note">
        {dataMode === 'overview'
          ? t('statPanel.mockNote.overview', {
              source: dashboardData.overview.sourceName,
              population: formatNumber(population, locale),
            })
          : t('statPanel.mockNote.other')}
      </p>
    </aside>
  );
}
