import { create } from 'zustand';
interface MapState {
  dataMode: 'overview' | 'energy' | 'heatmap';
  hoveredCode: string | null;
  selectedCode: string | null;
  labelsVisible: boolean;
  autoRotate: boolean;
  setHovered: (code: string | null) => void;
  select: (code: string | null) => void;
  toggleLabels: () => void;
  toggleAutoRotate: () => void;
  setDataMode: (mode: MapState['dataMode']) => void;
}
export const useMapStore = create<MapState>((set) => ({
  dataMode: 'overview',
  hoveredCode: null,
  selectedCode: null,
  labelsVisible: true,
  autoRotate: false,
  setHovered: (hoveredCode) => set({ hoveredCode }),
  select: (selectedCode) => set({ selectedCode }),
  toggleLabels: () => set((s) => ({ labelsVisible: !s.labelsVisible })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  setDataMode: (dataMode) => set({ dataMode }),
}));
