/// <reference lib="dom" />
import { expect, test, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openMobileDirectory(page: import('@playwright/test').Page) {
  const toggle = page.getByRole('button', { name: 'Danh sách', exact: true });
  if (await toggle.isVisible()) await toggle.click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem('daklak-dashboard:onboarding-dismissed', 'true'),
  );
});

test.describe('dashboard smoke tests', () => {
  test('loads the terrain, controls, and sourced overview', async ({ page }) => {
    const runtimeErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('requestfailed', (request) => failedRequests.push(request.url()));
    await page.goto('./');

    await expect(page.getByRole('heading', { name: /Đắk Lắk/i })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tổng quan' })).toHaveAttribute(
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
    await page.goto('./');

    for (const mode of ['Năng lượng', 'Heatmap']) {
      const tab = page.getByRole('button', { name: mode });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByLabel('Chế độ đang dùng dữ liệu minh họa')).toBeVisible();
    }
  });

  test('supports search, keyboard navigation, and shared selection in 2D mode', async ({
    page,
  }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Mở danh sách 2D' }).click();
    await openMobileDirectory(page);

    const search = page.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' });
    await search.fill('buon ma thuot');
    await expect(page.getByRole('status')).toContainText('Tìm thấy 1 đơn vị');
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
    await page.goto('./');
    await expect(page.getByRole('button', { name: 'Đã giảm chuyển động' })).toBeDisabled();
  });

  test('preserves native arrow-key behavior on interactive controls', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('canvas')).toBeVisible();
    const switchView = page.getByRole('button', { name: 'Mở danh sách 2D' });
    const controlEventWasNotCancelled = await switchView.evaluate((element) =>
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      ),
    );
    expect(controlEventWasNotCancelled).toBe(true);
  });

  test('shows a recovery path after WebGL context loss', async ({ page }) => {
    await page.goto('./');
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
    await page.goto('./');
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForTimeout(800);

    await expect(page).toHaveScreenshot('dashboard-overview.png', {
      animations: 'disabled',
      mask: [page.locator('canvas')],
      maskColor: '#071918',
      maxDiffPixelRatio: 0.03,
    });
  });

  test('has no serious automated accessibility violations in 3D and 2D views', async ({ page }) => {
    await page.goto('./');
    const threeDimensionalResults = await new AxeBuilder({ page }).analyze();
    expect(
      threeDimensionalResults.violations.filter(
        ({ impact }) => impact === 'critical' || impact === 'serious',
      ),
    ).toEqual([]);

    await page.getByRole('button', { name: 'Mở danh sách 2D' }).click();
    const tableResults = await new AxeBuilder({ page }).analyze();
    expect(
      tableResults.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });

  test('loads lazy chunks and textures from the GitHub Pages base path', async ({ page }) => {
    test.skip(!process.env.E2E_PRODUCTION, 'Hashed asset assertions require the production build');
    test.skip(!test.info().project.name.includes('chromium'), 'Asset loading is verified once');
    const responses: string[] = [];
    page.on('response', (response) => responses.push(response.url()));
    await page.goto('./');
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

  test('does not load 3D or chart chunks when starting in accessible 2D mode', async ({ page }) => {
    test.skip(!process.env.E2E_PRODUCTION, 'Chunk assertions require the production build');
    const responses: string[] = [];
    page.on('response', (response) => responses.push(response.url()));
    await page.goto('./?view=2d');
    await expect(page.getByRole('heading', { name: '102 xã, phường' })).toBeVisible();
    expect(
      responses.some((url) =>
        /\/assets\/(AdministrativeMap|StatPanel|three-vendor)-.*\.js/.test(url),
      ),
    ).toBe(false);
  });

  test('restores shareable URL state and browser history', async ({ page }) => {
    await page.goto('./?view=2d&mode=energy&ward=22015');
    await openMobileDirectory(page);
    await expect(page.getByRole('heading', { name: 'Danh sách xã, phường' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Năng lượng' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const selectedRow = page.locator('[role="row"][aria-selected="true"]');
    await expect(selectedRow).toContainText(/Tuy Ho/);

    await page.getByRole('button', { name: 'Mở bản đồ 3D' }).click();
    await expect(page).toHaveURL(/view=3d&mode=energy&ward=22015/);
    await expect(page.locator('#map-viewport')).toBeFocused();
    await page.goBack();
    await expect(page).toHaveURL(/view=2d&mode=energy&ward=22015/);
    await expect(page.getByRole('heading', { name: '102 xã, phường' })).toBeFocused();
  });

  test('loads the offline road artifact only when enabled in 2D', async ({ page }) => {
    const roadRequest = page.waitForResponse((response) =>
      response.url().endsWith('/data/daklak-roads.json.gz'),
    );
    await page.goto('./?view=2d');
    await page.getByRole('button', { name: 'Hiện lớp đường giao thông' }).click();
    expect((await roadRequest).ok()).toBe(true);
    await expect(page.locator('.map-road')).toHaveCount(1201);
    await expect(
      page.getByText('© OpenStreetMap contributors · ODbL 1.0 · dữ liệu tham khảo'),
    ).toBeVisible();
  });

  test('adaptive administrative and road label visual coverage', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('chromium'), 'Chromium visual coverage');
    const mobile = testInfo.project.name.includes('mobile');
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
    await page.goto('./?view=2d');
    await expect(page.locator('[data-label-code]')).not.toHaveCount(0);
    expect(await page.locator('[data-label-code]').count()).toBeGreaterThan(mobile ? 20 : 40);
    await page.locator('.header-meta button').nth(2).click();
    await expect(page.locator('.map-road')).toHaveCount(1201);
    expect(await page.locator('.map-road-labels text').count()).toBeGreaterThan(0);
    await expect(page.locator('.administrative-map-2d')).toHaveScreenshot(
      'adaptive-map-labels.png',
      { animations: 'disabled', maxDiffPixelRatio: 0.03 },
    );
  });

  test('moves focus to the 2D fallback when WebGL is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, options) {
        if (type === 'webgl' || type === 'webgl2') return null;
        return original.call(this, type, options as never);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Không thể hiển thị bản đồ 3D' })).toBeVisible();
    await page.locator('.map-fallback').getByRole('button', { name: 'Mở danh sách 2D' }).click();
    await expect(page.getByRole('heading', { name: '102 xã, phường' })).toBeFocused();
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
    await expect(page.getByRole('button', { name: 'Mở danh sách 2D' })).toBeVisible();
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

  test('keeps heatmap and 2D directory usable without horizontal overflow', async ({ page }) => {
    await page.goto('./?view=3d&mode=heatmap');
    await expect(page.getByRole('button', { name: 'Heatmap' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Mở danh sách 2D' }).click();
    await openMobileDirectory(page);
    await expect(page.getByRole('searchbox', { name: 'Tìm theo tên hoặc mã' })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
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
    await page.getByRole('button', { name: 'Mở danh sách 2D' }).click();
    await openMobileDirectory(page);
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
      await openMobileDirectory(page);
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
      await lastRow.scrollIntoViewIfNeeded();
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
    await openMobileDirectory(page);
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
