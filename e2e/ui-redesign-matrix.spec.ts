/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoHorizontalOverflow } from './layoutAssertions';

/**
 * Responsive / zoom matrix for the redesigned routes (upgrade pack §15–16). For each route and
 * viewport it asserts, from real bounding boxes:
 *  - no document-level horizontal overflow;
 *  - no two sibling cards of the same grid overlap;
 *  - header controls, sidebar toggle and search stay inside the viewport and never collide;
 *  - 102 ward labels exist on the 3D overlay;
 *  - no serious axe violations.
 * 200% zoom is emulated by halving the CSS viewport (same layout the browser produces).
 */

const WIDTHS = [320, 360, 390, 430, 768, 1024, 1280, 1366, 1440, 1920];
const HEIGHT = 900;

const ROUTES: Array<{ name: string; url: string; ready: string }> = [
  { name: 'overview', url: './', ready: '#executive-overview' },
  { name: 'projects', url: './#/projects', ready: '.project-portfolio' },
  { name: 'data trust', url: './#/data-readiness', ready: '.data-readiness' },
  { name: 'reports', url: './#/reports', ready: '.reports-view' },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem('daklak-dashboard:onboarding-dismissed', 'true'),
  );
});

interface Box {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Direct children of every grid/flex card row under `root` must not overlap each other. */
async function siblingOverlaps(page: Page, rootSelector: string): Promise<string[]> {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) return [`missing ${selector}`];
    const collisions: string[] = [];
    const containers = [root, ...root.querySelectorAll('*')].filter((element) => {
      const display = getComputedStyle(element).display;
      return display === 'grid' || display === 'flex';
    });
    for (const container of containers) {
      const children = [...container.children].filter((child) => {
        const style = getComputedStyle(child);
        const rect = child.getBoundingClientRect();
        return (
          rect.width > 4 &&
          rect.height > 4 &&
          style.position !== 'absolute' &&
          style.position !== 'fixed' &&
          style.display !== 'none'
        );
      });
      for (let i = 0; i < children.length; i += 1) {
        for (let j = i + 1; j < children.length; j += 1) {
          const a = children[i].getBoundingClientRect();
          const b = children[j].getBoundingClientRect();
          const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (width > 3 && height > 3) {
            collisions.push(
              `${(children[i] as HTMLElement).className} x ${(children[j] as HTMLElement).className} (${Math.round(width)}x${Math.round(height)})`,
            );
          }
        }
      }
    }
    return collisions;
  }, rootSelector);
}

async function chromeBoxes(page: Page): Promise<Box[]> {
  return page.evaluate(() => {
    const pick = (label: string, selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return null;
      return { label, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    return [
      pick('menu button', '.topbar-menu-button'),
      pick('search', '.global-search'),
      pick('topbar actions', '.topbar-actions'),
    ].filter((box): box is NonNullable<typeof box> => box !== null);
  });
}

test.describe('redesigned routes — viewport matrix', () => {
  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      test(`${route.name} at ${width}px: no overflow, no card overlap, chrome in bounds`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: HEIGHT });
        await page.goto(route.url);
        await page.locator(route.ready).waitFor({ state: 'visible', timeout: 20_000 });
        await page.waitForTimeout(400);

        await expectNoHorizontalOverflow(page);
        expect(await siblingOverlaps(page, route.ready)).toEqual([]);

        const boxes = await chromeBoxes(page);
        for (const box of boxes) {
          expect(box.x, `${box.label} left edge`).toBeGreaterThanOrEqual(-1);
          expect(box.x + box.width, `${box.label} right edge`).toBeLessThanOrEqual(width + 1);
        }
        for (let i = 0; i < boxes.length; i += 1) {
          for (let j = i + 1; j < boxes.length; j += 1) {
            const a = boxes[i];
            const b = boxes[j];
            const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
            const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
            expect(
              overlapX > 2 && overlapY > 2,
              `${a.label} overlaps ${b.label} at ${width}px`,
            ).toBe(false);
          }
        }
      });
    }
  }
});

test.describe('200% zoom (emulated as a half-width viewport)', () => {
  for (const [label, width] of [
    ['1280 @200%', 640],
    ['1920 @200%', 960],
  ] as const) {
    for (const route of ROUTES) {
      test(`${route.name} ${label}: reflows without overflow or overlap`, async ({ page }) => {
        await page.setViewportSize({ width, height: 450 });
        await page.goto(route.url);
        await page.locator(route.ready).waitFor({ state: 'visible', timeout: 20_000 });
        await page.waitForTimeout(400);
        await expectNoHorizontalOverflow(page);
        expect(await siblingOverlaps(page, route.ready)).toEqual([]);
      });
    }
  }
});

test.describe('102 ward names are always present', () => {
  test('3D overlay renders 102 labels, none removed by collisions', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./?view=3d');
    const overlay = page.getByTestId('screen-labels-3d');
    await overlay.waitFor({ state: 'attached', timeout: 30_000 });
    await expect(overlay.locator('.screen-labels__label')).toHaveCount(102);
    // Every label is positioned (transform applied) once the first frame has run.
    await expect
      .poll(
        async () =>
          overlay
            .locator('.screen-labels__label')
            .evaluateAll(
              (nodes) => nodes.filter((node) => (node as HTMLElement).style.transform).length,
            ),
        { timeout: 20_000 },
      )
      .toBe(102);
  });

  test('Overview map draws all 102 names', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./');
    await expect(page.locator('.overview-workspace__map-labels text')).toHaveCount(102);
  });
});

test.describe('redesigned routes — accessibility', () => {
  for (const route of ROUTES) {
    test(`${route.name} has no serious axe violations (light and dark)`, async ({ page }) => {
      for (const theme of ['light', 'dark'] as const) {
        await page.addInitScript((value) => {
          window.localStorage.setItem('daklak-dashboard.theme', value);
        }, theme);
        await page.setViewportSize({ width: 1440, height: HEIGHT });
        await page.goto(route.url);
        await page.locator(route.ready).waitFor({ state: 'visible', timeout: 20_000 });
        const results = await new AxeBuilder({ page }).analyze();
        expect(
          results.violations
            .filter(({ impact }) => impact === 'critical' || impact === 'serious')
            .map(({ id, nodes }) => `${theme}: ${id} (${nodes.length})`),
        ).toEqual([]);
      }
    });
  }
});
