export type DashboardView = '3d' | 'table';
export type DashboardMode = 'overview' | 'energy' | 'heatmap';

export interface DashboardUrlState {
  viewMode: DashboardView;
  dataMode: DashboardMode;
  selectedCode: string | null;
}

const modes = new Set<DashboardMode>(['overview', 'energy', 'heatmap']);

export function parseDashboardUrl(
  search: string,
  validCodes: ReadonlySet<string>,
): DashboardUrlState {
  const params = new URLSearchParams(search);
  const mode = params.get('mode') as DashboardMode | null;
  const ward = params.get('ward');
  return {
    viewMode: params.get('view') === '2d' ? 'table' : '3d',
    dataMode: mode && modes.has(mode) ? mode : 'overview',
    selectedCode: ward && validCodes.has(ward) ? ward : null,
  };
}

export function serializeDashboardUrl(state: DashboardUrlState): string {
  const params = new URLSearchParams();
  params.set('view', state.viewMode === 'table' ? '2d' : '3d');
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
