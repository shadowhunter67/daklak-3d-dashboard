import { describe, expect, it } from 'vitest';
import { layoutMapLabels } from './labelLayout';

describe('layoutMapLabels', () => {
  it('removes collisions but always keeps emphasized labels', () => {
    const labels = layoutMapLabels(
      [
        { id: 'first', text: 'First', point: [20, 20], priority: 1 },
        { id: 'overlap', text: 'Overlap', point: [21, 20], priority: 2 },
        { id: 'selected', text: 'Selected', point: [22, 20], priority: 2, emphasized: true },
        { id: 'clear', text: 'Clear', point: [200, 200], priority: 2 },
      ],
      10,
    );
    expect(labels.map(({ id }) => id)).toEqual(['selected', 'clear']);
  });

  it('respects the label budget', () => {
    const labels = layoutMapLabels(
      Array.from({ length: 8 }, (_, index) => ({
        id: String(index),
        text: String(index),
        point: [index * 50, 20] as [number, number],
        priority: 1,
      })),
      3,
    );
    expect(labels).toHaveLength(3);
  });
});
