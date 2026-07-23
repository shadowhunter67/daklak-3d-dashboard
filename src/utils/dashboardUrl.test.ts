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
  it('falls back to Executive Overview for invalid values (Phase 2A default landing)', () => {
    expect(parseDashboardUrl('?view=street-view&mode=bad&ward=99999', codes)).toEqual({
      viewMode: 'overview',
      dataMode: 'overview',
      selectedCode: null,
    });
  });
  it('defaults to Executive Overview when there is no view param at all', () => {
    expect(parseDashboardUrl('', codes)).toEqual({
      viewMode: 'overview',
      dataMode: 'overview',
      selectedCode: null,
    });
  });
  it('resolves the explicit canonical view=overview the same as no param', () => {
    expect(parseDashboardUrl('?view=overview', codes)).toEqual({
      viewMode: 'overview',
      dataMode: 'overview',
      selectedCode: null,
    });
  });
  it('still resolves ?view=3d to the 3D experience (backward compatibility)', () => {
    expect(parseDashboardUrl('?view=3d', codes).viewMode).toBe('3d');
  });
  it('parses the detail-map view mode (view=map), added for the MapLibre detail map', () => {
    expect(parseDashboardUrl('?view=map&mode=overview&ward=24133', codes)).toEqual({
      viewMode: 'map',
      dataMode: 'overview',
      selectedCode: '24133',
    });
  });
  it('serializes only canonical dashboard parameters', () => {
    expect(
      serializeDashboardUrl({ viewMode: '3d', dataMode: 'heatmap', selectedCode: '24133' }),
    ).toBe('?view=3d&mode=heatmap&ward=24133');
  });
  it('serializes the detail-map view mode as view=map', () => {
    expect(
      serializeDashboardUrl({ viewMode: 'map', dataMode: 'overview', selectedCode: null }),
    ).toBe('?view=map&mode=overview');
  });
  it('serializes Executive Overview as the canonical view=overview', () => {
    expect(
      serializeDashboardUrl({ viewMode: 'overview', dataMode: 'overview', selectedCode: null }),
    ).toBe('?view=overview&mode=overview');
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

  it('pushes history when switching to the detail-map experience', () => {
    const action = decideDashboardHistoryAction(base, { ...base, viewMode: 'map' });
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
