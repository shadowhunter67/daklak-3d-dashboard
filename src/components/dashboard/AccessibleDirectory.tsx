import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import metrics from '../../assets/maps/daklak/daklak-metrics.json';
import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import { useMapStore } from '../../stores/mapStore';
import type { Metric, WardCollection } from '../../types/map';
import { normalizeSearchText } from '../../utils/search';
import { sortAdministrativeUnits } from '../../utils/administrativeUnits';
import { useTranslation } from '../../i18n/useTranslation';
import { formatNumber } from '../../i18n/formatters';

const collection = wards as WardCollection;
const metricMap = metrics as Record<string, Metric>;
const sortedUnits = sortAdministrativeUnits(
  collection.features.map(({ properties }) => properties),
);

export function AccessibleDirectory() {
  const { t, locale } = useTranslation();
  const [query, setQuery] = useState('');
  const selectedCode = useMapStore((state) => state.selectedCode);
  const select = useMapStore((state) => state.select);
  const rows = useRef<Array<HTMLButtonElement | null>>([]);
  const tableRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    const term = normalizeSearchText(query);
    if (!term) return sortedUnits;
    return sortedUnits.filter(
      (properties) =>
        normalizeSearchText(properties.name).includes(term) || properties.code.includes(term),
    );
  }, [query]);

  useEffect(() => {
    const table = tableRef.current;
    const header = headerRef.current;
    if (!table || !header) return;
    const update = () => {
      const height = header.getBoundingClientRect().height;
      table.style.setProperty('--directory-sticky-header-height', `${height}px`);
      table.dataset.stickyHeaderHeight = height.toFixed(2);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? filtered.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length;
    const nextRow = rows.current[next];
    nextRow?.focus({ preventScroll: true });
    const table = tableRef.current;
    const header = headerRef.current;
    if (!nextRow || !table || !header) return;
    const rowBounds = nextRow.getBoundingClientRect();
    const tableBounds = table.getBoundingClientRect();
    const headerBounds = header.getBoundingClientRect();
    const topBoundary = headerBounds.bottom + 8;
    if (rowBounds.top < topBoundary) table.scrollTop -= topBoundary - rowBounds.top;
    if (rowBounds.bottom > tableBounds.bottom)
      table.scrollTop += rowBounds.bottom - tableBounds.bottom;
  };

  return (
    <section className="accessible-directory" aria-labelledby="directory-title">
      <div className="directory-heading">
        <div>
          <p className="eyebrow">{t('directory.eyebrow')}</p>
          <h2 id="directory-title" tabIndex={-1}>
            {t('directory.heading')}
          </h2>
        </div>
        <label>
          <span>{t('directory.searchLabel')}</span>
          <input
            id="directory-search"
            name="directory-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('directory.searchPlaceholder')}
          />
        </label>
      </div>
      <p className="directory-status" role="status" aria-live="polite">
        {t('directory.status', { count: filtered.length })}
      </p>
      <div ref={tableRef} className="directory-table" role="table" aria-rowcount={filtered.length}>
        <div ref={headerRef} className="directory-row directory-header" role="row">
          <span role="columnheader">{t('directory.col.unit')}</span>
          <span role="columnheader">{t('directory.col.type')}</span>
          <span role="columnheader">{t('directory.col.area')}</span>
          <span role="columnheader">{t('directory.col.illustrativePopulation')}</span>
          <span role="columnheader">{t('directory.col.serviceAccess')}</span>
        </div>
        {filtered.map((properties, index) => {
          const metric = metricMap[properties.code];
          const selected = selectedCode === properties.code;
          return (
            <button
              ref={(node) => {
                rows.current[index] = node;
              }}
              type="button"
              role="row"
              className={`directory-row${selected ? ' selected' : ''}`}
              aria-selected={selected}
              data-code={properties.code}
              key={properties.code}
              onClick={() => select(selected ? null : properties.code)}
              onKeyDown={(event) => moveFocus(event, index)}
            >
              <strong role="cell">{properties.name}</strong>
              <span role="cell">
                {t(properties.type === 'phuong' ? 'unitType.ward' : 'unitType.commune')}
              </span>
              <span role="cell">{formatNumber(properties.areaKm2, locale)} km²</span>
              <span role="cell">
                {metric ? formatNumber(metric.population, locale) : t('directory.noData')}
              </span>
              <span role="cell">{metric ? `${metric.coverage}%` : t('directory.noData')}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
