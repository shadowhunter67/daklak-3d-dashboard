/// <reference lib="dom" />
import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Shared layout-regression helpers (section AC of the accessibility-first upgrade — "tuyệt đối
 * không được có card/panel đè lên nhau" is a hard requirement, not a nice-to-have). This project
 * has shipped at least three real overlap bugs live before an automated check existed for any of
 * them:
 *  - the detail-map canvas collapsing to 0 height behind maplibre-gl.css's cascade (#130)
 *  - the "Ẩn/Hiện danh sách" and "Lớp bản đồ" floating buttons overlapping the fixed header (#133)
 *  - header pills wrapping onto two lines and visually overlapping each other (#126)
 * Each was only caught by a live screenshot a human happened to look at. These helpers turn "does
 * this rectangle overlap that one" into an assertion any test can make, instead of relying on eyes.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rectOverlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (width <= 0 || height <= 0) return 0;
  return width * height;
}

/**
 * Fails the test if any two of `locators` (all must be visible) overlap by more than a couple of
 * pixels — a small epsilon absorbs shared 1px borders/hairline shadows between deliberately
 * adjacent elements without letting a real overlap slip through. Give each locator a human label
 * (matching its order) so a failure names which two elements collided instead of just printing
 * coordinates.
 */
export async function expectNoOverlap(
  entries: ReadonlyArray<{ label: string; locator: Locator }>,
  options: { epsilonPx?: number } = {},
): Promise<void> {
  const epsilon = options.epsilonPx ?? 2;
  const rects: Array<{ label: string; rect: Rect }> = [];
  for (const { label, locator } of entries) {
    if (!(await locator.isVisible())) continue; // not every control is visible in every mode/viewport
    const box = await locator.boundingBox();
    if (!box) continue;
    rects.push({ label, rect: box });
  }

  const collisions: string[] = [];
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const overlapArea = rectOverlapArea(rects[i].rect, rects[j].rect);
      if (overlapArea > epsilon * epsilon) {
        collisions.push(
          `"${rects[i].label}" overlaps "${rects[j].label}" (${Math.round(overlapArea)}px² shared area)`,
        );
      }
    }
  }
  expect(collisions, collisions.join('\n')).toEqual([]);
}

/** The exact `scrollWidth > clientWidth` check already used ad hoc across `dashboard.spec.ts` —
 * centralized here so new tests don't re-derive it slightly differently each time. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(
    hasOverflow,
    'page has horizontal overflow (document.documentElement.scrollWidth > clientWidth)',
  ).toBe(false);
}
