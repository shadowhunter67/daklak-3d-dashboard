import { expect, test } from '@playwright/test';

test.describe('dashboard smoke tests', () => {
  test('loads the terrain, controls, and sourced overview', async ({ page }) => {
    await page.goto('./');

    await expect(page.getByRole('heading', { name: /Đắk Lắk/i })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tổng quan' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByText('SỐ LIỆU CẤP TỈNH CÓ NGUỒN')).toBeVisible();
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
    await expect(row).toHaveAttribute('aria-pressed', 'true');
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
    await expect(canvas).toBeVisible();
    await canvas.dispatchEvent('webglcontextlost');
    await expect(page.getByRole('heading', { name: 'Không thể hiển thị bản đồ 3D' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Thử tải lại' })).toBeVisible();
    await canvas.dispatchEvent('webglcontextrestored');
    await expect(page.getByRole('heading', { name: 'Không thể hiển thị bản đồ 3D' })).toBeHidden();
  });

  test('matches the dashboard shell visual baseline', async ({ page }) => {
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
});
