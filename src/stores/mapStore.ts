import { create } from 'zustand';
interface MapState {
  dataMode: 'overview' | 'energy' | 'heatmap';
  viewMode: '3d' | 'table';
  hoveredCode: string | null;
  selectedCode: string | null;
  labelsVisible: boolean;
  autoRotate: boolean;
  setHovered: (code: string | null) => void;
  select: (code: string | null) => void;
  toggleLabels: () => void;
  toggleAutoRotate: () => void;
  changeDataMode: (mode: MapState['dataMode']) => void;
  setViewMode: (mode: MapState['viewMode']) => void;
}
export const useMapStore = create<MapState>((set) => ({
  dataMode: 'overview',
  viewMode: '3d',
  hoveredCode: null,
  selectedCode: null,
  labelsVisible: true,
  autoRotate: false,
  setHovered: (hoveredCode) => set({ hoveredCode }),
  select: (selectedCode) => set({ selectedCode }),
  toggleLabels: () => set((s) => ({ labelsVisible: !s.labelsVisible })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  changeDataMode: (dataMode) => set({ dataMode, hoveredCode: null }),
  setViewMode: (viewMode) => set({ viewMode, hoveredCode: null, autoRotate: false }),
}));
