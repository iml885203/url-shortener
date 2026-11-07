import { test, expect } from '@playwright/test';
const link = { id: 1, url: 'https://example.com/a-long-article', shortUrl: 'https://short.example/a', longUrl: 'https://short.example/loogan', customUrl: 'https://short.example/reading', ogTitle: '閱讀清單與工作筆記 Reading notes', ogDesc: 'An example link', ogImage: null, ogEnabled: false, createdAt: '2026-01-01', updatedAt: '2026-01-01', clickCount: 12 };
async function fixture(page: import('@playwright/test').Page, options: { signedIn?: boolean; sso?: boolean; empty?: boolean; failure?: boolean } = {}) {
  await page.addInitScript(({ signedIn }) => { if (signedIn) localStorage.setItem('api_key', 'fixture-key'); }, { signedIn: options.signedIn });
  await page.route('http://127.0.0.1:4173/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    const authorized = request.headers()['x-api-key'] === 'fixture-key';
    let body: unknown = {}, status = 200;
    if (path === '/api/auth/session') body = { authenticated: authorized, sessionAuthenticated: false, oidc: { enabled: options.sso ?? true, label: 'Example Identity' } };
    else if (path === '/api/me') { status = authorized ? 200 : 401; body = status === 200 ? { success: true } : { error: 'Unauthorized' }; }
    else if (!authorized) { status = 401; body = { error: 'Unauthorized' }; }
    else if (options.failure) { status = 503; body = { error: 'Service unavailable. Please retry.' }; }
    else if (path === '/api/stats/overview') body = { todayClicks: 4, weekClicks: 12, totalLinks: options.empty ? 0 : 1, topLinks: options.empty ? [] : [link], clicksByDay: options.empty ? [] : [{ date: '2026-01-01', count: 12 }] };
    else if (path === '/api/links' && request.method() === 'GET') body = { items: options.empty ? [] : [link], total: options.empty ? 0 : 1, totalPages: 1, page: 1, pageSize: 20 };
    else if (path.endsWith('/stats')) body = { byDay: [{ date: '2026-01-01', count: 12 }], byReferrer: [{ referrer: null, count: 12 }], byCountry: [{ country: 'TW', count: 12 }] };
    else if (path.endsWith('/share')) body = { shortUrl: link.shortUrl, longUrl: link.longUrl, targetUrl: link.url, shortShareText: link.shortUrl, longShareText: link.longUrl };
    else if (path.endsWith('/qr')) { await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="white"/><rect x="30" y="30" width="196" height="196" fill="black"/></svg>' }); return; }
    else body = link;
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
}
for (const mode of ['light', 'dark']) {
  test(`${mode}: complete views fit supported widths`, async ({ page }) => {
    await fixture(page, { signedIn: true });
    await page.emulateMedia({ colorScheme: mode as 'light' | 'dark' });
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['links', 'links/new', 'links/1/edit', 'links/1/stats', 'overview']) {
        await page.goto('/dashboard/' + path);
        await expect(page.locator('h1')).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    }
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/dashboard/links');
      await expect(page.getByText(link.ogTitle).filter({ visible: true })).toBeVisible();
      await page.screenshot({ path: `test-results/links-${mode}-${width}.png`, fullPage: true });
      const appearance = page.getByRole('combobox', { name: 'Appearance' });
      await appearance.click();
      await expect(page.getByRole('listbox')).toBeVisible();
      const bounds = await page.getByRole('listbox').boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      await page.screenshot({ path: `test-results/appearance-${mode}-${width}.png` });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('listbox')).toHaveCount(0);
      await expect(appearance).toBeFocused();
    }
  });
  test(`${mode}: token and optional SSO sign-in, logout and theme persistence`, async ({ page }) => {
    await fixture(page);
    await page.emulateMedia({ colorScheme: mode as 'light' | 'dark' });
    await page.setViewportSize({ width: 375, height: 850 });
    await page.goto('/dashboard/links');
    await expect(page.getByRole('heading', { name: 'Sign in to URL Shortener' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with Example Identity' })).toBeVisible();
    await expect(page).toHaveURL(/dashboard\/login$/);
    await page.getByLabel('API token', { exact: false }).fill('wrong');
    await page.getByRole('button', { name: 'Sign in with token' }).click();
    await expect(page.getByRole('alert')).toContainText('not accepted');
    await page.getByLabel('API token', { exact: false }).fill('fixture-key');
    await page.getByRole('button', { name: 'Sign in with token' }).click();
    await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Appearance', exact: true }).click();
    await page.getByRole('option', { name: mode === 'dark' ? 'Light' : 'Dark', exact: true }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveClass(mode === 'dark' ? /tool-theme(?!.*dark)/ : /dark/);
    await page.getByRole('button', { name: 'Logout', exact: true }).filter({ visible: true }).click();
    await page.reload();
    await expect(page).toHaveURL(/dashboard\/login$/);
    await page.screenshot({ path: `test-results/login-${mode}-375.png`, fullPage: true });
  });
}
test('dialogs contain focus, dismiss on Escape and restore the action; QR stays usable', async ({ page }) => {
  await fixture(page, { signedIn: true });
  await page.setViewportSize({ width: 375, height: 850 });
  await page.goto('/dashboard/links');
  const remove = page.getByRole('button', { name: 'Delete', exact: true }).filter({ visible: true });
  await remove.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAccessibleName('Delete this link?');
  await page.keyboard.press('Tab');
  await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(remove).toBeFocused();
  await page.getByRole('button', { name: 'QR', exact: true }).filter({ visible: true }).click();
  await expect(dialog).toHaveAccessibleName('QR Code');
  await expect(dialog.getByAltText('QR code')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
});
test('token-only deployments and recoverable empty/error states', async ({ page }) => {
  await fixture(page, { sso: false, empty: true });
  await page.goto('/dashboard/login');
  await expect(page.getByRole('button', { name: 'Sign in with Example Identity' })).toHaveCount(0);
  await page.getByLabel('API token', { exact: true }).fill('fixture-key');
  await page.getByRole('button', { name: 'Sign in with token' }).click();
  await expect(page.getByText('No analytics yet')).toBeVisible();
  await page.getByRole('link', { name: 'Create first link' }).click();
  await expect(page.getByRole('heading', { name: /Create|New Link/ })).toBeVisible();
});
test('create and edit use accessible fields and an accessible success dialog', async ({ page }) => {
  await fixture(page, { signedIn: true });
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto('/dashboard/links/new');
  await page.getByLabel('Target URL').fill('https://example.com/reading');
  const sent = page.waitForRequest(request => request.url().endsWith('/api/links') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Create Link', exact: true }).click();
  expect((await sent).postDataJSON().url).toBe('https://example.com/reading');
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Link created');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/dashboard/links/1/edit');
  await expect(page.getByLabel('Target URL')).toHaveValue(link.url);
});
test('API errors remain readable and do not render stale private content', async ({ page }) => {
  await fixture(page, { signedIn: true, failure: true });
  await page.goto('/dashboard/links');
  await expect(page.getByText('Service unavailable. Please retry.')).toBeVisible();
  await expect(page.getByText(link.ogTitle)).toHaveCount(0);
});

test('size variants keep desktop actions compact and narrow-screen targets generous', async ({ page }) => {
  await fixture(page, { signedIn: true });
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/dashboard/links');
    const qr = page.getByRole('button', { name: 'QR', exact: true }).filter({ visible: true });
    expect((await qr.boundingBox())!.height).toBe(width === 375 ? 44 : 32);
    await page.goto('/dashboard/links/new');
    const create = page.getByRole('button', { name: 'Create Link', exact: true });
    expect((await create.boundingBox())!.height).toBe(width === 375 ? 44 : 36);
  }
});
