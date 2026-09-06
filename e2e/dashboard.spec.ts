/// <reference lib="dom" />
import { expect, test, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// The ward/commune directory now lives inside the merged map view (DetailMapViewport.tsx) as a
// sidebar, collapsed by default on narrow/mobile viewports (see its `directoryOpen` initial
// matchMedia check) — open it via its own toggle when present; on desktop it's already open.
// DetailMapViewport is a lazy chunk (see App.tsx), so wait for its container before checking the
// toggle — calling this right after a client-side nav click (not a full page.goto) can otherwise
// race the chunk fetch/Suspense fallback and find no toggle at all.
async function openMapDirectory(page: import('@playwright/test').Page) {
  await page.locator('#detail-map-viewport').waitFor({ state: 'visible' });
  const toggle = page.getByRole('button', { name: 'Hiện danh sách', exact: true });
  if (await toggle.isVisible()) await toggle.click();
}

function primaryNav(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Điều hướng chính' });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem('daklak-dashboard:onboarding-dismissed', 'true'),
  );
});

// Phase 2A made Executive Overview the default landing (no `view` param) — every test below that
// exercises the 3D overview now navigates with an explicit `?view=3d` so it keeps testing exactly
// what it always tested, instead of accidentally landing on Executive Overview. See
// docs/adr/0001-project-centric-domain.md and the new 'Executive Overview (Phase 2A)' describe
// block at the end of this file for landing-page-specific coverage.
test.describe('dashboard smoke tests', () => {
  test('loads the terrain, controls, and sourced overview', async ({ page }) => {
    const runtimeErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('requestfailed', (request) => {
      // Google Analytics beacons reach a real external host and are expected to fail in this
      // offline/sandboxed test environment — that's a network-availability artifact, not an
      // app defect, so they're excluded from this app-correctness assertion.
      if (/google-analytics\.com|googletagmanager\.com/.test(request.url())) return;
      failedRequests.push(request.url());
    });
    await page.goto('./?view=3d');

    await expect(page.getByRole('heading', { name: /Đắk Lắk/i })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tổng quan', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const summaryToggle = page.getByRole('button', { name: 'Mở tóm tắt' });
    if (await summaryToggle.isVisible()) await summaryToggle.click();
    await expect(page.getByText('SỐ LIỆU CẤP TỈNH CÓ NGUỒN')).toBeVisible();
    expect(runtimeErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });

  test('switches all thematic modes and identifies illustrative data', async ({ page }) => {
    await page.goto('./?view=3d');

    for (const mode of ['Năng lượng', 'Heatmap']) {
      const tab = page.getByRole('button', { name: mode });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByLabel('Chế độ đang dùng dữ liệu minh họa')).toBeVisible();
    }
  });

  test('supports search, keyboard navigation, and shared selection in the merged map/directory view', async ({
    page,
  }) => {
    await page.goto('./?view=3d');
    await primaryNav(page).getByRole('button', { name: 'Bản đồ & danh sách', exact: true }).click();
    await openMapDirectory(page);

    const search = page.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' });
    await search.fill('buon ma thuot');
    // Scoped to the directory's own status text (`.directory-status`) — a plain `role=status`
    // query is ambiguous here now, since the MapLibre canvas's own loading spinner
    // (`.map-loading`) is also `role="status"` and can still be present alongside the directory.
    await expect(page.locator('.directory-status')).toContainText('Tìm thấy 1 đơn vị');
    const row = page.getByRole('row', { name: /Buôn Ma Thuột/ });
    await row.click();
    await expect(row).toHaveAttribute('aria-selected', 'true');
    await search.fill('');
    const firstRow = page.getByRole('row').nth(1);
    await firstRow.focus();
    await firstRow.press('ArrowDown');
    await expect(page.getByRole('row').nth(2)).toBeFocused();
    await search.fill('dak');
    await expect(page.getByRole('row', { name: /Đắk Liêng/ })).toBeVisible();
  });

  test('disables automatic rotation when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./?view=3d');
    await expect(page.getByRole('button', { name: 'Đã giảm chuyển động' })).toBeDisabled();
  });

  test('preserves native arrow-key behavior on interactive controls', async ({ page }) => {
    await page.goto('./?view=3d');
    await expect(page.locator('canvas')).toBeVisible();
    const switchView = primaryNav(page).getByRole('button', {
      name: 'Bản đồ & danh sách',
      exact: true,
    });
    const controlEventWasNotCancelled = await switchView.evaluate((element) =>
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      ),
    );
    expect(controlEventWasNotCancelled).toBe(true);
  });

  test('shows a recovery path after WebGL context loss', async ({ page }) => {
    await page.goto('./?view=3d');
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-webgl-lifecycle', 'ready');
    await canvas.dispatchEvent('webglcontextlost', { cancelable: true });
    await expect(page.getByRole('heading', { name: 'Không thể hiển thị bản đồ 3D' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tải lại bản đồ' })).toBeVisible();
    await canvas.dispatchEvent('webglcontextrestored');
    await expect(page.getByRole('heading', { name: 'Không thể hiển thị bản đồ 3D' })).toBeHidden();
  });

  test('matches the dashboard shell visual baseline', async ({ page }) => {
    test.skip(!test.info().project.name.includes('chromium'), 'Visual baselines are Chromium-only');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./?view=3d');
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForTimeout(800);

    await expect(page).toHaveScreenshot('dashboard-overview.png', {
      animations: 'disabled',
      mask: [page.locator('canvas')],
      maskColor: '#071918',
      maxDiffPixelRatio: 0.03,
    });
  });

  test('has no serious automated accessibility violations in 3D and the merged map view', async ({
    page,
  }) => {
    await page.goto('./?view=3d');
    const threeDimensionalResults = await new AxeBuilder({ page }).analyze();
    expect(
      threeDimensionalResults.violations.filter(
        ({ impact }) => impact === 'critical' || impact === 'serious',
      ),
    ).toEqual([]);

    await primaryNav(page).getByRole('button', { name: 'Bản đồ & danh sách', exact: true }).click();
    const mapResults = await new AxeBuilder({ page }).analyze();
    expect(
      mapResults.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });

  test('loads lazy chunks and textures from the GitHub Pages base path', async ({ page }) => {
    test.skip(!process.env.E2E_PRODUCTION, 'Hashed asset assertions require the production build');
    test.skip(!test.info().project.name.includes('chromium'), 'Asset loading is verified once');
    const responses: string[] = [];
    page.on('response', (response) => responses.push(response.url()));
    await page.goto('./?view=3d');
    await expect(page.locator('canvas')).toBeVisible();
    expect(
      responses.some((url) => /\/daklak-3d-dashboard\/assets\/AdministrativeMap-.*\.js/.test(url)),
    ).toBe(true);
    await expect
      .poll(() =>
        responses.some((url) =>
          /\/daklak-3d-dashboard\/assets\/daklak-terrain-color-.*\.png/.test(url),
        ),
      )
      .toBe(true);
  });

  test('publishes production build metadata', async ({ page }) => {
    test.skip(!process.env.E2E_PRODUCTION, 'Build metadata is emitted only by production builds');
    test.skip(!test.info().project.name.includes('desktop-chromium'), 'Metadata is verified once');
    const response = await page.request.get('./build-info.json');
    expect(response.ok()).toBe(true);
    const buildInfo = (await response.json()) as Record<string, string>;
    expect(buildInfo.applicationVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(buildInfo.gitCommit).toMatch(/^(unknown|[0-9a-f]{40})$/);
    expect(buildInfo.buildTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(buildInfo.datasetVersion).toMatch(/^[0-9a-f]{40}$/);
    expect(buildInfo.datasetSnapshot).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('does not load the MapLibre chunk when starting in the 3D overview', async ({ page }) => {
    test.skip(!process.env.E2E_PRODUCTION, 'Chunk assertions require the production build');
    const responses: string[] = [];
    page.on('response', (response) => responses.push(response.url()));
    await page.goto('./?view=3d');
    await expect(page.locator('canvas')).toBeVisible();
    expect(responses.some((url) => /\/assets\/maplibre-gl-.*\.js/.test(url))).toBe(false);
  });

  test('loads the MapLibre chunk only once the detail map is opened, and never mounts Three.js there', async ({
    page,
  }) => {
    test.skip(!process.env.E2E_PRODUCTION, 'Chunk assertions require the production build');
    const responses: string[] = [];
    page.on('response', (response) => responses.push(response.url()));
    // Start directly on the detail map (skip the 3D overview) so this test isolates what the
    // detail map itself loads, rather than what the default 3D-overview-then-switch flow loads.
    await page.goto('./?view=map');
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
    await expect
      .poll(() => responses.some((url) => /\/assets\/maplibre-gl-.*\.js/.test(url)))
      .toBe(true);
    expect(
      responses.some((url) => /\/assets\/(AdministrativeMap|three-vendor)-.*\.js/.test(url)),
    ).toBe(false);
  });

  test('restores shareable URL state and browser history', async ({ page }) => {
    await page.goto('./?view=2d&mode=energy&ward=22015');
    await openMapDirectory(page);
    await expect(page.getByRole('heading', { name: 'Danh sách xã, phường' })).toBeVisible();
    // The dataMode ('Năng lượng'/'Heatmap') tabs no longer render in the merged map view (see
    // DashboardHeader.tsx's `viewMode === '3d'` gate) — `mode=energy` is still restored into
    // state/URL from the shared link, just without a visible tab here; verify via the URL and via
    // the tabs actually appearing once switched to 3D below, instead.
    await expect(page).toHaveURL(/mode=energy/);
    const selectedRow = page.locator('[role="row"][aria-selected="true"]');
    await expect(selectedRow).toContainText(/Tuy Ho/);

    await primaryNav(page).getByRole('button', { name: '3D', exact: true }).click();
    await expect(page).toHaveURL(/view=3d&mode=energy&ward=22015/);
    await expect(page.getByRole('button', { name: 'Năng lượng' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('#map-viewport')).toBeFocused();
    await page.goBack();
    // ?view=2d is a legacy alias — the app canonicalizes the URL to ?view=map on load (see
    // dashboardUrl.ts's serializeViewMode), so Back restores the canonical value, not the
    // original literal '2d' the address bar showed before navigating away.
    await expect(page).toHaveURL(/view=map&mode=energy&ward=22015/);
    // Focus lands on the detail-map section itself (its own mount effect), not the directory
    // heading inside it — see DetailMapViewport.tsx and App.tsx's viewMode-change effect, which
    // deliberately leaves 'map' focus management to DetailMapViewport.
    await expect(page.locator('#detail-map-viewport')).toBeFocused();
  });

  test('selecting multiple wards in a row does not grow browser history', async ({ page }) => {
    await page.goto('./?view=2d');
    await openMapDirectory(page);
    const search = page.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' });
    const historyLength = () => page.evaluate(() => window.history.length);

    const lengthBeforeSelection = await historyLength();

    await search.fill('buon ma thuot');
    await page.getByRole('row', { name: /Buôn Ma Thuột/ }).click();
    await expect(page).toHaveURL(/ward=24133/);
    expect(await historyLength()).toBe(lengthBeforeSelection);

    await search.fill('buon ho');
    await page.getByRole('row', { name: /Buôn Hồ/ }).click();
    await expect(page).toHaveURL(/ward=24305/);
    expect(await historyLength()).toBe(lengthBeforeSelection);

    // A view change is still push-worthy and creates a real, single Back step. (The dataMode
    // tabs — 'Năng lượng'/'Heatmap' — no longer render in the merged map view, since
    // DetailMapViewport has its own independent layer toggles; see DashboardHeader.tsx's
    // `viewMode === '3d'` gate. Use a primary-nav view switch instead to exercise the same
    // push-vs-replace history rule this test is actually about.)
    await primaryNav(page).getByRole('button', { name: '3D', exact: true }).click();
    expect(await historyLength()).toBe(lengthBeforeSelection + 1);
    await page.goBack();
    // ?view=2d canonicalizes to ?view=map on load — see the comment in the test above.
    await expect(page).toHaveURL(/view=map&mode=overview&ward=24305/);
  });

  test('shows the accessible ward/commune directory inline when WebGL is unavailable, without navigating away', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, options) {
        if (type === 'webgl' || type === 'webgl2') return null;
        return original.call(this, type, options as never);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await page.goto('./?view=3d');
    await expect(page.getByRole('heading', { name: 'Không thể hiển thị bản đồ 3D' })).toBeVisible();
    await expect(
      page.locator('.map-fallback').getByRole('heading', { name: 'Danh sách xã, phường' }),
    ).toBeVisible();
  });
});

test.describe('mobile dashboard composition', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('keeps the compact header, tabs, and map inside portrait viewport', async ({ page }) => {
    await page.goto('./?view=3d&mode=overview');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(
      primaryNav(page).getByRole('button', { name: 'Bản đồ & danh sách', exact: true }),
    ).toBeVisible();
    await expect(page.locator('#mobile-dashboard-sheet')).toHaveAttribute('data-state', 'closed');
    const layout = await page.evaluate(() => {
      const header = document.querySelector('header')?.getBoundingClientRect();
      const tabs = document.querySelector('.mode-tabs')?.getBoundingClientRect();
      const map = document.querySelector('#map-viewport')?.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        headerBottom: header?.bottom ?? 0,
        tabsTop: tabs?.top ?? 0,
        tabsBottom: tabs?.bottom ?? 0,
        mapTop: map?.top ?? 0,
        mapHeight: map?.height ?? 0,
      };
    });
    expect(layout.overflow).toBe(false);
    expect(layout.tabsTop).toBeGreaterThanOrEqual(layout.headerBottom - 1);
    expect(layout.mapTop).toBeGreaterThanOrEqual(layout.tabsBottom - 1);
    expect(layout.mapHeight).toBeGreaterThan(600);
  });

  test('opens selection at peek and toggles the shared sheet', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('./?view=3d&mode=overview&ward=22015');
    const sheet = page.locator('#mobile-dashboard-sheet');
    await expect(sheet).toHaveAttribute('data-state', 'peek');
    await expect(sheet).toContainText(/Tuy Ho/);
    const toggle = page.getByRole('button', { name: 'Chi tiết đơn vị đã chọn' });
    await toggle.click();
    await expect(sheet).toHaveAttribute('data-state', 'expanded');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.press('Enter');
    await expect(sheet).toHaveAttribute('data-state', 'peek');
  });

  test('keeps heatmap and the merged map/directory view usable without horizontal overflow', async ({
    page,
  }) => {
    await page.goto('./?view=3d&mode=heatmap');
    await expect(page.getByRole('button', { name: 'Heatmap' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await primaryNav(page).getByRole('button', { name: 'Bản đồ & danh sách', exact: true }).click();
    await openMapDirectory(page);
    await expect(page.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });

  test('hides the primary-nav edge-fade once scrolled to the true end (real-browser regression for useScrollEdgeFade)', async ({
    page,
  }) => {
    // jsdom unit tests (useScrollEdgeFade.test.ts) stub scrollWidth/clientWidth and cannot catch
    // real CSS/pseudo-element/sticky-positioning bugs — this is exactly the kind of bug that
    // shipped in Phase 9 (edge-fade staying visible with nothing left to scroll to). This test
    // exercises the real `.primary-nav::after` pseudo-element in a real browser at a mobile
    // viewport instead of asserting only on the `data-scroll-end` attribute.
    await page.goto('./?view=3d&mode=overview');
    const nav = primaryNav(page);
    const fadeOpacity = () =>
      nav.evaluate((element) => window.getComputedStyle(element, '::after').opacity);

    // Only meaningful when there's actually something to scroll — assert the pre-scroll fade is
    // visible in that case, since it's the "there's more here" affordance this hook exists for.
    const hasOverflow = await nav.evaluate(
      (element) => element.scrollWidth - element.clientWidth > 1,
    );
    if (hasOverflow) await expect.poll(fadeOpacity).toBe('1');

    await nav.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
      element.dispatchEvent(new Event('scroll'));
    });
    await expect.poll(fadeOpacity).toBe('0');
  });

  test('recomposes safely after an orientation-sized resize', async ({ page }) => {
    await page.goto('./?view=3d&mode=overview');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const portraitWidth = await canvas.evaluate((element) => element.clientWidth);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('#mobile-dashboard-sheet')).toHaveCount(0);
    await expect
      .poll(() => canvas.evaluate((element) => element.clientWidth))
      .toBeGreaterThan(portraitWidth);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });

  test('matches intentional mobile visual states', async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(
      test.info().project.name !== 'mobile-chromium' ||
        !['win32', 'linux'].includes(process.platform),
      'Mobile visual baselines are maintained for Windows and Linux Chromium',
    );
    await page.goto('./?view=3d&mode=overview');
    await expect(page.locator('canvas')).toHaveAttribute('data-webgl-lifecycle', 'ready');
    await expect(page.locator('.map-loading')).toBeHidden();
    await expect(page.locator('#mobile-dashboard-sheet')).toHaveAttribute('data-state', 'closed');
    await page.addStyleTag({
      content: '.map-canvas-shell canvas { visibility: hidden !important; }',
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-mobile-overview.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });

    await page.goto('./?view=3d&mode=overview&ward=22015');
    await expect(page.locator('canvas')).toHaveAttribute('data-webgl-lifecycle', 'ready');
    await expect(page.locator('.map-loading')).toBeHidden();
    await expect(page.locator('#mobile-dashboard-sheet')).toHaveAttribute('data-state', 'peek');
    await page.addStyleTag({
      content: '.map-canvas-shell canvas { visibility: hidden !important; }',
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-mobile-selection-peek.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });
    await page.getByRole('button', { name: 'Chi tiết đơn vị đã chọn' }).click();
    await expect(page.locator('#mobile-dashboard-sheet')).toHaveAttribute('data-state', 'expanded');
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot('dashboard-mobile-selection-expanded.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });

    await page.goto('./?view=3d&mode=heatmap');
    await expect(page.locator('canvas')).toHaveAttribute('data-webgl-lifecycle', 'ready');
    await expect(page.locator('.map-loading')).toBeHidden();
    await expect(page.locator('#mobile-dashboard-sheet')).toHaveAttribute('data-state', 'closed');
    await page.addStyleTag({
      content: '.map-canvas-shell canvas { visibility: hidden !important; }',
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-mobile-heatmap.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });
    await primaryNav(page).getByRole('button', { name: 'Bản đồ & danh sách', exact: true }).click();
    await openMapDirectory(page);
    await expect(page.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' })).toBeVisible();
    await expect(page).toHaveScreenshot('dashboard-mobile-directory.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });
    const directoryRows = page.locator('button.directory-row');
    await directoryRows.first().focus();
    for (let index = 0; index < 50; index += 1) await page.keyboard.press('ArrowDown');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page).toHaveScreenshot('dashboard-mobile-directory-middle-focus.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });
    await page.keyboard.press('End');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page).toHaveScreenshot('dashboard-mobile-directory-last-focus.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });

    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('./?view=3d&mode=overview');
    await expect(page.locator('canvas')).toHaveAttribute('data-webgl-lifecycle', 'ready');
    await expect(page.locator('.map-loading')).toBeHidden();
    await expect(page.locator('#mobile-dashboard-sheet')).toHaveAttribute('data-state', 'closed');
    await page.addStyleTag({
      content: '.map-canvas-shell canvas { visibility: hidden !important; }',
    });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-mobile-overview-412.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });
  });
});

test.describe('directory ordering and safe bottom', () => {
  const expectedFirstTen = [
    'Bình Kiến',
    'Buôn Đôn',
    'Buôn Hồ',
    'Buôn Ma Thuột',
    'Cuôr Đăng',
    'Cư Bao',
    "Cư M'gar",
    "Cư M'ta",
    'Cư Pơng',
    'Cư Prao',
  ];

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 412, height: 915 },
  ]) {
    test(`sorts 102 rows and keeps the final row safe at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('./?view=2d');
      await openMapDirectory(page);
      const rows = page.locator('button.directory-row');
      await expect(rows).toHaveCount(102);
      expect((await rows.locator('strong').allTextContents()).slice(0, 10)).toEqual(
        expectedFirstTen,
      );

      const search = page.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' });
      await search.fill('cư');
      const searchNames = await rows.locator('strong').allTextContents();
      const collator = new Intl.Collator('vi', { sensitivity: 'base', numeric: true });
      expect(searchNames).toEqual([...searchNames].sort(collator.compare));
      await search.fill('');

      const lastRow = rows.last();
      // Plain DOM scroll, not Playwright's scrollIntoViewIfNeeded(): the latter waits for the
      // element to be "stable" (no size/position change), which never settles on mobile-chromium
      // while the sibling MapLibre canvas is still doing layout work — an intermittent 30s hang
      // in CI. We only need it scrolled into view to measure it.
      await lastRow.evaluate((el) => el.scrollIntoView({ block: 'end' }));
      const bounds = await lastRow.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height - 8);
      await lastRow.click();
      await expect(lastRow).toHaveAttribute('aria-selected', 'true');
      const code = await lastRow.getAttribute('data-code');
      expect(code).toBeTruthy();
      await expect(page).toHaveURL(new RegExp(`ward=${code}`));
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        ),
      ).toBe(false);
    });
  }

  test('keyboard navigation follows displayed order and scrolls the last row into view', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./?view=2d');
    await openMapDirectory(page);
    const rows = page.locator('button.directory-row');
    const stickyHeader = page.locator('.directory-header');
    const expectBelowStickyHeader = async (row: Locator) => {
      const [rowBounds, headerBounds] = await Promise.all([
        row.boundingBox(),
        stickyHeader.boundingBox(),
      ]);
      expect(rowBounds).not.toBeNull();
      expect(headerBounds).not.toBeNull();
      expect(rowBounds!.y).toBeGreaterThanOrEqual(headerBounds!.y + headerBounds!.height);
      return rowBounds!;
    };
    await rows.first().focus();
    await expectBelowStickyHeader(rows.first());
    for (let index = 1; index <= 50; index += 1) await page.keyboard.press('ArrowDown');
    await expect(rows.nth(50)).toBeFocused();
    await expectBelowStickyHeader(rows.nth(50));
    for (let index = 51; index < 102; index += 1) await page.keyboard.press('ArrowDown');
    await expect(rows.last()).toBeFocused();
    const bounds = await expectBelowStickyHeader(rows.last());
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(836);
    await page.keyboard.press('ArrowUp');
    await expect(rows.nth(100)).toBeFocused();
    await expectBelowStickyHeader(rows.nth(100));
  });
});

test.describe('camera intent preservation', () => {
  test('keeps user camera state and selection safe across sheet transitions', async ({ page }) => {
    test.setTimeout(60_000);
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('./?view=3d&mode=overview&ward=22015');
    const stage = page.locator('#map-viewport');
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-webgl-lifecycle', 'ready');
    await page.waitForTimeout(500);
    expect(runtimeErrors).toEqual([]);
    await expect(stage).toHaveAttribute('data-selected-safe', 'true');
    const peekBounds = await page.locator('#mobile-dashboard-sheet').boundingBox();
    expect(peekBounds).not.toBeNull();
    expect(peekBounds!.height).toBeGreaterThanOrEqual(108);
    expect(peekBounds!.height).toBeLessThanOrEqual(114);
    await canvas.hover();
    await page.mouse.wheel(0, -260);
    await page.waitForTimeout(200);
    const before = JSON.parse((await stage.getAttribute('data-camera-state')) ?? '{}') as {
      zoom: number;
      target: number[];
    };
    await page.getByRole('button', { name: 'Chi tiết đơn vị đã chọn' }).click();
    await expect(page.locator('#mobile-dashboard-sheet')).toHaveAttribute('data-state', 'expanded');
    await expect(stage).toHaveAttribute('data-selected-safe', 'true');
    const expanded = JSON.parse((await stage.getAttribute('data-camera-state')) ?? '{}') as {
      zoom: number;
      target: number[];
    };
    expect(expanded.zoom).toBeGreaterThan(0);
    expect(Math.abs(expanded.zoom - before.zoom) / before.zoom).toBeLessThan(0.01);
    expect(expanded.target).not.toEqual([0, 0, 0]);
    await page.getByRole('button', { name: 'Chi tiết đơn vị đã chọn' }).click();
    await expect(page.locator('#mobile-dashboard-sheet')).toHaveAttribute('data-state', 'peek');
    await expect(stage).toHaveAttribute('data-selected-safe', 'true');
  });
});

test.describe('Vietnamese detail name visual coverage', () => {
  test('renders code 24580 at 1440x900 without clipping', async ({ page }) => {
    test.skip(
      test.info().project.name !== 'desktop-chromium' ||
        !['win32', 'linux'].includes(process.platform),
      'Desktop Chromium baselines are maintained for Windows and Linux',
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./?view=3d&mode=overview&ward=24580');
    await expect(page.locator('canvas')).toHaveAttribute('data-webgl-lifecycle', 'ready');
    await page.addStyleTag({
      content: '.map-canvas-shell canvas { visibility: hidden !important; }',
    });
    const panel = page.locator('.detail-panel');
    const heading = panel.locator('.unit-name');
    await expect(heading).toHaveText('Liên Sơn Lắk');
    const [panelBounds, headingBounds] = await Promise.all([
      panel.boundingBox(),
      heading.boundingBox(),
    ]);
    expect(panelBounds).not.toBeNull();
    expect(headingBounds).not.toBeNull();
    expect(headingBounds!.x).toBeGreaterThanOrEqual(panelBounds!.x);
    expect(headingBounds!.x + headingBounds!.width).toBeLessThanOrEqual(
      panelBounds!.x + panelBounds!.width,
    );
    await expect(panel).toHaveScreenshot('dashboard-detail-name-24580-desktop.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });
  });

  test('renders code 24580 at 390x844 without clipping', async ({ page }) => {
    test.skip(
      test.info().project.name !== 'mobile-chromium' ||
        !['win32', 'linux'].includes(process.platform),
      'Mobile Chromium baselines are maintained for Windows and Linux',
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./?view=3d&mode=overview&ward=24580');
    await expect(page.locator('canvas')).toHaveAttribute('data-webgl-lifecycle', 'ready');
    await page.addStyleTag({
      content: '.map-canvas-shell canvas { visibility: hidden !important; }',
    });
    const sheet = page.locator('#mobile-dashboard-sheet');
    const heading = sheet.locator('.unit-name');
    await expect(sheet).toHaveAttribute('data-state', 'peek');
    await expect(heading).toHaveText('Liên Sơn Lắk');
    const [sheetBounds, headingBounds] = await Promise.all([
      sheet.boundingBox(),
      heading.boundingBox(),
    ]);
    expect(sheetBounds).not.toBeNull();
    expect(headingBounds).not.toBeNull();
    expect(headingBounds!.x).toBeGreaterThanOrEqual(sheetBounds!.x);
    expect(headingBounds!.x + headingBounds!.width).toBeLessThanOrEqual(
      sheetBounds!.x + sheetBounds!.width,
    );
    expect(headingBounds!.y + headingBounds!.height).toBeLessThanOrEqual(
      sheetBounds!.y + sheetBounds!.height,
    );
    await expect(sheet).toHaveScreenshot('dashboard-detail-name-24580-mobile.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    });
  });
});

test.describe('detail map (MapLibre)', () => {
  test('opens from the header, updates the URL, and restores on Back/Forward', async ({ page }) => {
    await page.goto('./?view=3d');
    await primaryNav(page).getByRole('button', { name: 'Bản đồ & danh sách', exact: true }).click();
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
    await expect(page).toHaveURL(/view=map/);

    await primaryNav(page).getByRole('button', { name: '3D', exact: true }).click();
    await expect(page).toHaveURL(/view=3d/);
    await expect(page.locator('#detail-map-viewport')).toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL(/view=map/);
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
  });

  test('opens the layer panel and toggles layers without pushing new history entries', async ({
    page,
  }) => {
    await page.goto('./?view=map');
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
    const historyLength = () => page.evaluate(() => window.history.length);
    const lengthBeforeToggles = await historyLength();

    await page.getByRole('button', { name: 'Lớp bản đồ' }).click();
    // Heatmap is an "Advanced" layer (progressive disclosure) — hidden until switched.
    await page.getByRole('button', { name: 'Nâng cao' }).click();
    const heatmapCheckbox = page.getByRole('checkbox', { name: 'Heatmap' });
    await heatmapCheckbox.check();
    await expect(page).toHaveURL(/heatmap=1/);
    const roadsCheckbox = page.getByRole('checkbox', { name: 'Đường', exact: true });
    await roadsCheckbox.uncheck();
    await expect(page).toHaveURL(/roads=0/);

    expect(await historyLength()).toBe(lengthBeforeToggles);
  });

  test('disables terrain and satellite basemaps with an explanation when no source is configured', async ({
    page,
  }) => {
    await page.goto('./?view=map');
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
    await page.getByRole('button', { name: 'Lớp bản đồ' }).click();
    await expect(page.getByRole('radio', { name: 'Địa hình' })).toBeDisabled();
    await expect(page.getByRole('radio', { name: 'Vệ tinh' })).toBeDisabled();
  });

  // Production now ships a real OSM roads/buildings PMTiles source (public/maps/daklak.pmtiles,
  // VITE_DETAIL_MAP_SOURCE_URL in the committed .env.production — see
  // docs/detail-map-integration.md), so this prod-build E2E run should NOT see the "waiting for
  // data" notice; it should see real data instead. The "no source configured" scenario this test
  // used to cover here is still real for local/CI dev builds (VITE_DETAIL_MAP_SOURCE_URL empty by
  // default) — covered by DetailMapSourceNotice.test.tsx and
  // DetailMapViewport.test.tsx's "shows an honest empty-state notice..." unit test (env-stubbed),
  // not duplicated here.
  test('shows real OSM data (no empty-state notice, a working attribution link) now that a real source is configured', async ({
    page,
  }) => {
    await page.goto('./?view=map');
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
    await expect(page.getByText('Chế độ chờ dữ liệu')).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'OpenStreetMap', exact: true })).toBeVisible();
  });

  test('keeps layer toggles interactive but explains why they have no visible effect yet', async ({
    page,
  }) => {
    await page.goto('./?view=map');
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
    await page.getByRole('button', { name: 'Lớp bản đồ' }).click();
    await page.getByRole('button', { name: 'Nâng cao' }).click();
    const heatmap = page.getByRole('checkbox', { name: 'Heatmap' });
    await expect(heatmap).toBeEnabled();
    await expect(heatmap).toHaveAttribute('aria-describedby', /.+/);
  });

  test('shows detail-map gestures, not the 3D rotate copy, when onboarding opens in map view', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      window.localStorage.removeItem('daklak-dashboard:onboarding-dismissed'),
    );
    await page.goto('./?view=map');
    const dialog = page.getByRole('dialog', { name: /102 xã, phường/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('xoay góc nhìn')).toHaveCount(0);
    await expect(dialog.getByText('Lớp bản đồ')).toBeVisible();
    await dialog.getByRole('button', { name: 'Bắt đầu khám phá' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
  });

  test('measures a distance, exits with Escape, and does not select a ward while measuring', async ({
    page,
  }) => {
    await page.goto('./?view=map');
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
    await page.getByRole('button', { name: 'Lớp bản đồ' }).click();
    await page.getByRole('button', { name: 'Đo khoảng cách', exact: true }).click();
    await expect(page.getByText('Chạm vào bản đồ để thêm điểm đo.')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Đo khoảng cách', exact: true })).toBeVisible();
  });

  test('searches local ward data and pans to the selected result', async ({ page }) => {
    await page.goto('./?view=map');
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
    await page.getByRole('button', { name: 'Lớp bản đồ' }).click();
    const search = page.getByRole('searchbox', { name: 'Tìm xã, phường hoặc địa danh' });
    await search.fill('buon ma thuot');
    await expect(page.getByRole('option', { name: /Buôn Ma Thuột/ })).toBeVisible();
    await page.getByRole('option', { name: /Buôn Ma Thuột/ }).click();
    await expect(page).toHaveURL(/ward=24133/);
  });

  test('shows the accessible ward/commune directory inline when WebGL is unavailable, without navigating away', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, options) {
        if (type === 'webgl' || type === 'webgl2') return null;
        return original.call(this, type, options as never);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await page.goto('./?view=map');
    await expect(
      page.getByText('không hỗ trợ WebGL nên không thể mở bản đồ chi tiết'),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Danh sách xã, phường' })).toBeVisible();
  });

  test('has no serious automated accessibility violations in the layer panel', async ({ page }) => {
    await page.goto('./?view=map');
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
    await page.getByRole('button', { name: 'Lớp bản đồ' }).click();
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });

  test('mobile: opens the layer panel as a bottom sheet without covering essential controls', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./?view=map');
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
    await page.getByRole('button', { name: 'Lớp bản đồ' }).click();
    const panel = page.locator('.detail-map-layer-panel__content');
    await expect(panel).toBeVisible();
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.width).toBeLessThanOrEqual(390);
  });
});

test.describe('Executive Overview (Phase 2A)', () => {
  test('lands on Executive Overview by default and discloses illustrative data', async ({
    page,
  }) => {
    await page.goto('./');
    await expect(
      page.getByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' }),
    ).toBeVisible();
    // `.header-mock-badge` is desktop-only (hidden under ~1100px, see global.css) — assert on
    // Executive Overview's own badge, which is always present regardless of viewport.
    await expect(page.locator('.executive-overview__mock-badge')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chỉ số tổng quan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dự án cần chú ý' })).toBeVisible();
    // The 3D/2D/detail-map experiences must not be pulled in just to render the landing page.
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator('#detail-map-viewport')).toHaveCount(0);
  });

  test('keeps every pre-Phase-2A URL resolving to a working view (?view=2d now aliases to the merged map view)', async ({
    page,
  }) => {
    await page.goto('./?view=3d');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' }),
    ).toHaveCount(0);

    await page.goto('./?view=2d');
    await openMapDirectory(page);
    await expect(page.getByRole('heading', { name: 'Danh sách xã, phường' })).toBeVisible();

    await page.goto('./?view=map');
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
  });

  test('reaches every primary destination by keyboard alone', async ({ page }) => {
    // `.primary-nav` is now the only view-switch control (the duplicate header-meta toggle
    // buttons it used to coexist with were removed as dead-weight clutter — see the
    // header-declutter fix) and renders on every viewport, including mobile, scrolling
    // internally if needed rather than being hidden — so this test now runs unconditionally.
    await page.goto('./');
    const threeD = primaryNav(page).getByRole('button', { name: '3D', exact: true });
    await threeD.focus();
    await threeD.press('Enter');
    await expect(page.locator('canvas')).toBeVisible();

    const overview = primaryNav(page).getByRole('button', {
      name: 'Tổng quan điều hành',
      exact: true,
    });
    await overview.focus();
    await overview.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' }),
    ).toBeVisible();

    const mapAndDirectory = primaryNav(page).getByRole('button', {
      name: 'Bản đồ & danh sách',
      exact: true,
    });
    await mapAndDirectory.focus();
    await mapAndDirectory.press('Enter');
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
    // Directory visibility itself isn't part of the keyboard-reachability claim above (already
    // proven by the Enter press landing on #detail-map-viewport) — opening it here (mouse is fine)
    // just confirms the sidebar contents still exist once reached, including on a narrow viewport
    // where it starts collapsed.
    await openMapDirectory(page);
    await expect(page.getByRole('heading', { name: 'Danh sách xã, phường' })).toBeVisible();
  });

  test('opens a project summary dialog and closes it with Escape, restoring focus', async ({
    page,
  }) => {
    await page.goto('./');
    const trigger = page.getByRole('button', { name: 'Xem tóm tắt' }).first();
    await trigger.focus();
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('communicates stale data explicitly instead of hiding it', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Sức khỏe dữ liệu' })).toBeVisible();
    // The fixture seeds exactly one project with data older than the freshness SLA (see
    // src/entities/project/mockPortfolio.ts, prj-007) — it must surface, not be silent.
    await expect(page.getByText('Dữ liệu quá hạn cập nhật')).toBeVisible();
  });

  test('has no serious automated accessibility violations on Executive Overview', async ({
    page,
  }) => {
    await page.goto('./');
    await expect(
      page.getByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });

  // Heavy-chunk prefixes derived from the real build (see dist/.vite/manifest.json,
  // AdministrativeMap-*.js / three-vendor-*.js / StatPanel-*.js / maplibre-gl-*.js /
  // DetailMapViewport-*.js) — matched by filename prefix so this survives content-hash churn on
  // every rebuild instead of pinning a specific hash.
  const HEAVY_CHUNK_PATTERN =
    /\/assets\/(AdministrativeMap|three-vendor|StatPanel|maplibre-gl|DetailMapViewport)-.*\.js/;

  test('never fetches any heavy renderer (3D/ECharts/MapLibre/detail-map) landing on Executive Overview', async ({
    page,
  }) => {
    test.skip(!process.env.E2E_PRODUCTION, 'Chunk assertions require the production build');
    for (const url of ['./', './?view=overview']) {
      const responses: string[] = [];
      page.on('response', (response) => responses.push(response.url()));
      await page.goto(url);
      await expect(
        page.getByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' }),
      ).toBeVisible();
      expect(responses.some((requestUrl) => HEAVY_CHUNK_PATTERN.test(requestUrl))).toBe(false);
      page.removeAllListeners('response');
    }
  });

  // There is no longer a "heavy-renderer-free" ?view=2d landing — merging the former standalone
  // directory view into the MapLibre-based `map` experience means ?view=2d now aliases to `map`,
  // which deliberately does load the maplibre-gl chunk (it IS the map). Executive Overview above
  // remains the only zero-heavy-chunk landing route.

  test('mobile: Executive Overview fits without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');
    await expect(
      page.getByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });
});
