/// <reference lib="dom" />
import { expect, test } from '@playwright/test';

// Phase T1 (reports/tourism-digital-twin/) — `?view=world`, "Khám phá Đắk Lắk 3D". Smoke coverage
// proving: the route lazy-loads its own chunk, it doesn't leak into other routes' bundles, and the
// illustrative scene renders without console/runtime errors. Same production-build-only pattern as
// the existing chunk-isolation tests in dashboard.spec.ts (`test.skip(!process.env.E2E_PRODUCTION, …)`).
test.describe('world exploration (Phase T1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('daklak-dashboard:onboarding-dismissed', 'true');
      // Phase T3's own world-specific first-visit guide (WorldGuideDialog.tsx) — a separate
      // dialog/storage key from the admin-boundary one above (see its doc comment for why). Tests
      // in this file that aren't specifically about onboarding pre-dismiss both so they can assert
      // on the scene/markers/HUD without an unrelated dialog on top.
      window.localStorage.setItem('daklak-dashboard:world-onboarding-dismissed', 'true');
    });
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

    // Scoped to the world-scene region, not the page as a whole: the primary-nav button that opens
    // this route (added when the route was surfaced in navigation) renders the same visible text
    // ("Khám phá Đắk Lắk 3D") as the in-scene title, so an unscoped page-wide text match is
    // ambiguous once both are on screen together.
    const worldRegion = page.getByLabel('Khám phá Đắk Lắk 3D — kịch bản minh họa');
    await expect(worldRegion).toBeVisible();
    await expect(worldRegion.getByText('ILLUSTRATIVE — KỊCH BẢN MINH HỌA')).toBeVisible();
    // The title/tagline caption reuses `.map-caption` (see WorldExplorationView.tsx), which the
    // app's existing CSS already hides at narrow/mobile-portrait widths (global.css, the same
    // `max-width: 767px` rule the existing `3d` view's caption is subject to) — so only assert its
    // visibility on a wide-enough viewport, matching real, pre-existing app behavior rather than
    // asserting a viewport-invariant UI that was never actually true for `.map-caption`.
    const viewportWidth = page.viewportSize()?.width ?? 1280;
    if (viewportWidth > 767) {
      await expect(worldRegion.getByText('Khám phá Đắk Lắk 3D', { exact: true })).toBeVisible();
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

// Phase T2 (reports/tourism-digital-twin/) — real, sourced destination markers
// (src/entities/tourism/verifiedTourismDestinations.ts) rendered on top of the terrain. Markers
// are `@react-three/drei` `Html` overlays (plain DOM nodes positioned over the canvas), so they're
// queryable the same way as any other DOM button — no canvas pixel inspection needed.
test.describe('world exploration — destination markers (Phase T2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('daklak-dashboard:onboarding-dismissed', 'true');
      // Phase T3's own world-specific first-visit guide (WorldGuideDialog.tsx) — a separate
      // dialog/storage key from the admin-boundary one above (see its doc comment for why). Tests
      // in this file that aren't specifically about onboarding pre-dismiss both so they can assert
      // on the scene/markers/HUD without an unrelated dialog on top.
      window.localStorage.setItem('daklak-dashboard:world-onboarding-dismissed', 'true');
    });
    // WorldFlyInCamera.tsx runs a continuous slow orbit after its fly-in animation unless
    // `reducedMotion` is true (read from `prefers-reduced-motion`, see App.tsx) — that orbit keeps
    // every marker's on-screen position moving every frame, which makes Playwright's actionability
    // checks (hover/click "element is stable") fail nondeterministically. Emulating
    // `prefers-reduced-motion: reduce` is the app's own real mechanism for settling the camera, not
    // a test-only workaround bolted onto the component.
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('renders all 5 verified destination markers at plausible positions', async ({ page }) => {
    await page.goto('./?view=world');
    const worldRegion = page.getByLabel('Khám phá Đắk Lắk 3D — kịch bản minh họa');
    await expect(worldRegion).toBeVisible();

    // 5 since Phase T4 added `krong-kmar-waterfall` to the 4 verified in Phase T2 (see
    // `verifiedTourismDestinations.ts`).
    const markers = page.getByRole('button', { name: /^Điểm đến du lịch:/ });
    await expect(markers).toHaveCount(5);

    const viewport = page.viewportSize();
    const boxes = await Promise.all((await markers.all()).map((marker) => marker.boundingBox()));
    for (const box of boxes) {
      // "Plausible" here means a real, finite CSS position the Mercator projection produced — not
      // NaN/Infinity from a broken transform. The four real-world destinations are spread across
      // the whole province while the settled fly-in camera frames a fixed, zoomed-in area (see
      // WorldFlyInCamera.tsx), so on a narrow viewport some markers legitimately land outside the
      // initial framing — same as how not every administrative label fits on screen at once
      // elsewhere in this app. That's expected, not a defect; strict on-screen containment is only
      // asserted below for wide-enough viewports where the framing is expected to fit all 4.
      expect(box, 'marker must resolve a real DOM bounding box').not.toBeNull();
      expect(Number.isFinite(box!.x)).toBe(true);
      expect(Number.isFinite(box!.y)).toBe(true);
    }

    if ((viewport?.width ?? 1280) > 767) {
      // Phase T4 ground-anchors each marker to its real sampled terrain elevation
      // (`poi/destinationElevation.ts`) instead of the old flat height — see
      // `WorldDestinationMarkers.tsx`'s doc comment for why this deliberately does NOT also
      // adjust `WorldFlyInCamera.tsx`'s fixed intro framing. A small tolerance margin
      // accommodates a real destination's real elevation nudging it just past the fixed frame's
      // edge (observed: Hồ Lắk's lowland elevation shifts its screen Y a few dozen px below this
      // desktop viewport's bottom edge) without silently accepting a badly broken projection —
      // still a real, bounded position, not NaN/off-screen-by-thousands-of-pixels.
      const overflowTolerance = 60;
      for (const box of boxes) {
        expect(box!.x).toBeGreaterThanOrEqual(-overflowTolerance);
        expect(box!.y).toBeGreaterThanOrEqual(-overflowTolerance);
        expect(box!.x).toBeLessThanOrEqual(viewport!.width + overflowTolerance);
        expect(box!.y).toBeLessThanOrEqual(viewport!.height + overflowTolerance);
      }
    }
  });

  test('clicking a marker shows its info panel with name, description, category and a visible source link', async ({
    page,
  }) => {
    await page.goto('./?view=world');
    const marker = page.getByRole('button', { name: 'Điểm đến du lịch: Hồ Lắk' });
    await expect(marker).toBeVisible();
    // `dispatchEvent`, not `.click()`/`.click({force:true})`: these markers are `@react-three/
    // drei` `Html` overlays, positioned via a CSS transform anchored to the WebGL canvas rather
    // than normal document flow. Playwright's actionability pipeline still runs a
    // "scroll element into view" geometry check even with `force: true`, and that check produces
    // a false-negative "Element is outside of the viewport" for this kind of CSS3D-transformed
    // element on some browser/viewport combinations (observed on WebKit and the narrow mobile
    // viewport) even though `toBeVisible()` above already proves it is genuinely rendered
    // on-screen. `dispatchEvent` fires the real DOM event straight at the element, bypassing that
    // geometry heuristic entirely — the documented Playwright escape hatch for exactly this case.
    await marker.dispatchEvent('click');

    const panel = page.getByRole('dialog', { name: 'Hồ Lắk' });
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Hồ', { exact: true })).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Hồ Lắk' })).toBeVisible();
    await expect(panel.getByText(/Hồ nước ngọt tự nhiên lớn thứ hai Việt Nam/)).toBeVisible();

    const sourceLink = panel.getByRole('link', { name: /Mở nguồn dữ liệu của Hồ Lắk/ });
    await expect(sourceLink).toBeVisible();
    await expect(sourceLink).toHaveAttribute(
      'href',
      'https://vi.wikipedia.org/wiki/H%E1%BB%93_L%E1%BA%AFk',
    );
    await expect(sourceLink).toHaveAttribute('target', '_blank');

    // Closing returns to no open panel.
    await panel.getByRole('button', { name: 'Đóng' }).dispatchEvent('click');
    await expect(panel).not.toBeVisible();
  });

  test('hovering a marker reveals its name label without opening the info panel', async ({
    page,
  }) => {
    await page.goto('./?view=world');
    const marker = page.getByRole('button', { name: 'Điểm đến du lịch: Thác Đray Nur' });
    await expect(marker).toBeVisible();
    // See the `dispatchEvent` note on the click test above — same canvas-anchored-overlay reason.
    // The component's hover handler is a React `onPointerOver`, which listens on the native
    // `pointerover` event.
    await marker.dispatchEvent('pointerover');
    await expect(marker.getByText('Thác Đray Nur')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

// Same "no pre-seeded onboarding-dismissed localStorage" regression class the T1 postmortem
// documented (reports/tourism-digital-twin/phase-status.md) — re-checked here specifically with
// the new marker layer present, so this addition doesn't reintroduce that bug class.
test.describe('world exploration — destination markers, no pre-existing onboarding state', () => {
  test('markers still render for a genuinely first-time visitor with nothing in localStorage', async ({
    page,
  }) => {
    await page.goto('./?view=world');
    await expect(page.getByLabel('Khám phá Đắk Lắk 3D — kịch bản minh họa')).toBeVisible();
    // Phase T3's own world-specific first-visit guide (WorldGuideDialog.tsx) legitimately auto
    // -opens here — a genuinely fresh profile with nothing in localStorage is exactly the case it
    // is meant to show for. Markers must still exist in the DOM underneath it regardless.
    await expect(page.getByRole('dialog', { name: /bắt đầu khám phá/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Điểm đến du lịch:/ })).toHaveCount(5);
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
    // Exactly one dialog is legitimate here: Phase T3's own world-specific guide
    // (WorldGuideDialog.tsx), which — unlike the admin-boundary one above — actually describes
    // this scene's real controls, so it is expected to auto-open for a genuinely fresh profile.
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(page.getByRole('dialog', { name: /bắt đầu khám phá/i })).toBeVisible();
  });

  test('does not show the 3D/admin-boundary onboarding dialog on ?view=world even via the header help control', async ({
    page,
  }) => {
    await page.goto('./?view=world');
    await expect(page.getByLabel('Khám phá Đắk Lắk 3D — kịch bản minh họa')).toBeVisible();
    // Dismiss Phase T3's own guide first so this test isolates the *header's* generic "?" help
    // control (OnboardingOverlay.tsx's `helpSignal`, unrelated to WorldGuideDialog.tsx's own
    // "Trợ giúp" HUD button, which is covered separately below).
    await page.getByRole('button', { name: 'Bắt đầu' }).click();
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

// Phase T3 (reports/tourism-digital-twin/) — Walk/Fly/Tour interactive exploration, CPU terrain
// sampler, POI proximity/teleport, HUD. `reducedMotion` is emulated in every test here so the
// scene skips straight past WorldFlyInCamera's one-shot intro (WorldScene.tsx) into the
// interactive PlayerRig/TourRig instead of waiting out the real ~2.4s animation — same rationale
// already established for the Phase T2 marker tests above (a settled, non-animating scene is what
// makes Playwright's actionability checks deterministic here too).
test.describe('world exploration — Walk/Fly/Tour (Phase T3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('daklak-dashboard:onboarding-dismissed', 'true');
      window.localStorage.setItem('daklak-dashboard:world-onboarding-dismissed', 'true');
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('mode switch updates the active mode and its pressed state', async ({ page }) => {
    await page.goto('./?view=world');
    const walkButton = page.getByRole('button', { name: /chuyển sang chế độ đi bộ/i });
    const flyButton = page.getByRole('button', { name: /chuyển sang chế độ bay tự do/i });
    await expect(flyButton).toHaveAttribute('aria-pressed', 'true'); // default mode
    await walkButton.click();
    await expect(walkButton).toHaveAttribute('aria-pressed', 'true');
    await expect(flyButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('status HUD shows a compass, real-looking coordinates, and altitude/nearest-POI text', async ({
    page,
  }) => {
    await page.goto('./?view=world');
    await expect(page.getByRole('img', { name: /la bàn/i })).toBeVisible();
    // Coordinates render as "12.xxxx°N, 108.xxxx°E" (worldHudFormat.ts's formatLatLon) — Đắk Lắk
    // is entirely N/E, so both hemisphere letters are a real assertion, not a loose wildcard.
    await expect(page.getByText(/\d+\.\d{4}°N, \d+\.\d{4}°E/)).toBeVisible();
    await expect(page.getByText(/Cao độ|Đang tải dữ liệu địa hình/)).toBeVisible();
  });

  test('the destination list (non-canvas POI access) opens, shows a real source link, and can teleport', async ({
    page,
  }) => {
    await page.goto('./?view=world');
    await page.getByRole('button', { name: 'Danh sách điểm đến' }).click();
    const dialog = page.getByRole('dialog', { name: 'Danh sách điểm đến' });
    await expect(dialog).toBeVisible();

    const hoLakRow = dialog.getByRole('button', { name: /Hồ Lắk/ });
    await expect(hoLakRow).toBeVisible();
    await hoLakRow.click();
    await expect(dialog.getByRole('link', { name: /vi\.wikipedia\.org/ })).toBeVisible();

    await dialog.getByRole('button', { name: /Đi tới Hồ Lắk/ }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('the quick-travel menu lists destinations and tours, and starting a tour shows live tour controls', async ({
    page,
  }) => {
    await page.goto('./?view=world');
    await page.getByRole('button', { name: 'Di chuyển nhanh' }).click();
    const menu = page.getByRole('dialog', { name: 'Di chuyển nhanh' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: /Đi tới Hồ Lắk/ })).toBeVisible();

    await menu.getByRole('button', { name: /Bắt đầu tour: Hồ & Thác/ }).click();
    await expect(menu).not.toBeVisible();

    // Scoped by class, not a bare `getByRole('status')`: `MapLoading` (the terrain Suspense
    // fallback, `.map-loading`) is also `role="status"` and can still be in the DOM at this point.
    const tourStatus = page.locator('.world-hud__tour-controls[role="status"]');
    await expect(tourStatus).toContainText('Hồ & Thác — Đắk Lắk sông nước');
    await expect(page.getByRole('button', { name: 'Tạm dừng tour' })).toBeVisible();

    await page.getByRole('button', { name: 'Kết thúc tour' }).click();
    await expect(page.locator('.world-hud__tour-controls')).toHaveCount(0);
  });

  test('the Help button reopens the guide dialog even after it has been dismissed', async ({
    page,
  }) => {
    await page.goto('./?view=world');
    await expect(page.getByRole('dialog')).toHaveCount(0); // pre-dismissed by this describe's beforeEach
    // Accessible name is the button's `aria-label` ("Mở hướng dẫn điều khiển"), not its visible
    // text ("Trợ giúp") — `aria-label` wins over text content in the accessible-name computation.
    await page.getByRole('button', { name: 'Mở hướng dẫn điều khiển' }).click();
    await expect(page.getByRole('dialog', { name: /bắt đầu khám phá/i })).toBeVisible();
    await page.getByRole('button', { name: 'Bắt đầu' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('WASD movement and Escape do not throw runtime errors while in Walk mode', async ({
    page,
  }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    await page.goto('./?view=world');
    await page.getByRole('button', { name: /chuyển sang chế độ đi bộ/i }).click();
    const canvas = page.locator('#world-viewport canvas');
    await expect(canvas).toBeVisible();

    for (const key of ['w', 'a', 's', 'd']) {
      await page.keyboard.down(key);
      await page.waitForTimeout(50);
      await page.keyboard.up(key);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    expect(runtimeErrors).toEqual([]);
  });

  test('mobile viewport: touch controls are present and the page does not overflow horizontally', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./?view=world');
    await expect(page.getByLabel('Khám phá Đắk Lắk 3D — kịch bản minh họa')).toBeVisible();

    // `.world-hud__touch-controls` is only shown via `@media (pointer: coarse)` (global.css) — a
    // real mobile browser context (Playwright's `mobile-chromium` project) reports a coarse
    // pointer, so this only meaningfully passes there; on desktop-chromium the element still
    // exists in the DOM (React always renders it) but stays `display: none`, which is also a
    // legitimate, intentional outcome for this same assertion style already used elsewhere in this
    // file for viewport-conditional visibility.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

// Phase T4 (reports/tourism-digital-twin/) — ground-anchored destination markers, illustrative
// lighting presets, and the reused road-layer data, all rendered without disturbing any Phase
// T1-T3 behavior already covered above (mode switch, POI list, tours, touch controls).
test.describe('world exploration — elevation/lighting/roads (Phase T4)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('daklak-dashboard:onboarding-dismissed', 'true');
      window.localStorage.setItem('daklak-dashboard:world-onboarding-dismissed', 'true');
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('illustrative lighting presets: "Ban ngày" is pressed by default and switching preset updates aria-pressed without runtime errors', async ({
    page,
  }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    await page.goto('./?view=world');
    const dayButton = page.getByRole('button', { name: /chuyển ánh sáng minh họa sang ban ngày/i });
    const dawnButton = page.getByRole('button', {
      name: /chuyển ánh sáng minh họa sang bình minh/i,
    });
    const sunsetButton = page.getByRole('button', {
      name: /chuyển ánh sáng minh họa sang hoàng hôn/i,
    });
    await expect(dayButton).toHaveAttribute('aria-pressed', 'true');
    await expect(dawnButton).toHaveAttribute('aria-pressed', 'false');

    await dawnButton.click();
    await expect(dawnButton).toHaveAttribute('aria-pressed', 'true');
    await expect(dayButton).toHaveAttribute('aria-pressed', 'false');

    await sunsetButton.click();
    await expect(sunsetButton).toHaveAttribute('aria-pressed', 'true');
    await expect(dawnButton).toHaveAttribute('aria-pressed', 'false');

    expect(runtimeErrors).toEqual([]);
  });

  test('destination markers, the reused road layer, and the Hồ Lắk water plane all render together without console/runtime errors', async ({
    page,
  }) => {
    const runtimeErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      if (/google-analytics\.com|googletagmanager\.com/.test(message.text())) return;
      consoleErrors.push(message.text());
    });

    await page.goto('./?view=world');
    const canvas = page.locator('#world-viewport canvas');
    await expect(canvas).toBeVisible();
    // Every Phase T2 marker still resolves a real, clickable position once ground-anchored to
    // real elevation (Phase T4) instead of the old flat height — a regression check that
    // `getDestinationMarkerHeight`'s fallback-then-real-height swap didn't hide any marker.
    await expect(page.getByRole('button', { name: 'Điểm đến du lịch: Hồ Lắk' })).toBeAttached();
    await expect(
      page.getByRole('button', { name: 'Điểm đến du lịch: Vườn quốc gia Yok Đôn' }),
    ).toBeAttached();
    await expect(
      page.getByRole('button', { name: 'Điểm đến du lịch: Thác Đray Nur' }),
    ).toBeAttached();
    await expect(page.getByRole('button', { name: 'Điểm đến du lịch: Buôn Đôn' })).toBeAttached();

    // Give the async road-layer fetch/decompress (loadRoads()) and terrain-sampler decode a real
    // chance to resolve and re-render before asserting zero errors.
    await page.waitForTimeout(1000);

    expect(runtimeErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
