import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Data Readiness (Phase 5 §C)', () => {
  test('opens from Executive Overview and lands on #/data-readiness', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Xem Data Readiness' }).click();
    await expect(page.getByRole('heading', { name: 'Mức độ sẵn sàng dữ liệu' })).toBeVisible();
    await expect(page).toHaveURL(/#\/data-readiness$/);
  });

  test('direct-links into Data Readiness', async ({ page }) => {
    await page.goto('./#/data-readiness');
    await expect(page.getByRole('heading', { name: 'Mức độ sẵn sàng dữ liệu' })).toBeVisible();
  });

  test('shows the source, counts, and three distinct issue categories', async ({ page }) => {
    await page.goto('./#/data-readiness');
    await expect(page.getByRole('heading', { name: 'Nguồn dữ liệu' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Số lượng bản ghi' })).toBeVisible();
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

  test('has no serious automated accessibility violations', async ({ page }) => {
    await page.goto('./#/data-readiness');
    await expect(page.getByRole('heading', { name: 'Mức độ sẵn sàng dữ liệu' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });

  test('mobile: fits without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./#/data-readiness');
    await expect(page.getByRole('heading', { name: 'Mức độ sẵn sàng dữ liệu' })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });
});
