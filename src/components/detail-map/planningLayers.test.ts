import { describe, expect, it } from 'vitest';
import {
  buildPlanningFillLayer,
  PLANNING_FILL_LAYER_ID,
  PLANNING_FILL_OPACITY,
  planningFillColorExpression,
} from './planningLayers';
import { WARD_BOUNDARY_SOURCE_ID } from './wardBoundaryLayers';

describe('buildPlanningFillLayer', () => {
  it('is an inert fill on the shared ward-boundaries source (no extra geometry payload)', () => {
    const layer = buildPlanningFillLayer();
    expect(layer.id).toBe(PLANNING_FILL_LAYER_ID);
    expect(layer.type).toBe('fill');
    expect(layer.source).toBe(WARD_BOUNDARY_SOURCE_ID);
    expect(layer.paint?.['fill-opacity']).toBe(0);
  });

  it('the reveal opacity is < 1 so real map detail stays readable through the wash', () => {
    expect(PLANNING_FILL_OPACITY).toBeGreaterThan(0);
    expect(PLANNING_FILL_OPACITY).toBeLessThan(1);
  });
});

describe('planningFillColorExpression', () => {
  it('is a `match` on ward code with a trailing fallback colour', () => {
    const expr = planningFillColorExpression('land-use') as unknown[];
    expect(expr[0]).toBe('match');
    expect(expr[1]).toEqual(['get', 'code']);
    // 'match', ['get','code'], (code,color)*102, fallback  => 2 + 204 + 1
    expect(expr).toHaveLength(207);
    expect(typeof expr[expr.length - 1]).toBe('string');
  });
});
