import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow } from './layoutAssertions';

// Cứng hóa trợ năng (V4): các trang chính phải dùng được ở cỡ chữ A+ và khi phóng 200% (mô phỏng bằng
// khung nhìn hẹp một nửa), không tràn ngang, không vi phạm axe mức serious/critical, và điều hướng
// được bằng bàn phím.
const ROUTES: Array<{ name: string; hash: string; heading: RegExp }> = [
  { name: 'Tổng quan', hash: '', heading: /Tổng quan điều hành/ },
  { name: 'Du lịch', hash: '#/tourism', heading: /Trung tâm du lịch/ },
  { name: 'Quy hoạch', hash: '#/planning', heading: /Trung tâm quy hoạch/ },
  { name: 'Hồ sơ xã/phường', hash: '#/unit/24580', heading: /Liên Sơn Lắk/ },
  { name: 'Thu hút đầu tư', hash: '#/investment-catalog', heading: /Danh mục thu hút đầu tư/ },
  { name: 'Báo cáo', hash: '#/reports', heading: /Báo cáo/ },
  { name: 'Dữ liệu & nguồn', hash: '#/data-readiness', heading: /Nguồn và độ tin cậy dữ liệu/ },
];

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter(({ impact }) => impact === 'critical' || impact === 'serious')
    .map(({ id, nodes }) => `${id} (${nodes.length})`);
}

async function setLargestFont(page: Page) {
  const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
  if (!(await nav.isVisible()))
    await page.getByRole('button', { name: 'Mở menu điều hướng' }).click();
  await page
    .getByRole('button', { name: /Chữ lớn hơn/ })
    .first()
    .click();
  // Đóng menu di động để không che nội dung.
  const close = page.getByRole('button', { name: 'Đóng menu điều hướng' });
  if (await close.isVisible()) await close.click();
}

test.describe('Cỡ chữ A+', () => {
  for (const route of ROUTES) {
    test(`${route.name}: không tràn ngang và không vi phạm axe nghiêm trọng`, async ({ page }) => {
      await page.goto(`./${route.hash}`);
      await setLargestFont(page);
      await expect(
        page.getByRole('heading', { level: 1, name: route.heading }).first(),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
});

test.describe('Phóng 200% (khung nhìn một nửa)', () => {
  test.use({ viewport: { width: 640, height: 400 } });
  for (const route of ROUTES) {
    test(`${route.name}: nội dung vẫn đọc được, không tràn ngang`, async ({ page }) => {
      await page.goto(`./${route.hash}`);
      await expect(
        page.getByRole('heading', { level: 1, name: route.heading }).first(),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
});

test.describe('Bàn phím', () => {
  test('"Bỏ qua để tới nội dung chính" là phần tử focus được đầu tiên trong tài liệu, hiện ra khi focus và đưa focus vào nội dung', async ({
    page,
  }) => {
    await page.goto('./#/tourism');
    const firstFocusable = await page.evaluate(
      () =>
        document
          .querySelector<HTMLElement>('a[href], button, input, select, textarea, [tabindex="0"]')
          ?.textContent?.trim() ?? '',
    );
    expect(firstFocusable).toMatch(/Bỏ qua để tới nội dung chính/);
    const skip = page.getByRole('link', { name: /Bỏ qua để tới nội dung chính/ });
    await skip.focus();
    await expect(skip).toBeFocused();
    // Liên kết trượt vào khung nhìn bằng transition 120ms: chờ tới khi nhìn thấy hoàn toàn.
    await expect.poll(async () => (await skip.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(0);
    await page.keyboard.press('Enter');
    await expect(page.locator('#tourism-hub')).toBeFocused();
  });

  test('mọi nút và liên kết trên trang Du lịch có viền focus nhìn thấy được', async ({ page }) => {
    await page.goto('./#/tourism');
    const focusable = page.locator(
      '#tourism-hub a[href], #tourism-hub button, #tourism-hub select, #tourism-hub input',
    );
    const count = Math.min(await focusable.count(), 12);
    expect(count).toBeGreaterThan(3);
    for (let i = 0; i < count; i += 1) {
      const element = focusable.nth(i);
      await element.focus();
      const outline = await element.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          width: parseFloat(style.outlineWidth) || 0,
          style: style.outlineStyle,
          shadow: style.boxShadow,
        };
      });
      const visible = (outline.style !== 'none' && outline.width >= 1) || outline.shadow !== 'none';
      expect(visible, `phần tử #${i} không có viền focus`).toBe(true);
    }
  });

  test('ô tìm kiếm chung dùng được bằng bàn phím: gõ số hiệu rồi Enter mở trang Quy hoạch', async ({
    page,
  }) => {
    await page.goto('./');
    const search = page.getByRole('combobox', { name: /Tìm kiếm/ });
    await search.focus();
    await search.fill('768/QĐ');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/planning/);
  });
});
