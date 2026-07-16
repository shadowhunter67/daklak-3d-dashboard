import { describe, expect, it } from 'vitest';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { featureAt } from './geometryHitTest';

describe('administrative geometry hit testing', () => {
  it.each(['24133', '22015'])('resolves representative point for unit %s', (code) => {
    const label = labels[code as keyof typeof labels];
    expect(featureAt([label.longitude, label.latitude])?.properties.code).toBe(code);
  });

  it('resolves every generated label inside its administrative unit', () => {
    for (const [code, label] of Object.entries(labels)) {
      expect(featureAt([label.longitude, label.latitude])?.properties.code).toBe(code);
    }
  });

  it('keeps 1,000 representative hit tests within the interaction budget', () => {
    const points = Object.values(labels);
    const started = performance.now();
    for (let index = 0; index < 1_000; index += 1) {
      const label = points[index % points.length];
      featureAt([label.longitude, label.latitude]);
    }
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  it('returns undefined outside the province', () => {
    expect(featureAt([105.8, 21.0])).toBeUndefined();
  });
});
