import { describe, expect, it } from 'vitest';
import { parseDashboardUrl, serializeDashboardUrl } from './dashboardUrl';

const codes = new Set(['24133']);

describe('dashboard URL state', () => {
  it('parses a valid shareable state', () => {
    expect(parseDashboardUrl('?view=2d&mode=energy&ward=24133', codes)).toEqual({
      viewMode: 'table',
      dataMode: 'energy',
      selectedCode: '24133',
    });
  });
  it('falls back safely for invalid values', () => {
    expect(parseDashboardUrl('?view=map&mode=bad&ward=99999', codes)).toEqual({
      viewMode: '3d',
      dataMode: 'overview',
      selectedCode: null,
    });
  });
  it('serializes only canonical dashboard parameters', () => {
    expect(
      serializeDashboardUrl({ viewMode: '3d', dataMode: 'heatmap', selectedCode: '24133' }),
    ).toBe('?view=3d&mode=heatmap&ward=24133');
  });
});
