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

test.describe('Tổng quan và tìm kiếm (V3)', () => {
  test('Tổng quan có Việc cần xử lý, Nội dung cần bổ sung và quy mô vốn, nói rõ không phải vốn giải ngân', async ({
    page,
  }) => {
    await page.goto('./?view=overview');
    const decisions = page.getByRole('region', { name: 'Việc cần xử lý' });
    await expect(decisions).toBeVisible();
    await expect(decisions).toContainText('Cần rà soát quy hoạch');
    await expect(decisions).toContainText('Đơn vị chịu trách nhiệm');
    const gaps = page.getByRole('region', { name: 'Nội dung cần bổ sung' });
    await expect(gaps).toContainText('xã/phường chưa có ảnh đã xác minh');
    const economy = page.getByRole('region', { name: 'Quy mô vốn theo lĩnh vực' });
    await expect(economy).toContainText('chưa phải vốn đã giải ngân hay đã cam kết');
  });

  test('tìm số hiệu văn bản quy hoạch ở ô tìm kiếm chung và mở trang Quy hoạch', async ({
    page,
  }) => {
    await page.goto('./');
    const search = page.getByRole('combobox', { name: /Tìm kiếm/ });
    await search.click();
    await search.fill('768/QĐ');
    const option = page.getByRole('option', { name: /768\/QĐ-TTg/ });
    await expect(option).toBeVisible();
    await option.click();
    await expect(page).toHaveURL(/#\/planning/);
  });
});

test.describe('Góc nhìn bản đồ chi tiết', () => {
  test('chọn góc nhìn Du lịch bật lớp điểm đến và ghi vào URL; Điều hành tắt lại', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      window.localStorage.setItem('daklak-dashboard:onboarding-dismissed', 'true'),
    );
    await page.goto('./?view=map');
    await page.getByRole('button', { name: 'Lớp bản đồ' }).click();
    const group = page.getByRole('group', { name: 'Góc nhìn' });
    await expect(group.getByRole('button', { name: 'Điều hành' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await group.getByRole('button', { name: 'Du lịch' }).click();
    await expect(group.getByRole('button', { name: 'Du lịch' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('checkbox', { name: /Điểm đến du lịch/ })).toBeChecked();
    await expect.poll(() => page.url()).toContain('tourism=1');
    await group.getByRole('button', { name: 'Điều hành' }).click();
    await expect(page.getByRole('checkbox', { name: /Điểm đến du lịch/ })).not.toBeChecked();
  });
});

test.describe('Nhãn bản đồ Tổng quan', () => {
  test('102 tên đều hiện và không nhãn nào chồng lên nhãn khác', async ({ page }) => {
    await page.goto('./?view=overview');
    const labels = page.locator('.overview-workspace__map-labels text');
    await expect(labels).toHaveCount(102);
    const overlaps = await labels.evaluateAll((nodes) => {
      // Chiều ngang lấy từ chữ thật (đã ép đúng `textLength`); chiều cao dùng hộp chữ cố định quanh
      // tâm chữ (11px x 1.3) vì chiều cao hộp bao của phông khác nhau giữa nền tảng.
      // Chạm mép (độ sâu chồng ≤ 0,5px do làm tròn) không tính là chồng.
      const boxes = nodes.map((node) => {
        const b = node.getBoundingClientRect();
        const midY = (b.top + b.bottom) / 2;
        const scale = (node as SVGGraphicsElement).getScreenCTM()?.a ?? 1;
        const half = (11 * 1.3 * scale) / 2;
        return { left: b.left, right: b.right, top: midY - half, bottom: midY + half };
      });
      const pairs: string[] = [];
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i];
          const b = boxes[j];
          if (
            Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5
          )
            pairs.push(
              `${nodes[i].textContent} / ${nodes[j].textContent}: ${(Math.min(a.right, b.right) - Math.max(a.left, b.left)).toFixed(1)}x${(Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)).toFixed(1)}`,
            );
        }
      }
      return pairs;
    });
    expect(overlaps).toEqual([]);
  });
});
