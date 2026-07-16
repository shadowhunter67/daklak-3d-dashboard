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
