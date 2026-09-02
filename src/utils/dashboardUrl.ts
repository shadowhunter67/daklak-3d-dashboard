// 'map' is the detail-map experience (MapLibre) — see src/components/detail-map/detailMapTypes.ts.
// It now also carries the ward directory/list (formerly a separate 'table' view, folded into 'map'
// as a sidebar next to the MapLibre canvas — see DetailMapViewport.tsx). Old `?view=2d`/`?view=table`
// URLs (the standalone SVG+list view they used to point at) alias to 'map' in parseViewMode below —
// they still resolve to a working view, just the merged one, not a separate SVG surface anymore.
//
// 'overview' (Executive Overview, Phase 2A) is the new default landing experience — see
// parseViewMode below. Only the absence of a `view` param (or an unrecognized one) resolves to
// 'overview'.
// 'world' (Phase T1, Tourism Digital Twin foundation — reports/tourism-digital-twin/) is a
// separate, additive, lazy-loaded illustrative exploration route. It does not replace or read
// from any of the other three views' state; see src/features/world-exploration/.
export type DashboardView = 'overview' | '3d' | 'map' | 'world';
export type DashboardMode = 'overview' | 'energy' | 'heatmap';

export interface DashboardUrlState {
  viewMode: DashboardView;
  dataMode: DashboardMode;
  selectedCode: string | null;
}

const modes = new Set<DashboardMode>(['overview', 'energy', 'heatmap']);

function parseViewMode(raw: string | null): DashboardView {
  if (raw === '3d') return '3d';
  // '2d'/'table': legacy values for the standalone SVG+list view, now folded into 'map'.
  if (raw === '2d' || raw === 'table') return 'map';
  if (raw === 'map') return 'map';
  if (raw === 'world') return 'world';
  // No param, or an unrecognized value (including the explicit canonical 'overview'): land on
  // Executive Overview. Before Phase 2A this fell back to '3d' — see docs/adr for the rationale.
  return 'overview';
}

function serializeViewMode(viewMode: DashboardView): string {
  if (viewMode === 'map') return 'map';
  if (viewMode === '3d') return '3d';
  if (viewMode === 'world') return 'world';
  return 'overview';
}

export function parseDashboardUrl(
  search: string,
  validCodes: ReadonlySet<string>,
): DashboardUrlState {
  const params = new URLSearchParams(search);
  const mode = params.get('mode') as DashboardMode | null;
  const ward = params.get('ward');
  return {
    viewMode: parseViewMode(params.get('view')),
    dataMode: mode && modes.has(mode) ? mode : 'overview',
    selectedCode: ward && validCodes.has(ward) ? ward : null,
  };
}

export function serializeDashboardUrl(state: DashboardUrlState): string {
  const params = new URLSearchParams();
  params.set('view', serializeViewMode(state.viewMode));
  params.set('mode', state.dataMode);
  if (state.selectedCode) params.set('ward', state.selectedCode);
  return `?${params.toString()}`;
}

export type DashboardHistoryAction = 'push' | 'replace';

/**
 * A ward selection alone should not clutter Back/Forward with one entry per click; only a
 * view/data-mode change (with or without a simultaneous selection change) is push-worthy.
 */
export function decideDashboardHistoryAction(
  previous: DashboardUrlState,
  next: DashboardUrlState,
): DashboardHistoryAction {
  const viewOrModeChanged =
    previous.viewMode !== next.viewMode || previous.dataMode !== next.dataMode;
  return viewOrModeChanged ? 'push' : 'replace';
}
