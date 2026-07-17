import { create } from 'zustand';
import labels from '../assets/maps/daklak/daklak-labels.json';
import { parseDashboardUrl, type DashboardUrlState } from '../utils/dashboardUrl';

const validAdministrativeCodes = new Set(Object.keys(labels));
const initialUrlState = parseDashboardUrl(
  typeof window === 'undefined' ? '' : window.location.search,
  validAdministrativeCodes,
);
export interface MapState {
  dataMode: 'overview' | 'energy' | 'heatmap';
  viewMode: '3d' | 'table';
  hoveredCode: string | null;
  selectedCode: string | null;
  labelsVisible: boolean;
  roadsVisible: boolean;
  autoRotate: boolean;
  reducedMotion: boolean;
  setHovered: (code: string | null) => void;
  select: (code: string | null) => void;
  toggleLabels: () => void;
  toggleRoads: () => void;
  toggleAutoRotate: () => void;
  setReducedMotion: (reduced: boolean) => void;
  changeDataMode: (mode: MapState['dataMode']) => void;
  setViewMode: (mode: MapState['viewMode']) => void;
  applyUrlState: (state: DashboardUrlState) => void;
}
export const useMapStore = create<MapState>((set) => ({
  dataMode: initialUrlState.dataMode,
  viewMode: initialUrlState.viewMode,
  hoveredCode: null,
  selectedCode: initialUrlState.selectedCode,
  labelsVisible: true,
  roadsVisible: false,
  autoRotate: false,
  reducedMotion: false,
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
}));
