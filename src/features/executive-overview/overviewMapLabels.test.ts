import { describe, expect, it } from 'vitest';
import labels from '#province-assets/daklak-labels.json';
import { layoutOverviewLabels, OVERVIEW_LABEL_FONT_SIZE } from './overviewMapLabels';

const inputs = Object.entries(labels).map(([code, label], index) => ({
  code,
  name: label.name,
  // Deterministic synthetic projection into a 640 x 560 box (the test only needs a dense cluster).
  x: 20 + ((label.longitude - 107.48) / 1.98) * 600,
  y: 20 + ((13.7 - label.latitude) / 1.54) * 520,
  priority: label.priority + (index % 1),
}));

describe('overview map labels', () => {
  it('places exactly the 102 real names, none dropped or duplicated', () => {
    const placed = layoutOverviewLabels(inputs);
    expect(placed).toHaveLength(102);
    expect(new Set(placed.map((label) => label.code)).size).toBe(102);
    expect(placed.map((label) => label.name)).toEqual(inputs.map((label) => label.name));
  });

  it('is deterministic', () => {
    expect(layoutOverviewLabels(inputs)).toEqual(layoutOverviewLabels(inputs));
  });

  it('keeps residual overlap small after displacement', () => {
    const placed = layoutOverviewLabels(inputs);
    const box = (label: (typeof placed)[number]) => ({
      left: label.x - (label.name.length * 0.6 * OVERVIEW_LABEL_FONT_SIZE) / 2,
      right: label.x + (label.name.length * 0.6 * OVERVIEW_LABEL_FONT_SIZE) / 2,
      top: label.y - (OVERVIEW_LABEL_FONT_SIZE * 1.3) / 2,
      bottom: label.y + (OVERVIEW_LABEL_FONT_SIZE * 1.3) / 2,
    });
    let overlapping = 0;
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = box(placed[i]);
        const b = box(placed[j]);
        if (
          Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
          Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)
        )
          overlapping += 1;
      }
    }
    // The engine never drops a label; a few unavoidable overlaps in the densest cluster are
    // tolerated, but most labels must end up clear of each other.
    expect(overlapping).toBeLessThan(10);
  });

  it('marks displaced labels so a leader line can be drawn', () => {
    const placed = layoutOverviewLabels(inputs);
    expect(placed.some((label) => label.displaced)).toBe(true);
    for (const label of placed) {
      expect(label.displaced).toBe(label.x !== label.anchorX || label.y !== label.anchorY);
    }
  });
});
