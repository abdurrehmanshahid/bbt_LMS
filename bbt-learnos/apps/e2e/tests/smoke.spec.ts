import { test, expect, type Page } from '@playwright/test';

const API = process.env['API_URL'] ?? 'http://localhost:4000/api';
const DEMO_PASSWORD = process.env['TEST_DEMO_PASSWORD'] ?? 'Password123!';

const roleLogins = [
  {
    role: 'learner',
    email: process.env['TEST_LEARNER_EMAIL'] ?? 'learner@bbt.edu.pk',
    password: process.env['TEST_LEARNER_PASSWORD'] ?? DEMO_PASSWORD,
    returnUrl: '/dashboard',
    defaultUrl: /\/dashboard/,
    expectedUrl: /\/dashboard/,
    expectedText: /Your Track|Browse Tracks|Feed/i,
  },
  {
    role: 'creator',
    email: process.env['TEST_CREATOR_EMAIL'] ?? 'creator@bbt.edu.pk',
    password: process.env['TEST_CREATOR_PASSWORD'] ?? DEMO_PASSWORD,
    returnUrl: '/creator/dashboard',
    defaultUrl: /\/creator\/dashboard/,
    expectedUrl: /\/creator\/dashboard/,
    expectedText: /Creator Dashboard/i,
  },
  {
    role: 'admin',
    email: process.env['TEST_ADMIN_EMAIL'] ?? 'admin@bbt.edu.pk',
    password: process.env['TEST_ADMIN_PASSWORD'] ?? DEMO_PASSWORD,
    returnUrl: '/admin/health',
    defaultUrl: /\/admin\/health/,
    expectedUrl: /\/admin\/health/,
    expectedText: /Platform Health/i,
  },
] as const;

async function login(page: Page, email: string, password: string, returnUrl?: string): Promise<void> {
  const path = returnUrl ? `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/auth/login';
  await page.goto(path, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);

  const loginResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  expect((await loginResponse).ok()).toBeTruthy();
  await page.waitForFunction(
    `(() => {
      const raw = window.localStorage.getItem('bbt-auth');
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw);
        return Boolean(parsed && parsed.state && parsed.state.accessToken);
      } catch {
        return false;
      }
    })()`,
    undefined,
    { timeout: 30_000 },
  );
}

test.describe('Smoke tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveTitle(/BBT|LearnOS|Big Binary/i);
  });

  test('tracks page renders', async ({ page }) => {
    await page.goto('/tracks', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('tracks listing exposes direct enrollment CTAs', async ({ page }) => {
    await page.goto('/tracks', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const directCtas = page.locator('a,button').filter({ hasText: /Start Free|Enroll Free/i });
    await expect(directCtas.nth(1)).toBeVisible({ timeout: 30_000 });
  });

  test('skills page renders technology browsing with enrollment CTAs', async ({ page }) => {
    await page.goto('/skills', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByRole('heading', { name: /Browse by skill/i })).toBeVisible();
    const directCtas = page.locator('a,button').filter({ hasText: /Start Free|Enroll Free/i });
    await expect(directCtas.nth(1)).toBeVisible({ timeout: 30_000 });
  });

  test('jobs page renders', async ({ page }) => {
    await page.goto('/jobs', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('auth login page renders', async ({ page }) => {
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('unauthenticated dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 30_000 });
  });
});

test.describe('Demo role auth flows', () => {
  for (const account of roleLogins) {
    test(`${account.role} can log in and reach role home`, async ({ page }) => {
      await login(page, account.email, account.password, account.returnUrl);
      await expect(page).toHaveURL(account.expectedUrl, { timeout: 30_000 });
      await expect(page.getByText(account.expectedText).first()).toBeVisible();
    });

    test(`${account.role} default login routes to role dashboard`, async ({ page }) => {
      await login(page, account.email, account.password);
      await expect(page).toHaveURL(account.defaultUrl, { timeout: 30_000 });
    });
  }

  test('learner logout redirects to login and clears saved auth', async ({ page }) => {
    await login(page, roleLogins[0].email, roleLogins[0].password, roleLogins[0].returnUrl);
    await expect(page).toHaveURL(roleLogins[0].expectedUrl, { timeout: 30_000 });

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/auth\/login$/, { timeout: 30_000 });
    await page.waitForFunction(
      `(() => {
        const raw = window.localStorage.getItem('bbt-auth');
        if (!raw) return true;
        try {
          const parsed = JSON.parse(raw);
          return !parsed?.state?.accessToken && !parsed?.state?.user;
        } catch {
          return false;
        }
      })()`,
      undefined,
      { timeout: 30_000 },
    );
  });
});

test.describe('Visible LMS role slices', () => {
  test('logged-in learner clicks Enroll Free on tracks and opens the track', async ({ page, request }) => {
    const tracksResponse = await request.get(`${API}/tracks`);
    expect(tracksResponse.ok()).toBeTruthy();
    const tracks = await tracksResponse.json() as Array<{ id: string; slug: string; title: string }>;
    expect(tracks.length).toBeGreaterThan(0);
    const track = tracks[0];

    const learnerEmail = `e2e.free.click.${Date.now()}@bbt.edu.pk`;
    const signupResponse = await request.post(`${API}/auth/signup`, {
      data: {
        name: 'E2E Click Learner',
        email: learnerEmail,
        password: DEMO_PASSWORD,
      },
    });
    expect(signupResponse.ok()).toBeTruthy();

    await login(page, learnerEmail, DEMO_PASSWORD);
    await page.goto('/tracks', { waitUntil: 'domcontentloaded', timeout: 60_000 });

    const enrollResponse = page.waitForResponse(
      (response) => response.url().endsWith('/api/learner/enroll/free') && response.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await page.locator('button').filter({ hasText: /^Enroll Free$/ }).first().click();
    expect((await enrollResponse).ok()).toBeTruthy();

    await expect(page).toHaveURL(new RegExp(`/track/${track.id}`), { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: track.title })).toBeVisible({ timeout: 30_000 });
  });

  test('visitor signs up from a free track CTA and opens the enrolled track', async ({ page, request }) => {
    const tracksResponse = await request.get(`${API}/tracks`);
    expect(tracksResponse.ok()).toBeTruthy();
    const tracks = await tracksResponse.json() as Array<{ id: string; slug: string; title: string }>;
    expect(tracks.length).toBeGreaterThan(0);
    const track = tracks[0];

    const learnerEmail = `e2e.free.signup.${Date.now()}@bbt.edu.pk`;

    await page.goto(`/auth/signup?track=${track.slug}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
    await page.locator('#name').fill('E2E Free Learner');
    await page.locator('#email').fill(learnerEmail);
    await page.locator('#password').fill(DEMO_PASSWORD);
    await page.locator('#confirmPassword').fill(DEMO_PASSWORD);
    await expect(page.locator('#email')).toHaveValue(learnerEmail);

    const [signupResult, enrollResult] = await Promise.all([
      page.waitForResponse(
        (response) => response.url().endsWith('/api/auth/signup') && response.request().method() === 'POST',
        { timeout: 30_000 },
      ),
      page.waitForResponse(
        (response) => response.url().endsWith('/api/learner/enroll/free') && response.request().method() === 'POST',
        { timeout: 30_000 },
      ),
      page.getByRole('button', { name: /^Create account$/ }).click(),
    ]);
    expect(signupResult.ok()).toBeTruthy();
    expect(enrollResult.ok()).toBeTruthy();

    await expect(page).toHaveURL(new RegExp(`/track/${track.id}`), { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: track.title })).toBeVisible({ timeout: 30_000 });
  });

  test('admin creates and enrolls a learner, then learner opens the assigned course', async ({ page, request }) => {
    const adminResponse = await request.post(`${API}/auth/login`, {
      data: {
        email: process.env['TEST_ADMIN_EMAIL'] ?? 'admin@bbt.edu.pk',
        password: process.env['TEST_ADMIN_PASSWORD'] ?? DEMO_PASSWORD,
      },
    });
    expect(adminResponse.ok()).toBeTruthy();
    const adminLogin = await adminResponse.json() as { accessToken: string };

    const tracksResponse = await request.get(`${API}/tracks`);
    expect(tracksResponse.ok()).toBeTruthy();
    const tracks = await tracksResponse.json() as Array<{ id: string; title: string }>;
    expect(tracks.length).toBeGreaterThan(0);
    const track = tracks[0];

    const learnerEmail = `e2e.learner.${Date.now()}@bbt.edu.pk`;
    const createResponse = await request.post(`${API}/admin/users`, {
      headers: { Authorization: `Bearer ${adminLogin.accessToken}` },
      data: {
        name: 'E2E Learner',
        email: learnerEmail,
        password: DEMO_PASSWORD,
        role: 'LEARNER',
        emailVerified: true,
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const created = await createResponse.json() as { id: string };

    const enrollResponse = await request.post(`${API}/admin/users/${created.id}/enrollments`, {
      headers: { Authorization: `Bearer ${adminLogin.accessToken}` },
      data: { trackId: track.id, plan: 'FREE' },
    });
    expect(enrollResponse.ok()).toBeTruthy();

    await login(page, learnerEmail, DEMO_PASSWORD, '/dashboard');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByText(track.title).first()).toBeVisible({ timeout: 30_000 });

    await page.goto(`/track/${track.id}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByRole('heading', { name: track.title })).toBeVisible({ timeout: 30_000 });
  });
});
