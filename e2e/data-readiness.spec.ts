import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Data Readiness (Phase 5 §C)', () => {
  test('opens from Executive Overview and lands on #/data-readiness', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Xem chi tiết →' }).click();
    await expect(page.getByRole('heading', { name: 'Nguồn và độ tin cậy dữ liệu' })).toBeVisible();
    await expect(page).toHaveURL(/#\/data-readiness$/);
  });

  test('direct-links into Data Readiness', async ({ page }) => {
    await page.goto('./#/data-readiness');
    await expect(page.getByRole('heading', { name: 'Nguồn và độ tin cậy dữ liệu' })).toBeVisible();
  });

  test('shows the source, counts, and three distinct issue categories', async ({ page }) => {
    await page.goto('./#/data-readiness');
    // Mặc định là chế độ Đơn giản; bảng nguồn và cảnh báo nằm ở chế độ Kỹ thuật.
    await expect(
      page.getByRole('heading', { name: /Nguồn của \d+ dự án thu hút đầu tư/ }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Kỹ thuật' }).click();
    await expect(page.getByRole('heading', { name: 'Danh mục nguồn' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bản ghi theo trạng thái' })).toBeVisible();
    await page.getByText('Xem chi tiết kỹ thuật').click();
    await expect(page.getByRole('heading', { name: /Lỗi cấu trúc/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Vấn đề chất lượng dữ liệu/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Cảnh báo nghiệp vụ/ })).toBeVisible();
  });

  test('back button returns to Executive Overview', async ({ page }) => {
    await page.goto('./#/data-readiness');
    await page.getByRole('button', { name: 'Quay lại Tổng quan điều hành' }).click();
    await expect(
      page.getByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' }),
    ).toBeVisible();
  });

  for (const mode of ['Đơn giản', 'Kỹ thuật']) {
    test(`chế độ ${mode}: không vi phạm trợ năng nghiêm trọng`, async ({ page }) => {
      await page.goto('./#/data-readiness');
      await expect(
        page.getByRole('heading', { name: 'Nguồn và độ tin cậy dữ liệu' }),
      ).toBeVisible();
      await page.getByRole('button', { name: mode }).click();
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
      ).toEqual([]);
    });
  }

  test('has no serious automated accessibility violations', async ({ page }) => {
    await page.goto('./#/data-readiness');
    await expect(page.getByRole('heading', { name: 'Nguồn và độ tin cậy dữ liệu' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });

  test('mobile: fits without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./#/data-readiness');
    await expect(page.getByRole('heading', { name: 'Nguồn và độ tin cậy dữ liệu' })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });
});
