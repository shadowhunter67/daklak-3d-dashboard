// 'map' is the detail-map experience (MapLibre); see src/components/detail-map/detailMapTypes.ts
// for the richer MapExperience model and the mapExperienceFromViewMode/viewModeFromMapExperience
// mapping functions this three-value union backs. Existing '3d'/'table' URLs and consumers are
// unaffected — 'map' is purely additive.
//
// 'overview' (Executive Overview, Phase 2A) is the new default landing experience — see
// parseViewMode below. It is additive too: every previously-working `?view=3d`/`?view=2d`/
// `?view=map` URL still resolves to exactly the same view it always did. Only the absence of a
// `view` param (or an unrecognized one) now resolves to 'overview' instead of '3d'.
export type DashboardView = 'overview' | '3d' | 'table' | 'map';
export type DashboardMode = 'overview' | 'energy' | 'heatmap';

export interface DashboardUrlState {
  viewMode: DashboardView;
  dataMode: DashboardMode;
  selectedCode: string | null;
}

const modes = new Set<DashboardMode>(['overview', 'energy', 'heatmap']);

function parseViewMode(raw: string | null): DashboardView {
  if (raw === '3d') return '3d';
  if (raw === '2d') return 'table';
  if (raw === 'map') return 'map';
  // No param, or an unrecognized value (including the explicit canonical 'overview'): land on
  // Executive Overview. Before Phase 2A this fell back to '3d' — see docs/adr for the rationale.
  return 'overview';
}

function serializeViewMode(viewMode: DashboardView): string {
  if (viewMode === 'table') return '2d';
  if (viewMode === 'map') return 'map';
  if (viewMode === '3d') return '3d';
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
