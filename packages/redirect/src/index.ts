import { Hono } from 'hono';
import { RedirectEnv } from './types.js';
import { handleRedirect } from './redirect.js';

const app = new Hono<{ Bindings: RedirectEnv }>();

// Root → dashboard (served by dashboard worker)
app.get('/', (c) => c.redirect('/dashboard/'));

// All other slugs → redirect
app.get('/:slug', handleRedirect);

export default app;
