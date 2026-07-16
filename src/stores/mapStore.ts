import { create } from 'zustand';
import labels from '../assets/maps/daklak/daklak-labels.json';

const validAdministrativeCodes = new Set(Object.keys(labels));
const initialViewMode =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view') === '2d'
    ? 'table'
    : '3d';
interface MapState {
  dataMode: 'overview' | 'energy' | 'heatmap';
  viewMode: '3d' | 'table';
  hoveredCode: string | null;
  selectedCode: string | null;
  labelsVisible: boolean;
  autoRotate: boolean;
  reducedMotion: boolean;
  setHovered: (code: string | null) => void;
  select: (code: string | null) => void;
  toggleLabels: () => void;
  toggleAutoRotate: () => void;
  setReducedMotion: (reduced: boolean) => void;
  changeDataMode: (mode: MapState['dataMode']) => void;
  setViewMode: (mode: MapState['viewMode']) => void;
}
export const useMapStore = create<MapState>((set) => ({
  dataMode: 'overview',
  viewMode: initialViewMode,
  hoveredCode: null,
  selectedCode: null,
  labelsVisible: true,
  autoRotate: false,
  reducedMotion: false,
  setHovered: (hoveredCode) => set({ hoveredCode }),
  select: (selectedCode) =>
    set({
      selectedCode:
        selectedCode && validAdministrativeCodes.has(selectedCode) ? selectedCode : null,
    }),
  toggleLabels: () => set((s) => ({ labelsVisible: !s.labelsVisible })),
  toggleAutoRotate: () =>
    set((state) => ({ autoRotate: state.reducedMotion ? false : !state.autoRotate })),
  setReducedMotion: (reducedMotion) =>
    set((state) => ({ reducedMotion, autoRotate: reducedMotion ? false : state.autoRotate })),
  changeDataMode: (dataMode) => set({ dataMode, hoveredCode: null }),
  setViewMode: (viewMode) => set({ viewMode, hoveredCode: null, autoRotate: false }),
}));
