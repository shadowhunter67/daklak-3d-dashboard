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
  test('"Bỏ qua để tới nội dung chính" là phần tử focus được đầu tiên trong tài liệu và đưa tới nội dung', async ({
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
    // Kích hoạt liên kết (như Enter) rồi kiểm tra đích: không phụ thuộc cách từng trình duyệt hiện :focus.
    await page.evaluate(() => document.querySelector<HTMLElement>('.skip-link')?.click());
    // Vẫn ở trang Du lịch (hash không bị đổi thành #tourism-hub) và focus vào vùng nội dung.
    await expect(page).toHaveURL(/#\/tourism$/);
    await expect(page.locator('#tourism-hub')).toBeFocused();
  });

  test('Tab đi qua các nút và liên kết của trang Du lịch, mỗi phần tử có viền focus nhìn thấy được', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit mặc định không đưa liên kết vào thứ tự Tab (cài đặt hệ thống)',
    );
    await page.goto('./#/tourism');
    const seen = new Set<string>();
    for (let i = 0; i < 14; i += 1) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const node = document.activeElement as HTMLElement | null;
        if (!node || node === document.body) return null;
        const style = getComputedStyle(node);
        return {
          label: (node.getAttribute('aria-label') ?? node.textContent ?? '').trim().slice(0, 40),
          outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 1,
          shadow: style.boxShadow !== 'none',
          bg: style.backgroundColor,
        };
      });
      if (!info) continue;
      seen.add(info.label);
      expect(info.outline || info.shadow, `"${info.label}" không có viền focus`).toBe(true);
    }
    expect(seen.size).toBeGreaterThan(5);
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
