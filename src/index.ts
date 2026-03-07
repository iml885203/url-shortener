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

// Dashboard — redirect root and serve SPA via static assets
// Static files in dashboard/dist/ are served by Cloudflare Pages/Workers assets binding
// The Worker itself only needs to handle the /dashboard/ rewrite for deep links.

// Root redirects to dashboard
app.get('/', (c) => c.redirect('/dashboard/'));

// Redirect handler (must be last — handles short/long URL slugs)
app.get('/:slug', handleRedirect);

export default app;
