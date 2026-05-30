import { expect, test, type Page } from '@playwright/test';

const API = process.env['API_URL'] ?? 'http://localhost:4000/api';
const DEMO_PASSWORD = process.env['TEST_DEMO_PASSWORD'] ?? 'Password123!';

const publicRoutes = [
  '/',
  '/tracks',
  '/skills',
  '/jobs',
  '/creators',
  '/onboarding/quiz',
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
] as const;

const roleRoutes = [
  {
    role: 'learner',
    email: process.env['TEST_LEARNER_EMAIL'] ?? 'learner@bbt.edu.pk',
    password: process.env['TEST_LEARNER_PASSWORD'] ?? DEMO_PASSWORD,
    routes: ['/dashboard', '/learner/portfolio', '/social', '/leaderboard'],
  },
  {
    role: 'creator',
    email: process.env['TEST_CREATOR_EMAIL'] ?? 'creator@bbt.edu.pk',
    password: process.env['TEST_CREATOR_PASSWORD'] ?? DEMO_PASSWORD,
    routes: ['/creator/dashboard', '/creator/courses', '/creator/upload', '/creator/analytics', '/creator/revenue'],
  },
  {
    role: 'admin',
    email: process.env['TEST_ADMIN_EMAIL'] ?? 'admin@bbt.edu.pk',
    password: process.env['TEST_ADMIN_PASSWORD'] ?? DEMO_PASSWORD,
    routes: ['/admin/health', '/admin/users', '/admin/moderation', '/admin/gaps', '/admin/franchises'],
  },
] as const;

type Theme = 'light' | 'dark';

async function setTheme(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript((nextTheme) => {
    const win = globalThis as unknown as {
      localStorage: { setItem(key: string, value: string): void };
      document: { documentElement: { classList: { toggle(name: string, force?: boolean): void } } };
    };
    win.localStorage.setItem('bbt-theme', nextTheme);
    win.document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  }, theme);
}

async function login(page: Page, email: string, password: string): Promise<void> {
  const response = await page.request.post(`${API}/auth/login`, {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  const auth = await response.json() as {
    accessToken: string;
    user: {
      avatarUrl: string | null;
      email: string;
      emailVerified?: boolean;
      id: string;
      name: string;
      role: string;
    };
  };
  const persistedAuth = {
    state: {
      accessToken: auth.accessToken,
      user: auth.user,
    },
    version: 0,
  };
  await page.addInitScript((value) => {
    const win = globalThis as unknown as {
      localStorage: { setItem(key: string, value: string): void };
    };
    win.localStorage.setItem('bbt-auth', JSON.stringify(value));
  }, persistedAuth);
}

async function firstTrackSlug(page: Page): Promise<string | null> {
  const response = await page.request.get(`${API}/tracks`);
  if (!response.ok()) return null;
  const tracks = await response.json() as Array<{ slug: string }>;
  return tracks[0]?.slug ?? null;
}

async function expectReadableCriticalText(page: Page): Promise<void> {
  const failures = await page.evaluate(() => {
    const browser = globalThis as unknown as {
      document: {
        documentElement: { classList: { contains(value: string): boolean } };
        querySelectorAll(selector: string): Iterable<unknown>;
      };
      getComputedStyle(element: unknown): {
        backgroundColor: string;
        className?: string;
        color: string;
        display: string;
        fontSize: string;
        fontWeight: string;
        visibility: string;
      };
    };

    function parseRgb(value: string): [number, number, number, number] | null {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
      if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
      return [parts[0], parts[1], parts[2], parts[3] ?? 1];
    }

    function luminance([r, g, b]: [number, number, number]): number {
      const [red, green, blue] = [r, g, b].map((value) => {
        const next = value / 255;
        return next <= 0.03928 ? next / 12.92 : ((next + 0.055) / 1.055) ** 2.4;
      }) as [number, number, number];
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    }

    function contrast(fg: [number, number, number], bg: [number, number, number]): number {
      const lighter = Math.max(luminance(fg), luminance(bg));
      const darker = Math.min(luminance(fg), luminance(bg));
      return (lighter + 0.05) / (darker + 0.05);
    }

    function backgroundFor(element: {
      parentElement: unknown | null;
    }): [number, number, number] {
      let current: unknown | null = element;
      while (current) {
        const color = parseRgb(browser.getComputedStyle(current).backgroundColor);
        if (color && color[3] > 0.05) return [color[0], color[1], color[2]];
        current = (current as { parentElement?: unknown | null }).parentElement ?? null;
      }
      return browser.document.documentElement.classList.contains('dark') ? [7, 7, 26] : [248, 247, 242];
    }

    const selector = [
      'h1',
      'h2',
      'h3',
      'button:not(:disabled)',
      'a',
      'label',
      'input',
      'textarea',
      'select',
      '[role="button"]',
    ].join(',');

    return Array.from(browser.document.querySelectorAll(selector))
      .filter((element) => {
        const node = element as {
          getAttribute(name: string): string | null;
          getBoundingClientRect(): { width: number; height: number };
          innerText?: string;
        };
        const text = (node.innerText || node.getAttribute('aria-label') || node.getAttribute('placeholder') || '').trim();
        const style = browser.getComputedStyle(element);
        const rect = node.getBoundingClientRect();
        return text.length > 0 && rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      })
      .map((element) => {
        const node = element as {
          className: { toString(): string };
          getAttribute(name: string): string | null;
          innerText?: string;
          tagName: string;
        };
        const style = browser.getComputedStyle(element);
        const color = parseRgb(style.color);
        if (!color) return null;
        const fontSize = Number.parseFloat(style.fontSize);
        const fontWeight = Number.parseInt(style.fontWeight, 10);
        const threshold = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5;
        const ratio = contrast([color[0], color[1], color[2]], backgroundFor(element as { parentElement: unknown | null }));
        return {
          text: (node.innerText || node.getAttribute('aria-label') || node.getAttribute('placeholder') || '').trim().slice(0, 80),
          tag: node.tagName.toLowerCase(),
          className: node.className.toString().slice(0, 120),
          ratio,
          threshold,
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item && item.ratio < item.threshold)
      .slice(0, 10);
  });

  expect(failures, `Contrast failures on ${page.url()}:\n${JSON.stringify(failures, null, 2)}`).toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`${theme} theme contrast`, () => {
    for (const route of publicRoutes) {
      test(`public route ${route} has readable critical text`, async ({ page }) => {
        await setTheme(page, theme);
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
        await expectReadableCriticalText(page);
      });
    }

    test('track detail has readable critical text', async ({ page }) => {
      await setTheme(page, theme);
      const slug = await firstTrackSlug(page);
      if (!slug) {
        test.skip(true, 'No tracks available from API');
        return;
      }
      await page.goto(`/tracks/${slug}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await expectReadableCriticalText(page);
    });

    for (const account of roleRoutes) {
      test(`${account.role} routes have readable critical text`, async ({ page }) => {
        await setTheme(page, theme);
        await login(page, account.email, account.password);
        for (const route of account.routes) {
          await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
          await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
          await expectReadableCriticalText(page);
        }
      });
    }
  });
}
