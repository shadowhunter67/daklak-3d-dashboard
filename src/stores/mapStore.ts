import { create } from 'zustand';
import labels from '../assets/maps/daklak/daklak-labels.json';
import { parseDashboardUrl, type DashboardUrlState, type DashboardView } from '../utils/dashboardUrl';
import {
  DEFAULT_DETAIL_MAP_CAMERA,
  DEFAULT_DETAIL_MAP_LAYER_STATE,
  type DetailBaseMap,
  type DetailMapCameraState,
  type DetailMapLayerState,
} from '../components/detail-map/detailMapTypes';
import { camerasApproximatelyEqual } from '../components/detail-map/detailMapUrl';

const validAdministrativeCodes = new Set(Object.keys(labels));

/**
 * Not pure — it reads window.location, so its result depends on external mutable state — but
 * that read now happens only when this function is called, never as a module-import side
 * effect, which is what actually makes createMapStore testable without touching window.location.
 */
export function getInitialDashboardUrlState(): DashboardUrlState {
  return parseDashboardUrl(
    typeof window === 'undefined' ? '' : window.location.search,
    validAdministrativeCodes,
  );
}

// terrainVisible/satelliteVisible are derived from baseMap (see setDetailMapBaseMap) and must
// not be toggled independently — that would desync them from the actual base-map selection.
type ToggleableDetailMapLayer = Exclude<
  keyof DetailMapLayerState,
  'baseMap' | 'terrainVisible' | 'satelliteVisible'
>;

export interface MapState {
  dataMode: 'overview' | 'energy' | 'heatmap';
  viewMode: DashboardView;
  hoveredCode: string | null;
  selectedCode: string | null;
  labelsVisible: boolean;
  roadsVisible: boolean;
  autoRotate: boolean;
  reducedMotion: boolean;
  resetCameraSignal: number;
  helpSignal: number;
  insetsChangeSignal: number;
  detailMapLayers: DetailMapLayerState;
  detailMapCamera: DetailMapCameraState;
  setHovered: (code: string | null) => void;
  select: (code: string | null) => void;
  toggleLabels: () => void;
  toggleRoads: () => void;
  toggleAutoRotate: () => void;
  setReducedMotion: (reduced: boolean) => void;
  changeDataMode: (mode: MapState['dataMode']) => void;
  setViewMode: (mode: MapState['viewMode']) => void;
  applyUrlState: (state: DashboardUrlState) => void;
  requestCameraReset: () => void;
  requestHelp: () => void;
  notifyInsetsChanged: () => void;
  setDetailMapBaseMap: (baseMap: DetailBaseMap) => void;
  toggleDetailMapLayer: (layer: ToggleableDetailMapLayer) => void;
  /** No-op (and no re-render) if the new camera is within epsilon of the current one. */
  setDetailMapCamera: (camera: DetailMapCameraState) => void;
  applyDetailMapUrlState: (state: {
    layers: DetailMapLayerState;
    camera: DetailMapCameraState;
  }) => void;
}

/**
 * Factory instead of a single module-scope store: tests can inject an explicit initial
 * URL state and get an isolated store instance, without depending on window.location or
 * on which order test files happen to import this module.
 */
export function createMapStore(initialUrlState: DashboardUrlState = getInitialDashboardUrlState()) {
  return create<MapState>((set, get) => ({
    dataMode: initialUrlState.dataMode,
    viewMode: initialUrlState.viewMode,
    hoveredCode: null,
    selectedCode: initialUrlState.selectedCode,
    labelsVisible: true,
    roadsVisible: false,
    autoRotate: false,
    reducedMotion: false,
    resetCameraSignal: 0,
    helpSignal: 0,
    insetsChangeSignal: 0,
    detailMapLayers: DEFAULT_DETAIL_MAP_LAYER_STATE,
    detailMapCamera: DEFAULT_DETAIL_MAP_CAMERA,
    setHovered: (hoveredCode) => set({ hoveredCode }),
    select: (selectedCode) =>
      set({
        selectedCode:
          selectedCode && validAdministrativeCodes.has(selectedCode) ? selectedCode : null,
      }),
    toggleLabels: () => set((s) => ({ labelsVisible: !s.labelsVisible })),
    toggleRoads: () => set((s) => ({ roadsVisible: !s.roadsVisible })),
    toggleAutoRotate: () =>
      set((state) => ({ autoRotate: state.reducedMotion ? false : !state.autoRotate })),
    setReducedMotion: (reducedMotion) =>
      set((state) => ({ reducedMotion, autoRotate: reducedMotion ? false : state.autoRotate })),
    changeDataMode: (dataMode) => set({ dataMode, hoveredCode: null }),
    setViewMode: (viewMode) => set({ viewMode, hoveredCode: null, autoRotate: false }),
    applyUrlState: ({ viewMode, dataMode, selectedCode }) =>
      set({ viewMode, dataMode, selectedCode, hoveredCode: null, autoRotate: false }),
    // Bộ đếm tăng dần thay cho window.dispatchEvent: component chỉ cần biết "vừa có yêu cầu mới",
    // không cần payload, nên tăng số là đủ để trigger effect ở nơi lắng nghe.
    requestCameraReset: () => set((state) => ({ resetCameraSignal: state.resetCameraSignal + 1 })),
    requestHelp: () => set((state) => ({ helpSignal: state.helpSignal + 1 })),
    notifyInsetsChanged: () =>
      set((state) => ({ insetsChangeSignal: state.insetsChangeSignal + 1 })),
    setDetailMapBaseMap: (baseMap) =>
      set((state) => ({
        detailMapLayers: {
          ...state.detailMapLayers,
          baseMap,
          terrainVisible: baseMap === 'terrain',
          satelliteVisible: baseMap === 'satellite',
        },
      })),
    toggleDetailMapLayer: (layer) =>
      set((state) => ({
        detailMapLayers: { ...state.detailMapLayers, [layer]: !state.detailMapLayers[layer] },
      })),
    setDetailMapCamera: (camera) => {
      if (camerasApproximatelyEqual(get().detailMapCamera, camera)) return;
      set({ detailMapCamera: camera });
    },
    applyDetailMapUrlState: ({ layers, camera }) =>
      set({ detailMapLayers: layers, detailMapCamera: camera }),
  }));
}

export const useMapStore = createMapStore();
