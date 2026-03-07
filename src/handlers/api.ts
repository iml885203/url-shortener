import { Context } from 'hono';
import { Env } from '../types';
import { isAuthenticated } from '../utils/auth';
import { encodeId as sqidsEncode } from '../codec/sqids';
import { encodeId as loganEncode } from '../codec/logan';
import { kvGet, kvSet, kvDelete } from '../services/kv';
import {
  dbListLinks,
  dbGetLink,
  dbCreateLink,
  dbUpdateLink,
  dbDeleteLink,
  dbGetClicksByDay,
  dbGetClicksByReferrer,
  dbGetClicksByCountry,
} from '../services/db';
import { r2Upload, r2Delete, r2KeyFromUrl } from '../services/r2';

const R2_BASE_URL = 'https://r2.go.logan.tw';

function authGuard(c: Context<{ Bindings: Env }>): Response | null {
  if (!isAuthenticated(c)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return null;
}

function buildLinkResponse(
  link: { id: number; url: string; og_title?: string | null; og_desc?: string | null; og_image?: string | null; created_at?: string; updated_at?: string },
  baseUrl: string,
  extra: Record<string, unknown> = {}
) {
  return {
    id: link.id,
    url: link.url,
    shortUrl: `${baseUrl}/${sqidsEncode(link.id)}`,
    longUrl: `${baseUrl}/${loganEncode(link.id)}`,
    ogTitle: link.og_title ?? null,
    ogDesc: link.og_desc ?? null,
    ogImage: link.og_image ?? null,
    createdAt: link.created_at,
    updatedAt: link.updated_at,
    ...extra,
  };
}

/**
 * GET /api/links — list all links with click counts
 */
export async function listLinks(c: Context<{ Bindings: Env }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  const links = await dbListLinks(c.env.DB);
  const baseUrl = c.env.SHORT_BASE_URL;

  return c.json(
    links.map((l) => buildLinkResponse(l, baseUrl, { clickCount: l.click_count }))
  );
}

/**
 * POST /api/links — create a new link
 */
export async function createLink(c: Context<{ Bindings: Env }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  let body: { url?: string; ogTitle?: string; ogDesc?: string; ogImage?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (!body.url) {
    return c.json({ error: 'url is required' }, 400);
  }

  try {
    new URL(body.url);
  } catch {
    return c.json({ error: 'Invalid URL' }, 400);
  }

  const link = await dbCreateLink(c.env.DB, {
    url: body.url,
    ogTitle: body.ogTitle,
    ogDesc: body.ogDesc,
    ogImage: body.ogImage,
  });

  // Update KV cache
  await kvSet(c.env.KV, link.id, {
    url: link.url,
    ogTitle: link.og_title,
    ogDesc: link.og_desc,
    ogImage: link.og_image,
  });

  return c.json(buildLinkResponse(link, c.env.SHORT_BASE_URL), 201);
}

/**
 * PUT /api/links/:id — update a link
 */
export async function updateLink(c: Context<{ Bindings: Env }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);

  let body: { url?: string; ogTitle?: string | null; ogDesc?: string | null; ogImage?: string | null };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (body.url) {
    try {
      new URL(body.url);
    } catch {
      return c.json({ error: 'Invalid URL' }, 400);
    }
  }

  const updated = await dbUpdateLink(c.env.DB, id, {
    url: body.url,
    ogTitle: body.ogTitle,
    ogDesc: body.ogDesc,
    ogImage: body.ogImage,
  });

  if (!updated) return c.json({ error: 'Link not found' }, 404);

  // Update KV cache
  await kvSet(c.env.KV, id, {
    url: updated.url,
    ogTitle: updated.og_title,
    ogDesc: updated.og_desc,
    ogImage: updated.og_image,
  });

  return c.json(buildLinkResponse(updated, c.env.SHORT_BASE_URL));
}

/**
 * DELETE /api/links/:id — delete a link
 */
export async function deleteLink(c: Context<{ Bindings: Env }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);

  // Check if there's an OG image to clean up from R2
  const link = await dbGetLink(c.env.DB, id);
  if (link?.og_image) {
    const key = r2KeyFromUrl(link.og_image, R2_BASE_URL);
    if (key) {
      await r2Delete(c.env.R2, key).catch(() => {});
    }
  }

  const deleted = await dbDeleteLink(c.env.DB, id);
  if (!deleted) return c.json({ error: 'Link not found' }, 404);

  // Invalidate KV cache
  await kvDelete(c.env.KV, id);

  return c.json({ success: true });
}

/**
 * GET /api/links/:id/stats — click statistics for a link
 */
export async function getLinkStats(c: Context<{ Bindings: Env }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);

  const link = await dbGetLink(c.env.DB, id);
  if (!link) return c.json({ error: 'Link not found' }, 404);

  const [byDay, byReferrer, byCountry] = await Promise.all([
    dbGetClicksByDay(c.env.DB, id),
    dbGetClicksByReferrer(c.env.DB, id),
    dbGetClicksByCountry(c.env.DB, id),
  ]);

  return c.json({ byDay, byReferrer, byCountry });
}

/**
 * POST /api/upload — upload OG image to R2
 * Expects multipart/form-data with field "image"
 */
export async function uploadImage(c: Context<{ Bindings: Env }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  const formData = await c.req.formData().catch(() => null);
  if (!formData) return c.json({ error: 'Invalid form data' }, 400);

  const file = formData.get('image') as File | null;
  if (!file) return c.json({ error: 'image field is required' }, 400);

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Unsupported image type' }, 400);
  }

  const ext = file.type.split('/')[1];
  const linkId = formData.get('linkId') as string | null;
  const prefix = linkId ? `${linkId}` : 'misc';
  const key = `${prefix}/${Date.now()}.${ext}`;

  const buffer = await file.arrayBuffer();
  const url = await r2Upload(c.env.R2, key, buffer, file.type, R2_BASE_URL);

  return c.json({ url });
}

/**
 * GET /api/me — verify API key and return status
 */
export async function getMe(c: Context<{ Bindings: Env }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;
  return c.json({ ok: true });
}
