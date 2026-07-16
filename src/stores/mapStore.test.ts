import { beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from './mapStore';
describe('map interaction state', () => {
  beforeEach(() =>
    useMapStore.setState({
      hoveredCode: null,
      selectedCode: null,
      labelsVisible: true,
      autoRotate: false,
      dataMode: 'overview',
      viewMode: '3d',
    }),
  );
  it('selects by stable code', () => {
    useMapStore.getState().select('22015');
    expect(useMapStore.getState().selectedCode).toBe('22015');
  });
  it('toggles labels', () => {
    useMapStore.getState().toggleLabels();
    expect(useMapStore.getState().labelsVisible).toBe(false);
  });
  it('toggles 360 degree auto rotation', () => {
    useMapStore.getState().toggleAutoRotate();
    expect(useMapStore.getState().autoRotate).toBe(true);
  });
  it('switches thematic data mode', () => {
    useMapStore.getState().changeDataMode('energy');
    expect(useMapStore.getState().dataMode).toBe('energy');
  });
  it('preserves selection but clears transient hover when mode changes', () => {
    useMapStore.setState({ selectedCode: '22015', hoveredCode: '22045' });
    useMapStore.getState().changeDataMode('heatmap');
    expect(useMapStore.getState().selectedCode).toBe('22015');
    expect(useMapStore.getState().hoveredCode).toBeNull();
  });
  it('stops animation when switching to the accessible table', () => {
    useMapStore.setState({ autoRotate: true });
    useMapStore.getState().setViewMode('table');
    expect(useMapStore.getState().viewMode).toBe('table');
    expect(useMapStore.getState().autoRotate).toBe(false);
  });
});
