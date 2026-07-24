/// <reference lib="dom" />
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    window.localStorage.setItem('daklak-dashboard:onboarding-dismissed', 'true'),
  );
});

test.describe('Internationalization (vi/en)', () => {
  test('defaults to Vietnamese with no ?lang= param and no persisted preference', async ({
    page,
  }) => {
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(
      page.getByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' }),
    ).toBeVisible();
  });

  test('switching to English updates the visible text and html lang', async ({
    page,
  }, testInfo) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(
      page.getByRole('heading', { name: 'Key Project Executive Overview' }),
    ).toBeVisible();
    // `.primary-nav` is intentionally hidden below 900px (mobile uses the compact header-meta
    // buttons instead — see global.css) — only assert it on desktop viewports.
    if (!testInfo.project.name.includes('mobile')) {
      await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    }
  });

  test('?lang=en direct-loads in English without any prior interaction', async ({ page }) => {
    await page.goto('./?lang=en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(
      page.getByRole('heading', { name: 'Key Project Executive Overview' }),
    ).toBeVisible();
  });

  test('reloading after switching to English preserves the choice via the URL', async ({
    page,
  }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page).toHaveURL(/lang=en/);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(
      page.getByRole('heading', { name: 'Key Project Executive Overview' }),
    ).toBeVisible();
  });

  test('switching locale preserves the current ?view= and does not add a heavy renderer', async ({
    page,
  }) => {
    await page.goto('./?view=3d');
    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page).toHaveURL(/view=3d/);
    await expect(page).toHaveURL(/lang=en/);
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('switching locale preserves the current hash route (#/projects)', async ({ page }) => {
    await page.goto('./#/projects');
    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page).toHaveURL(/lang=en/);
    await expect(page).toHaveURL(/#\/projects$/);
  });

  test('switching locale preserves Project Portfolio filter query params in the hash', async ({
    page,
  }) => {
    await page.goto('./#/projects?status=delayed');
    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page).toHaveURL(/lang=en/);
    await expect(page).toHaveURL(/#\/projects\?status=delayed$/);
  });

  test('Back undoes a locale switch, Forward redoes it', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await page.getByRole('button', { name: 'Switch to English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goBack();
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await page.goForward();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('has no serious automated accessibility violations in Vietnamese', async ({ page }) => {
    await page.goto('./');
    await expect(
      page.getByRole('heading', { name: 'Tổng quan điều hành dự án trọng điểm' }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });

  test('has no serious automated accessibility violations in English', async ({ page }) => {
    await page.goto('./?lang=en');
    await expect(
      page.getByRole('heading', { name: 'Key Project Executive Overview' }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });

  test('English text does not cause horizontal overflow on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./?lang=en');
    await expect(
      page.getByRole('heading', { name: 'Key Project Executive Overview' }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
  });

  test('language switcher shows the current selection via aria-pressed, not color alone', async ({
    page,
  }) => {
    await page.goto('./');
    await expect(page.getByRole('button', { name: 'Chuyển sang tiếng Việt' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Switch to English' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('Project Portfolio renders in English, not a Vietnamese fallback', async ({ page }) => {
    await page.goto('./?lang=en#/projects');
    await expect(page.getByRole('heading', { name: 'Key project portfolio' })).toBeVisible();
    await expect(page.getByLabel('Search by project name or code')).toBeVisible();
    await expect(page.locator('.project-portfolio__mock-badge')).toContainText('ILLUSTRATIVE DATA');
  });

  test('Project Detail renders in English, not a Vietnamese fallback', async ({ page }) => {
    await page.goto('./?lang=en#/projects');
    await page
      .getByRole('button', { name: /DL-2026-/ })
      .first()
      .click();
    await expect(page).toHaveURL(/#\/projects\/prj-/);
    await expect(page.getByText('Budget and progress summary')).toBeVisible();
    await expect(page.locator('.project-detail__mock-badge')).toContainText('ILLUSTRATIVE DATA');
  });

  test('the 2D directory renders in English', async ({ page }) => {
    await page.goto('./?lang=en&view=2d');
    const directoryToggle = page.getByRole('button', { name: 'Directory', exact: true });
    if (await directoryToggle.isVisible()) await directoryToggle.click();
    await expect(page.getByRole('heading', { name: 'List of communes/wards' })).toBeVisible();
    await expect(page.getByLabel('Search by name or code')).toBeVisible();
  });

  test('the detail map layer panel renders in English', async ({ page }) => {
    await page.goto('./?lang=en&view=map');
    await page.getByRole('button', { name: 'Map layers' }).click();
    await expect(page.getByRole('heading', { name: 'Information layers' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Map type' })).toBeVisible();
  });

  test('has no serious automated accessibility violations on Project Portfolio in English', async ({
    page,
  }) => {
    await page.goto('./?lang=en#/projects');
    await expect(page.getByRole('heading', { name: 'Key project portfolio' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'),
    ).toEqual([]);
  });
});
