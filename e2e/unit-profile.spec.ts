import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow } from './layoutAssertions';

// Hồ sơ xã/phường (#/unit/<mã>): số liệu thật, điểm du lịch suy ra từ ranh giới, dự án thu hút đầu tư,
// ảnh điểm đến trong địa bàn (hoặc hình ranh giới khi chưa có ảnh), độ phủ hình ảnh đếm từ dữ liệu.
test.describe('Hồ sơ xã/phường', () => {
  test('mở trực tiếp bằng URL, hiện số liệu thật và điểm du lịch trong ranh giới', async ({
    page,
  }) => {
    await page.goto('./#/unit/24580');
    await expect(page.getByRole('heading', { level: 1, name: /Liên Sơn Lắk/ })).toBeVisible();
    await expect(page.getByText('Mật độ dân số')).toBeVisible();
    const tourism = page.getByRole('region', { name: 'Điểm du lịch trong địa bàn' });
    await expect(tourism).toContainText('Hồ Lắk');
    await expect(tourism).toContainText('suy ra');
    await expect(page.getByRole('img', { name: /Ảnh tham chiếu của Hồ Lắk/ })).toBeVisible();
    await expect(page.getByText(/\d+\/102 đơn vị có ảnh đã xác minh/)).toBeVisible();
  });

  test('dự án thu hút đầu tư của đơn vị dẫn sang danh mục đã lọc theo địa bàn', async ({
    page,
  }) => {
    await page.goto('./#/unit/24235');
    const section = page.getByRole('region', { name: 'Dự án thu hút đầu tư trong địa bàn' });
    await expect(section).toBeVisible();
    const viewAll = section.getByRole('button', { name: /Xem tất cả trong danh mục/ });
    await expect(viewAll).toBeVisible();
    await viewAll.click();
    await expect(page).toHaveURL(/#\/investment-catalog\?area=24235/);
    await expect(page.locator('.project-portfolio__result-count')).toContainText('Hiển thị');
  });

  test('mã không tồn tại không làm hỏng trang', async ({ page }) => {
    await page.goto('./#/unit/99999');
    await expect(page.getByText(/Không tìm thấy đơn vị hành chính/)).toBeVisible();
  });

  test('không tràn ngang và không có vi phạm trợ năng nghiêm trọng', async ({ page }) => {
    await page.goto('./#/unit/24580');
    await expect(page.getByRole('heading', { level: 1, name: /Liên Sơn Lắk/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });
});
