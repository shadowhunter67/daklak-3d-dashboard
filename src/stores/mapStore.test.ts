import { beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from './mapStore';
describe('map interaction state', () => {
  beforeEach(() =>
    useMapStore.setState({ hoveredCode: null, selectedCode: null, labelsVisible: true }),
  );
  it('selects by stable code', () => {
    useMapStore.getState().select('22015');
    expect(useMapStore.getState().selectedCode).toBe('22015');
  });
  it('toggles labels', () => {
    useMapStore.getState().toggleLabels();
    expect(useMapStore.getState().labelsVisible).toBe(false);
  });
});
