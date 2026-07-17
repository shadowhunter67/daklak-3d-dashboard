import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import metrics from '../../assets/maps/daklak/daklak-metrics.json';
import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import { useMapStore } from '../../stores/mapStore';
import type { Metric, WardCollection } from '../../types/map';
import { formatNumber, formatUnitType } from '../../utils/geo';
import { normalizeSearchText } from '../../utils/search';
import { sortAdministrativeUnits } from '../../utils/administrativeUnits';

const collection = wards as WardCollection;
const metricMap = metrics as Record<string, Metric>;
const sortedUnits = sortAdministrativeUnits(
  collection.features.map(({ properties }) => properties),
);

export function AccessibleDirectory() {
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
          <p className="eyebrow">CHẾ ĐỘ TRUY CẬP 2D</p>
          <h2 id="directory-title" tabIndex={-1}>
            Danh sách xã, phường
          </h2>
        </div>
        <label>
          <span>Tìm theo tên hoặc mã</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ví dụ: Buôn Ma Thuột"
          />
        </label>
      </div>
      <p className="directory-status" role="status" aria-live="polite">
        Tìm thấy {filtered.length} đơn vị. Dùng phím mũi tên lên/xuống để duyệt.
      </p>
      <div ref={tableRef} className="directory-table" role="table" aria-rowcount={filtered.length}>
        <div ref={headerRef} className="directory-row directory-header" role="row">
          <span role="columnheader">Đơn vị</span>
          <span role="columnheader">Loại</span>
          <span role="columnheader">Diện tích</span>
          <span role="columnheader">Dân số minh họa</span>
          <span role="columnheader">Tiếp cận dịch vụ</span>
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
              <span role="cell">{formatUnitType(properties.type)}</span>
              <span role="cell">{formatNumber(properties.areaKm2)} km²</span>
              <span role="cell">{metric ? formatNumber(metric.population) : 'Chưa có'}</span>
              <span role="cell">{metric ? `${metric.coverage}%` : 'Chưa có'}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
