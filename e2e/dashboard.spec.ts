/// <reference lib="dom" />
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
    await page.getByRole('button', { name: 'Danh sách 2D' }).click();

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

    await page.getByRole('button', { name: 'Danh sách 2D' }).click();
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

  test('does not load 3D or chart chunks when starting in accessible 2D mode', async ({ page }) => {
    test.skip(!process.env.E2E_PRODUCTION, 'Chunk assertions require the production build');
    const responses: string[] = [];
    page.on('response', (response) => responses.push(response.url()));
    await page.goto('./?view=2d');
    await expect(page.getByRole('heading', { name: 'Danh sách xã, phường' })).toBeVisible();
    expect(
      responses.some((url) =>
        /\/assets\/(AdministrativeMap|StatPanel|three-vendor)-.*\.js/.test(url),
      ),
    ).toBe(false);
  });

  test('restores shareable URL state and browser history', async ({ page }) => {
    await page.goto('./?view=2d&mode=energy&ward=22015');
    await expect(page.getByRole('heading', { name: 'Danh sách xã, phường' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Năng lượng' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const selectedRow = page.locator('[role="row"][aria-selected="true"]');
    await expect(selectedRow).toContainText(/Tuy Ho/);

    await page.getByRole('button', { name: 'Bản đồ 3D' }).click();
    await expect(page).toHaveURL(/view=3d&mode=energy&ward=22015/);
    await expect(page.locator('#map-viewport')).toBeFocused();
    await page.goBack();
    await expect(page).toHaveURL(/view=2d&mode=energy&ward=22015/);
    await expect(page.getByRole('heading', { name: 'Danh sách xã, phường' })).toBeFocused();
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
    await page.getByRole('button', { name: 'Mở danh sách 2D' }).click();
    await expect(page.getByRole('heading', { name: 'Danh sách xã, phường' })).toBeFocused();
  });
});
