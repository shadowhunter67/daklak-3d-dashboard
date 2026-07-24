import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Heavy-chunk prefixes derived from the real build (see dashboard.spec.ts for the same pattern) —
// matched by filename prefix so this survives content-hash churn on every rebuild.
const HEAVY_CHUNK_PATTERN =
  /\/assets\/(AdministrativeMap|three-vendor|StatPanel|maplibre-gl|DetailMapViewport)-.*\.js/;

test.describe('Project Portfolio (Phase 2B1)', () => {
  test('opens from Executive Overview and lands on #/projects', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Xem danh mục dự án →' }).click();
    await expect(page.getByRole('heading', { name: 'Danh mục dự án trọng điểm' })).toBeVisible();
    await expect(page).toHaveURL(/#\/projects$/);
    await expect(page.locator('.project-portfolio__mock-badge')).toBeVisible();
  });

  test('direct-links into Portfolio', async ({ page }) => {
    await page.goto('./#/projects');
    await expect(page.getByRole('heading', { name: 'Danh mục dự án trọng điểm' })).toBeVisible();
  });

  test('search filters the list and updates the result count without excess churn', async ({
    page,
  }) => {
    await page.goto('./#/projects');
    await expect(page.getByRole('heading', { name: 'Danh mục dự án trọng điểm' })).toBeVisible();
    const resultCount = page.locator('.project-portfolio__result-count');
    const before = await resultCount.textContent();
    await page.getByLabel('Tìm theo tên hoặc mã dự án').fill('zzzzz-no-such-project-zzzzz');
    await expect(page.getByText('Không có dự án nào khớp với bộ lọc hiện tại.')).toBeVisible();
    const after = await resultCount.textContent();
    expect(after).not.toBe(before);
  });

  test('filter-then-share-URL round-trip: reloading a filtered URL reproduces the same filters', async ({
    page,
  }) => {
    await page.goto('./#/projects');
    await page.getByLabel('Trạng thái', { exact: true }).selectOption('delayed');
    await expect(page).toHaveURL(/status=delayed/);
    const url = page.url();
    await page.goto(url);
    await expect(page.getByLabel('Trạng thái', { exact: true })).toHaveValue('delayed');
  });

  test('clear filters resets the URL and list', async ({ page }) => {
    await page.goto('./#/projects?status=delayed');
    await expect(page.getByLabel('Trạng thái', { exact: true })).toHaveValue('delayed');
    await page.getByRole('button', { name: 'Xoá bộ lọc' }).click();
    await expect(page).not.toHaveURL(/status=/);
  });

  test('opens Project Detail from a Portfolio row', async ({ page }) => {
    await page.goto('./#/projects');
    await page
      .getByRole('button', { name: /DL-2026-/ })
      .first()
      .click();
    await expect(page).toHaveURL(/#\/projects\/prj-/);
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  });

  test('mobile: renders cards, not a horizontally-scrolling wide table', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./#/projects');
    await expect(page.getByRole('heading', { name: 'Danh mục dự án trọng điểm' })).toBeVisible();
    await expect(page.locator('.project-portfolio-table-wrap')).toBeHidden();
    await expect(page.locator('.project-portfolio-cards').first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });

  test('keyboard-only: can tab to and open a project row', async ({ page }, testInfo) => {
    // Touch-emulated mobile Chromium does not reliably deliver a synthetic Enter-key click the
    // same way real keyboard hardware does — the same caveat the pre-existing keyboard-nav test
    // in dashboard.spec.ts documents (`Primary nav is a desktop-only control`). This assertion is
    // about real keyboard operability, which desktop-chromium and desktop-webkit both cover.
    test.skip(
      testInfo.project.name.includes('mobile'),
      'Keyboard/Enter emulation is unreliable on touch-emulated mobile browsers',
    );
    await page.goto('./#/projects');
    const firstRowLink = page.locator('.project-portfolio__row-link').first();
    await firstRowLink.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/projects\/prj-/);
  });

  test('has no serious automated accessibility violations', async ({ page }) => {
    await page.goto('./#/projects');
    await expect(page.getByRole('heading', { name: 'Danh mục dự án trọng điểm' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });

  test('never fetches any heavy renderer (3D/ECharts/MapLibre) on Portfolio', async ({ page }) => {
    test.skip(!process.env.E2E_PRODUCTION, 'Chunk assertions require the production build');
    const responses: string[] = [];
    page.on('response', (response) => responses.push(response.url()));
    await page.goto('./#/projects');
    await expect(page.getByRole('heading', { name: 'Danh mục dự án trọng điểm' })).toBeVisible();
    expect(responses.some((url) => HEAVY_CHUNK_PATTERN.test(url))).toBe(false);
  });
});

test.describe('Project Detail (Phase 2B1)', () => {
  test('direct-links into a Project Detail URL', async ({ page }) => {
    await page.goto('./#/projects/prj-001');
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(page.locator('.project-detail__mock-badge')).toBeVisible();
  });

  test('refreshing on a Detail URL still renders the same project', async ({ page }) => {
    await page.goto('./#/projects/prj-001');
    const heading = await page.getByRole('heading', { level: 2 }).textContent();
    await page.reload();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(heading ?? '');
  });

  test('Back/Forward navigates between Portfolio and Detail correctly', async ({ page }) => {
    await page.goto('./#/projects');
    await page
      .getByRole('button', { name: /DL-2026-/ })
      .first()
      .click();
    await expect(page).toHaveURL(/#\/projects\/prj-/);
    await page.goBack();
    await expect(page).toHaveURL(/#\/projects$/);
    await expect(page.getByRole('heading', { name: 'Danh mục dự án trọng điểm' })).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(/#\/projects\/prj-/);
  });

  test('shows a not-found state with a way back to Portfolio for an unknown project id', async ({
    page,
  }) => {
    await page.goto('./#/projects/does-not-exist');
    await expect(page.getByRole('heading', { name: 'Không tìm thấy dự án' })).toBeVisible();
    await page.getByRole('button', { name: /Danh mục dự án/ }).click();
    await expect(page).toHaveURL(/#\/projects$/);
  });

  test('shows work packages, milestones, progress history and issues sections', async ({
    page,
  }) => {
    await page.goto('./#/projects/prj-001');
    await expect(page.getByRole('heading', { name: /Gói thầu/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Mốc tiến độ/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lịch sử tiến độ' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Vướng mắc/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nguồn dữ liệu' })).toBeVisible();
  });

  test('shows an explicit no-geometry message rather than a dead map button', async ({ page }) => {
    // prj-009 is the fixture's deliberately geometry-less project (see docs/domain-model.md).
    await page.goto('./#/projects/prj-009');
    await expect(page.getByText('Chưa có dữ liệu vị trí.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xem trên bản đồ' })).toHaveCount(0);
  });

  test('mobile: Project Detail fits without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./#/projects/prj-001');
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });

  test('has no serious automated accessibility violations', async ({ page }) => {
    await page.goto('./#/projects/prj-001');
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });

  test('never fetches any heavy renderer (3D/ECharts/MapLibre) on Detail', async ({ page }) => {
    test.skip(!process.env.E2E_PRODUCTION, 'Chunk assertions require the production build');
    const responses: string[] = [];
    page.on('response', (response) => responses.push(response.url()));
    await page.goto('./#/projects/prj-001');
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    expect(responses.some((url) => HEAVY_CHUNK_PATTERN.test(url))).toBe(false);
  });
});

test.describe('Routing regression (ADR 0002)', () => {
  test('legacy ?view= URLs still work byte-for-byte identically alongside hash routes', async ({
    page,
  }) => {
    await page.goto('./?view=3d');
    await expect(page.locator('canvas')).toBeVisible();

    await page.goto('./?view=2d');
    await expect(page.getByRole('heading', { name: '102 xã, phường', exact: true })).toBeVisible();

    await page.goto('./?view=map');
    await expect(page.locator('#detail-map-viewport')).toBeVisible();
  });

  test('a project route takes priority over whatever ?view= happens to be present', async ({
    page,
  }) => {
    await page.goto('./?view=3d#/projects');
    await expect(page.getByRole('heading', { name: 'Danh mục dự án trọng điểm' })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
  });
});
