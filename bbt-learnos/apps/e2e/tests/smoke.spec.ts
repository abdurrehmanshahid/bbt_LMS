import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BBT|LearnOS|Big Binary/i);
  });

  test('tracks page renders', async ({ page }) => {
    await page.goto('/tracks');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('jobs page renders', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('auth login page renders', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('unauthenticated dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Learner auth flow', () => {
  const email = process.env['TEST_LEARNER_EMAIL'] ?? '';
  const password = process.env['TEST_LEARNER_PASSWORD'] ?? '';

  test.skip(!email || !password, 'TEST_LEARNER_EMAIL/PASSWORD not set');

  test('learner can log in and see dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Feed')).toBeVisible();
  });
});
