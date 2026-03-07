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

// Dashboard SPA — serve static assets
app.get('/dashboard', (c) => c.redirect('/dashboard/'));
app.get('/dashboard/*', async (c) => {
  const assets = (c.env as Env & { ASSETS?: { fetch: (req: Request) => Promise<Response> } }).ASSETS;
  if (assets) {
    return assets.fetch(c.req.raw);
  }
  return c.text('Dashboard not available', 404);
});

// Redirect handler (must be last to avoid conflicts)
app.get('/:slug', handleRedirect);

// Root
app.get('/', (c) => c.redirect('/dashboard/'));

export default app;
