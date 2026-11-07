import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

// Explicit opt-in: regular verification never rewrites committed documentation.
test('capture README screenshots with public example data', async ({ page }) => {
  test.skip(process.env.UPDATE_README_SCREENSHOTS !== '1', 'Run npm run screenshots to refresh documentation images.');
  const links = [
    { id: 1, ogTitle: 'Product documentation', url: 'https://example.com/guides/getting-started', shortUrl: 'https://short.example/Uk', longUrl: 'https://short.example/loοgan', customUrl: 'https://short.example/docs', clickCount: 128 },
    { id: 2, ogTitle: 'Design resources', url: 'https://example.com/resources/design', shortUrl: 'https://short.example/Xp', longUrl: 'https://short.example/loоgan', customUrl: 'https://short.example/design', clickCount: 64 },
    { id: 3, ogTitle: 'Community newsletter', url: 'https://example.com/newsletter/latest', shortUrl: 'https://short.example/bQ', longUrl: 'https://short.example/loᴏgan', customUrl: 'https://short.example/news', clickCount: 37 },
  ].map(link => ({ ...link, ogDesc: 'Example content for the project preview', ogImage: null, ogEnabled: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' }));
  await page.addInitScript(() => localStorage.setItem('api_key', 'readme-demo-token'));
  // Reject all non-local requests. No live API, sign-in or external image is used.
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:4173') return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const authenticated = route.request().headers()['x-api-key'] === 'readme-demo-token';
    if (url.pathname === '/api/auth/session') return route.fulfill({ json: { authenticated, sessionAuthenticated: false, oidc: { enabled: true, label: 'SSO' } } });
    if (url.pathname === '/api/links') return route.fulfill({ json: { items: links, total: links.length, page: 1, pageSize: 20, totalPages: 1 } });
    if (url.pathname === '/api/me') return route.fulfill({ json: { success: authenticated } });
    return route.fulfill({ status: 404, json: { error: 'Not part of the screenshot fixture' } });
  });
  const docs = resolve(process.cwd(), '../../../docs');
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.setViewportSize({ width: 1440, height: 850 });
    await page.goto('/dashboard/links');
    await expect(page.getByText('Product documentation').filter({ visible: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.locator('header img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: resolve(docs, theme === 'light' ? 'screenshot.png' : 'screenshot-dark.png'), animations: 'disabled', fullPage: true });
  }
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/dashboard/links');
  await expect(page.getByText('Product documentation').filter({ visible: true })).toBeVisible();
  // Capture the first complete card and bottom navigation without a partial next card.
  await page.route('**/api/links?**', route => route.fulfill({ json: { items: [links[0]], total: 1, page: 1, pageSize: 20, totalPages: 1 } }));
  await page.getByRole('searchbox').fill('Product documentation');
  await expect(page.getByText('Design resources').filter({ visible: true })).toHaveCount(0);
  await page.getByRole('heading', { name: 'Links', exact: true }).click();
  await page.screenshot({ path: resolve(docs, 'screenshot-mobile.png'), animations: 'disabled', fullPage: true });
  await page.getByRole('button', { name: 'Logout', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to URL Shortener' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in with SSO' })).toBeVisible();
  await page.screenshot({ path: resolve(docs, 'screenshot-login.png'), animations: 'disabled', fullPage: true });
});
