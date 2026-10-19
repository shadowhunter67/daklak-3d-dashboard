import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import labels from '#province-assets/daklak-labels.json';
import { defaultProjectPortfolioSource } from '../../app/createProjectPortfolioSource';
import {
  buildSearchIndex,
  flattenResults,
  searchAll,
  SEARCH_KIND_ORDER,
  type OpportunitySearchEntry,
  type PlaceSearchEntry,
  type ProjectSearchEntry,
  type SearchEntry,
  type SearchResultKind,
  type WardSearchEntry,
} from '../../features/search/globalSearchIndex';
import { useTranslation } from '../../i18n/useTranslation';
import type { MessageKey } from '../../i18n/messages';
import { SearchIcon } from './icons';

const wardEntries: WardSearchEntry[] = Object.entries(labels).map(([code, label]) => ({
  kind: 'ward',
  id: code,
  name: label.name,
  latitude: label.latitude,
  longitude: label.longitude,
}));

const GROUP_LABEL_KEY: Record<SearchResultKind, MessageKey> = {
  ward: 'topbar.search.group.ward',
  project: 'topbar.search.group.project',
  opportunity: 'topbar.search.group.opportunity',
  place: 'topbar.search.group.place',
};

/**
 * Topbar search over real data only: ward names (always loaded), projects (portfolio source) and
 * tourism places (verified destinations). The last two load on first focus so the topbar adds no
 * network/bundle cost to a visitor who never searches. Results are grouped by kind; selecting one
 * hands the entry to the shell, which decides where to go.
 */
export function GlobalSearch({ onSelect }: { onSelect: (entry: SearchEntry) => void }) {
  const { t } = useTranslation();
  const listId = useId();
  const [extra, setExtra] = useState<{
    projects: ProjectSearchEntry[];
    opportunities: OpportunitySearchEntry[];
    places: PlaceSearchEntry[];
  }>({ projects: [], opportunities: [], places: [] });
  const loadStarted = useRef(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const loadExtraSources = () => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    void defaultProjectPortfolioSource
      .loadPortfolio(new AbortController().signal)
      .then((result) => {
        if (result.status === 'error') return;
        const projects = result.data.bundles.map(({ project }) => ({
          kind: 'project' as const,
          id: project.id,
          name: project.name,
          code: project.code,
        }));
        setExtra((current) => ({ ...current, projects }));
      });
    // ~10 KB gzip, tải một lần; lỗi mạng thì bỏ qua (tìm kiếm vẫn dùng được với dữ liệu còn lại).
    void import('../../data/loadResearchedProjects')
      .then((module) => module.loadResearchedProjects())
      .then((dataset) => {
        const opportunities = dataset.projects.map(({ id, name }) => ({
          kind: 'opportunity' as const,
          id,
          name,
        }));
        setExtra((current) => ({ ...current, opportunities }));
      })
      .catch(() => undefined);
    void import('../../entities/tourism/verifiedTourismDestinations').then((module) => {
      const places = module.verifiedTourismDestinations.map(({ id, name }) => ({
        kind: 'place' as const,
        id,
        name,
      }));
      setExtra((current) => ({ ...current, places }));
    });
  };

  const index = useMemo(
    () =>
      buildSearchIndex([
        ...wardEntries,
        ...extra.projects,
        ...extra.opportunities,
        ...extra.places,
      ]),
    [extra],
  );
  const grouped = useMemo(() => searchAll(index, query), [index, query]);
  const flat = useMemo(() => flattenResults(grouped), [grouped]);
  const showPanel = open && query.trim().length > 0;

  useEffect(() => {
    // The highlighted option belongs to the previous query's list.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(-1);
  }, [query]);

  const choose = (entry: SearchEntry) => {
    onSelect(entry);
    setQuery(entry.name);
    setOpen(false);
    setActive(-1);
  };

  const submit = () => {
    const entry = flat[active >= 0 ? active : 0];
    if (entry) choose(entry);
    else setOpen(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && flat.length) {
      event.preventDefault();
      setOpen(true);
      setActive((value) => Math.min(value + 1, flat.length - 1));
    } else if (event.key === 'ArrowUp' && flat.length) {
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

  let optionPosition = -1;
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
          }}
          onFocus={() => {
            loadExtraSources();
            setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
      </label>
      <button type="submit" className="global-search__submit">
        {t('topbar.search.submit')}
      </button>
      {showPanel && (
        <div id={listId} role="listbox" className="global-search__results">
          {flat.length === 0 ? (
            <p className="global-search__empty" role="option" aria-selected="false">
              {t('topbar.search.noResults')}
            </p>
          ) : (
            SEARCH_KIND_ORDER.filter((kind) => grouped[kind].length > 0).map((kind) => (
              <div key={kind} role="group" aria-label={t(GROUP_LABEL_KEY[kind])}>
                <p className="global-search__group" aria-hidden="true">
                  {t(GROUP_LABEL_KEY[kind])}
                </p>
                {grouped[kind].map((entry) => {
                  optionPosition += 1;
                  const position = optionPosition;
                  return (
                    <div
                      key={`${entry.kind}-${entry.id}`}
                      id={`${listId}-${position}`}
                      role="option"
                      aria-selected={position === active}
                      className="global-search__option"
                      // mousedown (not click): the input's blur would otherwise close the list first.
                      onMouseDown={(event) => {
                        event.preventDefault();
                        choose(entry);
                      }}
                    >
                      <span>{entry.name}</span>
                      {entry.kind === 'project' && <small>{entry.code}</small>}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </form>
  );
}
