import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { handleRedirect } from './handlers/redirect';
import {
  listLinks,
  createLink,
  updateLink,
  deleteLink,
  getLinkStats,
  fetchOgPreview,
  uploadImage,
  getMe,
  getOverviewStats,
} from './handlers/api';

const app = new Hono<{ Bindings: Env }>();

// CORS for dashboard
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'https://go.dotw.me'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Admin API routes
app.get('/api/me', getMe);
app.get('/api/links', listLinks);
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

  // Fallback: serve index.html for SPA deep links
  const indexRes = await assetsFetcher.fetch(new Request(new URL('/index.html', c.req.url)));
  return new Response(indexRes.body, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});

// Redirect handler (must be last — handles short/long URL slugs)
app.get('/:slug', handleRedirect);

export default app;
