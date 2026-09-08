/// <reference lib="dom" />
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectNoOverlap } from './layoutAssertions';

/**
 * Automated overlap/overflow regression coverage (accessibility-first upgrade, section AC/F).
 * This project has shipped three real, live-reported overlap bugs this year — a MapLibre CSS
 * cascade collapsing the map canvas, floating map buttons overlapping the fixed header, and
 * header pills wrapping onto a second line and overlapping each other — each caught only by a
 * human screenshot. These tests turn "does element A visually collide with element B" into a
 * machine-checkable assertion across the viewport sizes the product is expected to support,
 * instead of relying on someone noticing.
 *
 * Not exhaustive across every one of the 10 viewports in the full acceptance matrix (that would
 * multiply this file's runtime for marginal extra coverage past a certain point) — a
 * representative spread (320/390/768/1024/1280/1920) covering the smallest supported width, the
 * two responsive breakpoints known to have broken before, and a wide desktop.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem('daklak-dashboard:onboarding-dismissed', 'true'),
  );
});

const VIEWPORTS = [
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
];

test.describe('Executive Overview — no card/panel overlap, no horizontal overflow', () => {
  for (const viewport of VIEWPORTS) {
    test(`at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('./');
      await expect(
        page.getByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' }),
      ).toBeVisible();

      await expectNoHorizontalOverflow(page);

      // The header brand/nav/meta bar must never overlap each other, and the KPI cards must
      // never overlap each other — both are flex/grid layouts that reflow, not fixed-position
      // panels, so any overlap here is a genuine layout bug, not an intentional overlay.
      const kpiValues = page.locator('.kpi-card__value');
      const kpiCount = await kpiValues.count();
      const kpiEntries = await Promise.all(
        Array.from({ length: kpiCount }, async (_, i) => ({
          label: `kpi-card-${i}`,
          locator: kpiValues.nth(i),
        })),
      );
      await expectNoOverlap(kpiEntries);

      await expectNoOverlap([
        { label: 'brand', locator: page.locator('.dashboard-brand') },
        {
          label: 'primary-nav',
          locator: page.getByRole('navigation', { name: 'Điều hướng chính' }),
        },
      ]);
    });
  }
});

test.describe('Detail map — floating panel buttons never overlap the fixed header', () => {
  for (const viewport of VIEWPORTS) {
    test(`at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('./?view=map');
      await page.locator('#detail-map-viewport').waitFor({ state: 'visible' });

      const header = page.locator('header.dashboard-header');
      const sidebarToggle = page.getByRole('button', { name: /Ẩn danh sách|Hiện danh sách/ });
      const layerPanelTrigger = page.getByRole('button', { name: 'Lớp bản đồ', exact: true });

      // Regression test for #133 ("Ẩn/Hiện danh sách" and "Lớp bản đồ" overlapping the header)
      // and #126 (header pills overlapping each other) in one assertion.
      await expectNoOverlap([
        { label: 'header', locator: header },
        { label: 'sidebar-toggle', locator: sidebarToggle },
        { label: 'layer-panel-trigger', locator: layerPanelTrigger },
      ]);

      await expectNoHorizontalOverflow(page);
    });
  }
});

test.describe('Detail map — layer panel content never overlaps the header or spills off-screen', () => {
  test('opening the layer panel keeps its content clear of the header, at 390x844', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./?view=map');
    await page.locator('#detail-map-viewport').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Lớp bản đồ', exact: true }).click();
    const content = page.locator('#detail-map-layer-panel-content');
    await expect(content).toBeVisible();

    await expectNoOverlap([
      { label: 'header', locator: page.locator('header.dashboard-header') },
      { label: 'layer-panel-content', locator: content },
    ]);
    await expectNoHorizontalOverflow(page);
  });

  test('opening the layer panel keeps its content clear of the header, at 1280x800', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('./?view=map');
    await page.locator('#detail-map-viewport').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Lớp bản đồ', exact: true }).click();
    const content = page.locator('#detail-map-layer-panel-content');
    await expect(content).toBeVisible();

    await expectNoOverlap([
      { label: 'header', locator: page.locator('header.dashboard-header') },
      { label: 'layer-panel-content', locator: content },
    ]);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('Font-scale control at its largest step — no new overlap on Executive Overview', () => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ]) {
    test(`at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('./');
      await page.getByRole('button', { name: 'Chữ lớn hơn' }).click();
      await expect(page.getByRole('button', { name: 'Chữ lớn hơn' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      await expectNoHorizontalOverflow(page);

      const kpiValues = page.locator('.kpi-card__value');
      const kpiCount = await kpiValues.count();
      const kpiEntries = await Promise.all(
        Array.from({ length: kpiCount }, async (_, i) => ({
          label: `kpi-card-${i}`,
          locator: kpiValues.nth(i),
        })),
      );
      await expectNoOverlap(kpiEntries);
    });
  }
});

/**
 * `.executive-overview > *` caps the page at 1600px and centres it with auto side margins. A child
 * rule that sets its vertical margins with the `margin` SHORTHAND silently resets those side
 * margins to 0, dropping that child out of the centred column while its siblings stay in it — the
 * page then renders as two misaligned groups. It shipped that way: the heading, hero, illustrative
 * notice and effective-date line sat 80px left of the KPI row and every panel below it.
 *
 * Only reproducible above ~1724px (the 1600px cap plus 2 x 3.3vw padding). Below that the cap
 * never binds and every child lands on the same edge, which is why the 1280px coverage — and even
 * the 1920px overlap/overflow check above, which asserts neither alignment nor edges — stayed
 * green the whole time.
 */
test.describe('Executive Overview — the capped content column stays on one left edge', () => {
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ]) {
    test(`at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('./');
      await expect(
        page.getByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' }),
      ).toBeVisible();

      const edges = await page.locator('.executive-overview').evaluate((root) =>
        [...root.children]
          .filter((el) => el.getBoundingClientRect().height > 0)
          .map((el) => ({
            name: el.tagName.toLowerCase() + (el.className ? `.${el.className}` : ''),
            left: Math.round(el.getBoundingClientRect().left),
          })),
      );

      // Guards against the assertion passing vacuously if the section ever stops rendering.
      expect(edges.length).toBeGreaterThan(3);

      const distinct = [...new Set(edges.map((edge) => edge.left))];
      expect(
        distinct,
        `expected one shared left edge, found ${distinct.length}: ${edges
          .map((edge) => `${edge.name}@${edge.left}`)
          .join(' | ')}`,
      ).toHaveLength(1);
    });
  }
});
