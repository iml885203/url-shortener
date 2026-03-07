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
  uploadImage,
  getMe,
} from './handlers/api';

const app = new Hono<{ Bindings: Env }>();

// CORS for dashboard
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'https://go.logan.tw'],
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
app.post('/api/upload', uploadImage);

// Root redirects to dashboard
app.get('/', (c) => c.redirect('/dashboard/'));

// Dashboard SPA — serve index.html for deep links (Vue Router history mode)
app.get('/dashboard/*', async (c) => {
  const assetsFetcher = c.env.ASSETS;
  // Always serve index.html for SPA deep links
  const res = await assetsFetcher.fetch(new Request(new URL('/index.html', c.req.url)));
  return new Response(res.body, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});

// Redirect handler (must be last — handles short/long URL slugs)
app.get('/:slug', handleRedirect);

export default app;
