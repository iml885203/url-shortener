import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { DashboardEnv } from './types.js';
import {
  listLinks,
  getLink,
  createLink,
  updateLink,
  deleteLink,
  getLinkStats,
  getLinkShare,
  getLinkQr,
  fetchOgPreview,
  uploadImage,
  getMe,
  getOverviewStats,
} from './handlers/api.js';

const app = new Hono<{ Bindings: DashboardEnv }>();

// CORS for dashboard
app.use('/api/*', (c, next) => {
  const allowed = [c.env.SHORT_BASE_URL, 'http://localhost:5173'].filter(Boolean) as string[];
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : allowed[0]),
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  })(c, next);
});

// Admin API routes
app.get('/api/me', getMe);
app.get('/api/links', listLinks);
app.get('/api/links/:id', getLink);
app.get('/api/links/:id/share', getLinkShare);
app.get('/api/links/:id/qr', getLinkQr);
app.post('/api/links', createLink);
app.put('/api/links/:id', updateLink);
app.delete('/api/links/:id', deleteLink);
app.get('/api/links/:id/stats', getLinkStats);
app.get('/api/stats/overview', getOverviewStats);
app.post('/api/upload', uploadImage);
app.post('/api/preview/fetch-og', fetchOgPreview);

// Root redirects to dashboard
app.get('/', (c) => c.redirect('/dashboard/'));

// Redirect /dashboard → /dashboard/ (trailing slash for SPA)
app.get('/dashboard', (c) => c.redirect('/dashboard/'));

// Dashboard SPA — try static asset first, fallback to index.html for SPA routing
app.get('/dashboard/*', async (c) => {
  const assetsFetcher = c.env.ASSETS;
  const path = new URL(c.req.url).pathname;

  // Strip /dashboard prefix to match files in dist/
  const assetPath = path.replace(/^\/dashboard/, '') || '/index.html';

  // Try to serve the actual static file first
  const assetRes = await assetsFetcher.fetch(new Request(new URL(assetPath, c.req.url)));
  if (assetRes.status === 200 && assetPath !== '/index.html') {
    return assetRes;
  }

  // Fallback: serve index.html for SPA deep links, injecting runtime config
  const indexRes = await assetsFetcher.fetch(new Request(new URL('/index.html', c.req.url)));
  const html = await indexRes.text();
  const configScript = `<script>window.__CONFIG__ = { baseUrl: "${c.env.SHORT_BASE_URL ?? ''}" }<\/script>`;
  const injectedHtml = html.replace('</head>', `${configScript}</head>`);
  return new Response(injectedHtml, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});

export default app;
