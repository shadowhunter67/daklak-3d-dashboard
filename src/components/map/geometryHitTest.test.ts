import { describe, expect, it } from 'vitest';
import labels from '../../assets/maps/daklak/daklak-labels.json';
import { featureAt } from './geometryHitTest';

describe('administrative geometry hit testing', () => {
  it.each(['24133', '22015'])('resolves representative point for unit %s', (code) => {
    const label = labels[code as keyof typeof labels];
    expect(featureAt([label.longitude, label.latitude])?.properties.code).toBe(code);
  });

  it('returns undefined outside the province', () => {
    expect(featureAt([105.8, 21.0])).toBeUndefined();
  });
});
