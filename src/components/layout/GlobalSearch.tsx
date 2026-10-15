import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import labels from '#province-assets/daklak-labels.json';
import {
  buildLocalSearchIndex,
  searchLocalIndex,
  type LocalSearchEntry,
} from '../detail-map/localSearchIndex';
import { useTranslation } from '../../i18n/useTranslation';
import { SearchIcon } from './icons';

/**
 * Topbar search over the same local ward index the detail-map search uses (names from
 * `daklak-labels.json`) — no external geocoder. Selecting a result hands the entry to the shell,
 * which decides where to go (select the ward, move the map camera, leave a hash route).
 */
export function GlobalSearch({ onSelect }: { onSelect: (entry: LocalSearchEntry) => void }) {
  const { t } = useTranslation();
  const listId = useId();
  const index = useMemo(() => buildLocalSearchIndex(labels), []);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const results = useMemo(() => searchLocalIndex(index, query), [index, query]);
  const showPanel = open && query.trim().length > 0;

  const choose = (entry: LocalSearchEntry) => {
    onSelect(entry);
    setQuery(entry.name);
    setOpen(false);
    setActive(-1);
  };

  const submit = () => {
    const entry = results[active >= 0 ? active : 0];
    if (entry) choose(entry);
    else setOpen(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setOpen(true);
      setActive((value) => Math.min(value + 1, results.length - 1));
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setActive((value) => Math.max(value - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <form
      className="global-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="global-search__field">
        <SearchIcon />
        <input
          type="search"
          role="combobox"
          aria-label={t('topbar.search.label')}
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          placeholder={t('topbar.search.placeholder')}
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
      </label>
      <button type="submit" className="global-search__submit">
        {t('topbar.search.submit')}
      </button>
      {showPanel && (
        <ul id={listId} role="listbox" className="global-search__results">
          {results.length === 0 ? (
            <li className="global-search__empty" role="option" aria-selected="false">
              {t('topbar.search.noResults')}
            </li>
          ) : (
            results.map((entry, position) => (
              <li
                key={entry.code}
                id={`${listId}-${position}`}
                role="option"
                aria-selected={position === active}
                // mousedown (not click): the input's blur would otherwise close the list first.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(entry);
                }}
              >
                {entry.name}
              </li>
            ))
          )}
        </ul>
      )}
    </form>
  );
}
