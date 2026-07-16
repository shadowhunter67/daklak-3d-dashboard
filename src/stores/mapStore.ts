import { create } from 'zustand';
interface MapState {
  hoveredCode: string | null;
  selectedCode: string | null;
  labelsVisible: boolean;
  setHovered: (code: string | null) => void;
  select: (code: string | null) => void;
  toggleLabels: () => void;
}
export const useMapStore = create<MapState>((set) => ({
  hoveredCode: null,
  selectedCode: null,
  labelsVisible: true,
  setHovered: (hoveredCode) => set({ hoveredCode }),
  select: (selectedCode) => set({ selectedCode }),
  toggleLabels: () => set((s) => ({ labelsVisible: !s.labelsVisible })),
}));
