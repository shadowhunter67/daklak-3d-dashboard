import { describe, expect, it } from 'vitest';
import {
  decideDashboardHistoryAction,
  parseDashboardUrl,
  serializeDashboardUrl,
} from './dashboardUrl';

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

describe('decideDashboardHistoryAction', () => {
  const base = { viewMode: '3d', dataMode: 'overview', selectedCode: null } as const;

  it('replaces history when only the selected ward changes', () => {
    const action = decideDashboardHistoryAction(base, { ...base, selectedCode: '24133' });
    expect(action).toBe('replace');
  });

  it('keeps replacing across consecutive ward selections', () => {
    const first = { ...base, selectedCode: '24133' };
    const second = { ...base, selectedCode: '22015' };
    expect(decideDashboardHistoryAction(base, first)).toBe('replace');
    expect(decideDashboardHistoryAction(first, second)).toBe('replace');
  });

  it('pushes history when the view mode changes', () => {
    const action = decideDashboardHistoryAction(base, { ...base, viewMode: 'table' });
    expect(action).toBe('push');
  });

  it('pushes history when the data mode changes', () => {
    const action = decideDashboardHistoryAction(base, { ...base, dataMode: 'energy' });
    expect(action).toBe('push');
  });

  it('pushes history when view/mode and selected ward change together', () => {
    const action = decideDashboardHistoryAction(base, {
      viewMode: 'table',
      dataMode: 'energy',
      selectedCode: '24133',
    });
    expect(action).toBe('push');
  });
});
