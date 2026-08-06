/// <reference lib="dom" />
import { expect, test } from '@playwright/test';

// Phase T1 (reports/tourism-digital-twin/) — `?view=world`, "Khám phá Đắk Lắk 3D". Smoke coverage
// proving: the route lazy-loads its own chunk, it doesn't leak into other routes' bundles, and the
// illustrative scene renders without console/runtime errors. Same production-build-only pattern as
// the existing chunk-isolation tests in dashboard.spec.ts (`test.skip(!process.env.E2E_PRODUCTION, …)`).
test.describe('world exploration (Phase T1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      window.localStorage.setItem('daklak-dashboard:onboarding-dismissed', 'true'),
    );
  });

  test('does not load the world-exploration chunk when starting on Executive Overview', async ({
    page,
  }) => {
    test.skip(!process.env.E2E_PRODUCTION, 'Chunk assertions require the production build');
    const responses: string[] = [];
    page.on('response', (response) => responses.push(response.url()));
    await page.goto('./?view=overview');
    await expect(
      page.getByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' }),
    ).toBeVisible();
    expect(responses.some((url) => /\/assets\/WorldExplorationView-.*\.js/.test(url))).toBe(false);
  });

  test('does not load the world-exploration chunk from the existing 3D/2D/map routes', async ({
    page,
  }) => {
    test.skip(!process.env.E2E_PRODUCTION, 'Chunk assertions require the production build');
    for (const view of ['3d', '2d', 'map']) {
      const responses: string[] = [];
      page.on('response', (response) => responses.push(response.url()));
      await page.goto(`./?view=${view}`);
      await page.waitForTimeout(300);
      expect(
        responses.some((url) => /\/assets\/WorldExplorationView-.*\.js/.test(url)),
        `?view=${view} must not load the world-exploration chunk`,
      ).toBe(false);
    }
  });

  test('lazy-loads its own chunk and renders the illustrative scene without console/runtime errors', async ({
    page,
  }) => {
    const runtimeErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      // Google Analytics/Tag Manager beacons reach a real external host and are blocked by CSP
      // or fail in this offline/sandboxed test environment — a network-availability artifact, not
      // an app defect. Same exclusion as dashboard.spec.ts's `failedRequests` filter.
      if (/google-analytics\.com|googletagmanager\.com/.test(message.text())) return;
      consoleErrors.push(message.text());
    });
    const responses: string[] = [];
    page.on('response', (response) => responses.push(response.url()));

    await page.goto('./?view=world');

    await expect(page.getByLabel('Khám phá Đắk Lắk 3D — kịch bản minh họa')).toBeVisible();
    await expect(page.getByText('ILLUSTRATIVE — KỊCH BẢN MINH HỌA')).toBeVisible();
    // The title/tagline caption reuses `.map-caption` (see WorldExplorationView.tsx), which the
    // app's existing CSS already hides at narrow/mobile-portrait widths (global.css, the same
    // `max-width: 767px` rule the existing `3d` view's caption is subject to) — so only assert its
    // visibility on a wide-enough viewport, matching real, pre-existing app behavior rather than
    // asserting a viewport-invariant UI that was never actually true for `.map-caption`.
    const viewportWidth = page.viewportSize()?.width ?? 1280;
    if (viewportWidth > 767) {
      await expect(page.getByText('Khám phá Đắk Lắk 3D', { exact: true })).toBeVisible();
    }

    if (process.env.E2E_PRODUCTION) {
      await expect
        .poll(() => responses.some((url) => /\/assets\/WorldExplorationView-.*\.js/.test(url)))
        .toBe(true);
    }

    // A canvas mounts only once the terrain textures resolve (React Suspense boundary around
    // useTexture — same load as the existing 3D view) and only when the browser actually supports
    // WebGL (Playwright's Chromium does via SwiftShader); on an unsupported environment the
    // documented MapFallback renders instead. Either outcome is a legitimate pass, but at least
    // one of the two must show up — poll rather than a single snapshot-timed check.
    await expect
      .poll(
        async () =>
          (await page.locator('#world-viewport canvas').isVisible()) ||
          (await page
            .getByText(/không hỗ trợ WebGL nên không thể hiển thị cảnh 3D minh họa/)
            .isVisible()),
        { timeout: 15_000 },
      )
      .toBe(true);

    expect(runtimeErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('restores ?view=world via the shareable URL / dashboard URL sync', async ({ page }) => {
    await page.goto('./?view=world&mode=overview');
    await expect(page.getByLabel('Khám phá Đắk Lắk 3D — kịch bản minh họa')).toBeVisible();
    await expect(page).toHaveURL(/view=world/);
  });
});

// Deliberately its own describe block, with NO `localStorage` pre-seeding of
// `daklak-dashboard:onboarding-dismissed` — every test above (and dashboard.spec.ts's own
// beforeEach) seeds that flag before navigating, which is exactly why a real bug shipped past that
// suite: a genuinely first-time visitor (fresh profile, nothing in localStorage) landing on
// `?view=world` got the *existing* `3d`/admin-boundary view's onboarding dialog
// (`OnboardingOverlay.tsx`, heading "102 xã, phường trong một bản đồ tương tác") auto-popped on top
// of the world scene — copy that describes the wrong view's gestures and admin-boundary concept
// entirely. Root cause: `OnboardingOverlay` is a single global overlay (rendered unconditionally in
// App.tsx) whose auto-open condition was `viewMode !== 'overview'` — true for `'world'` too, since
// `'overview'` was the only viewMode ever excluded. Fixed in `OnboardingOverlay.tsx` by also
// excluding `'world'` from both the auto-open condition and the manual "?" help-triggered open
// (`src/components/layout/OnboardingOverlay.tsx`) — this describe block is what would have caught
// it, and is what proves the fix.
test.describe('world exploration — first-time visitor, no pre-existing onboarding state', () => {
  test('does not show the 3D/admin-boundary onboarding dialog on a fresh visit to ?view=world', async ({
    page,
  }) => {
    await page.goto('./?view=world');
    await expect(page.getByLabel('Khám phá Đắk Lắk 3D — kịch bản minh họa')).toBeVisible();
    await expect(
      page.getByRole('dialog', { name: /102 xã, phường trong một bản đồ tương tác/ }),
    ).not.toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('does not show the 3D/admin-boundary onboarding dialog on ?view=world even via the manual help control', async ({
    page,
  }) => {
    await page.goto('./?view=world');
    await expect(page.getByLabel('Khám phá Đắk Lắk 3D — kịch bản minh họa')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Mở hướng dẫn sử dụng' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('sanity check: the same fresh profile still gets the onboarding dialog on the existing 3D view (proves the fix is scoped, not a global suppression)', async ({
    page,
  }) => {
    await page.goto('./?view=3d');
    await expect(
      page.getByRole('dialog', { name: /102 xã, phường trong một bản đồ tương tác/ }),
    ).toBeVisible();
  });
});
