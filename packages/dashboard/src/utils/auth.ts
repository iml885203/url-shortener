import { Context } from 'hono';
import { DashboardEnv } from '../types.js';

/**
 * Check if the incoming request carries a valid API key.
 * Accepts key via:
 *   - Authorization: Bearer <key>
 *   - X-API-Key: <key>
 */
export function isAuthenticated(c: Context<{ Bindings: DashboardEnv }>): boolean {
  const apiKey = c.env.API_KEY;
  if (!apiKey) return false;

  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7) === apiKey;
  }

  const xApiKey = c.req.header('X-API-Key');
  if (xApiKey) {
    return xApiKey === apiKey;
  }

  return false;
}
