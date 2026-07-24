import { useMemo, useRef, useState } from 'react';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { buildLocalSearchIndex, searchLocalIndex, type LocalSearchEntry } from './localSearchIndex';
import { useTranslation } from '../../i18n/useTranslation';

const DEBOUNCE_MS = 250;

/**
 * Phase-1 search: local data only (ward names from daklak-labels.json). No external geocoding
 * API is called by default — see GeocoderProvider in detailMapTypes.ts for the future adapter
 * point, and docs/detail-map-integration.md for why Nominatim/Places are out of scope here.
 */
export function LocalSearch({ onSelect }: { onSelect: (entry: LocalSearchEntry) => void }) {
  const { t } = useTranslation();
  const index = useMemo(() => buildLocalSearchIndex(labels), []);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocalSearchEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = (value: string) => {
    setQuery(value);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setResults(searchLocalIndex(index, value));
      setActiveIndex(-1);
    }, DEBOUNCE_MS);
  };

  const selectEntry = (entry: LocalSearchEntry) => {
    onSelect(entry);
    setQuery(entry.name);
    setResults([]);
    setActiveIndex(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((value) => Math.min(value + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((value) => Math.max(value - 1, 0));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectEntry(results[activeIndex]);
    } else if (event.key === 'Escape') {
      setResults([]);
      setActiveIndex(-1);
    }
  };

  return (
    <div
      className="local-search"
      role="combobox"
      aria-expanded={results.length > 0}
      aria-haspopup="listbox"
    >
      <label htmlFor="detail-map-local-search-input" className="visually-hidden">
        {t('localSearch.label')}
      </label>
      <input
        id="detail-map-local-search-input"
        type="search"
        value={query}
        placeholder={t('localSearch.placeholder')}
        onChange={(event) => runSearch(event.target.value)}
        onKeyDown={onKeyDown}
        role="searchbox"
        aria-controls={results.length > 0 ? 'detail-map-local-search-results' : undefined}
        aria-activedescendant={activeIndex >= 0 ? `local-search-result-${activeIndex}` : undefined}
      />
      {results.length > 0 && (
        <ul
          id="detail-map-local-search-results"
          role="listbox"
          aria-label={t('localSearch.resultsAria')}
        >
          {results.map((entry, index) => (
            <li
              key={entry.code}
              id={`local-search-result-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => selectEntry(entry)}
            >
              {entry.name}
            </li>
          ))}
        </ul>
      )}
      {query.trim() && results.length === 0 && (
        <p role="status" className="local-search__empty">
          {t('localSearch.noResults', { query })}
        </p>
      )}
    </div>
  );
}
