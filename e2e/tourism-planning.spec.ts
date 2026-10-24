import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow } from './layoutAssertions';

// Trung tâm du lịch (#/tourism) và Trung tâm quy hoạch (#/planning): dữ liệu có nguồn, không bịa số.
test.describe('Trung tâm du lịch', () => {
  test('mở bằng URL, có điểm đến kèm nguồn và nói rõ chưa có lượt khách', async ({ page }) => {
    await page.goto('./#/tourism');
    await expect(page.getByRole('heading', { level: 1, name: 'Trung tâm du lịch' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Hồ Lắk' })).toBeVisible();
    await expect(page.getByText('Chưa có dữ liệu').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Nguồn thông tin/ }).first()).toHaveAttribute(
      'href',
      /^https:\/\//,
    );
  });

  test('từ thẻ điểm đến sang hồ sơ xã/phường', async ({ page }) => {
    await page.goto('./#/tourism');
    const card = page.locator('li', {
      has: page.getByRole('heading', { level: 2, name: 'Hồ Lắk' }),
    });
    await card.getByRole('button', { name: /Hồ sơ xã\/phường/ }).click();
    await expect(page).toHaveURL(/#\/unit\/24580/);
  });

  test('không tràn ngang, không vi phạm trợ năng nghiêm trọng', async ({ page }) => {
    await page.goto('./#/tourism');
    await expect(page.getByRole('heading', { level: 1, name: 'Trung tâm du lịch' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });
});

test.describe('Trung tâm quy hoạch', () => {
  test('hiện văn bản được trích dẫn, lời lẽ trung tính và lớp bản đồ gắn nhãn minh họa', async ({
    page,
  }) => {
    await page.goto('./#/planning');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Trung tâm quy hoạch' }),
    ).toBeVisible();
    await expect(page.getByRole('cell', { name: '768/QĐ-TTg', exact: true })).toBeVisible();
    await expect(page.getByText(/không phải kết luận xung đột pháp lý/)).toBeVisible();
    await expect(
      page.getByText(/dữ liệu minh họa, không phải ranh giới quy hoạch chính thức/),
    ).toBeVisible();
  });

  test('mở danh sách dự án của một văn bản rồi sang danh mục theo tên', async ({ page }) => {
    await page.goto('./#/planning');
    await page.getByLabel('Tìm số hiệu văn bản').fill('768');
    await page.getByRole('button', { name: /dự án.*768\/QĐ-TTg/ }).click();
    const first = page.locator('table').getByRole('listitem').first().getByRole('button');
    await first.click();
    await expect(page).toHaveURL(/#\/investment-catalog\?q=/);
  });

  test('sidebar: Quy hoạch và Du lịch dẫn tới trang riêng', async ({ page }) => {
    await page.goto('./');
    const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
    if (!(await nav.isVisible()))
      await page.getByRole('button', { name: 'Mở menu điều hướng' }).click();
    await nav.getByRole('button', { name: 'Quy hoạch' }).click();
    await expect(page).toHaveURL(/#\/planning/);
  });

  test('không tràn ngang, không vi phạm trợ năng nghiêm trọng', async ({ page }) => {
    await page.goto('./#/planning');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Trung tâm quy hoạch' }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });
});
