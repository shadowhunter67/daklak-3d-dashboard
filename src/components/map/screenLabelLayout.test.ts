import { describe, expect, it } from 'vitest';
import labels from '#province-assets/daklak-labels.json';
import { layoutScreenLabels, type ScreenLabelAnchor } from './screenLabelLayout';

type Viewport = { width: number; height: number };

/** Real 102 names projected into a viewport the way a top-down fit of the province would. */
function anchorsFor(viewport: Viewport, selected: string | null = null): ScreenLabelAnchor[] {
  const padX = viewport.width * 0.08;
  const padY = viewport.height * 0.1;
  return Object.entries(labels).map(([code, label]) => ({
    code,
    name: label.name,
    x: padX + ((label.longitude - 107.48) / 1.98) * (viewport.width - 2 * padX),
    y: padY + ((13.7 - label.latitude) / 1.54) * (viewport.height - 2 * padY),
    priority: label.priority,
    emphasized: code === selected,
  }));
}

const VIEWPORTS: Viewport[] = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
];

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2
  );
}

describe('3D screen-space label layout', () => {
  for (const viewport of VIEWPORTS) {
    for (const scale of [1, 1.5]) {
      it(`places exactly the 102 names at ${viewport.width}x${viewport.height}, text x${scale}`, () => {
        const placed = layoutScreenLabels(anchorsFor(viewport), viewport, { fontSize: 13 * scale });
        expect(placed).toHaveLength(102);
        expect(new Set(placed.map((label) => label.code)).size).toBe(102);
        for (const label of placed) {
          if (
            label.anchorX >= 0 &&
            label.anchorX <= viewport.width &&
            label.anchorY >= 0 &&
            label.anchorY <= viewport.height
          ) {
            expect(label.x - label.width / 2).toBeGreaterThanOrEqual(0);
            expect(label.x + label.width / 2).toBeLessThanOrEqual(viewport.width + 0.01);
            expect(label.y - label.height / 2).toBeGreaterThanOrEqual(0);
            expect(label.y + label.height / 2).toBeLessThanOrEqual(viewport.height + 0.01);
          }
        }
      });
    }
  }

  it('is deterministic', () => {
    const viewport = { width: 1280, height: 720 };
    const first = layoutScreenLabels(anchorsFor(viewport), viewport, { fontSize: 13 });
    const second = layoutScreenLabels(anchorsFor(viewport), viewport, { fontSize: 13 });
    expect(second).toEqual(first);
  });

  it('keeps the selected ward at its own anchor', () => {
    const viewport = { width: 1280, height: 720 };
    const code = Object.keys(labels)[10];
    const placed = layoutScreenLabels(anchorsFor(viewport, code), viewport, { fontSize: 13 });
    const selected = placed.find((label) => label.code === code)!;
    expect(selected.displaced).toBe(false);
  });

  it('leaves most labels clear of each other at a roomy desktop size', () => {
    const viewport = { width: 1920, height: 1080 };
    const placed = layoutScreenLabels(anchorsFor(viewport), viewport, { fontSize: 13 });
    let overlapping = 0;
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        if (overlaps(placed[i], placed[j])) overlapping += 1;
      }
    }
    expect(overlapping).toBeLessThan(6);
  });

  it('marks displaced labels exactly when they moved off their anchor', () => {
    const viewport = { width: 1280, height: 720 };
    const placed = layoutScreenLabels(anchorsFor(viewport), viewport, { fontSize: 13 });
    expect(placed.some((label) => label.displaced)).toBe(true);
    for (const label of placed) {
      expect(label.displaced).toBe(
        Math.abs(label.x - label.anchorX) > 0.5 || Math.abs(label.y - label.anchorY) > 0.5,
      );
    }
  });
});
