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
});
