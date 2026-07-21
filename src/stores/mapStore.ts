import { create } from 'zustand';
import labels from '../assets/maps/daklak/daklak-labels.json';
import { parseDashboardUrl, type DashboardUrlState } from '../utils/dashboardUrl';

const validAdministrativeCodes = new Set(Object.keys(labels));

/** Pure: reads the current URL only when called, never at module-import time. */
export function getInitialDashboardUrlState(): DashboardUrlState {
  return parseDashboardUrl(
    typeof window === 'undefined' ? '' : window.location.search,
    validAdministrativeCodes,
  );
}

export interface MapState {
  dataMode: 'overview' | 'energy' | 'heatmap';
  viewMode: '3d' | 'table';
  hoveredCode: string | null;
  selectedCode: string | null;
  labelsVisible: boolean;
  roadsVisible: boolean;
  autoRotate: boolean;
  reducedMotion: boolean;
  resetCameraSignal: number;
  helpSignal: number;
  insetsChangeSignal: number;
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
}

/**
 * Factory instead of a single module-scope store: tests can inject an explicit initial
 * URL state and get an isolated store instance, without depending on window.location or
 * on which order test files happen to import this module.
 */
export function createMapStore(initialUrlState: DashboardUrlState = getInitialDashboardUrlState()) {
  return create<MapState>((set) => ({
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
  }));
}

export const useMapStore = createMapStore();
