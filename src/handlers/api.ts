import { Context } from 'hono';
import { Env } from '../types';
import { isAuthenticated } from '../utils/auth';
import { encodeId as sqidsEncode } from '../codec/sqids';
import { encodeId as loganEncode } from '../codec/logan';
import { kvSet, kvDelete } from '../services/kv';
import {
  dbListLinks,
  dbGetLink,
  dbCreateLink,
  dbUpdateLink,
  dbDeleteLink,
  dbGetClicksByDay,
  dbGetClicksByReferrer,
  dbGetClicksByCountry,
  dbGetOverviewStats,
} from '../services/db';
import { r2Upload, r2Delete, r2KeyFromUrl } from '../services/r2';

const PREVIEW_FETCH_TIMEOUT_MS = 8000;
const PREVIEW_MAX_HTML_BYTES = 256 * 1024;
const PREVIEW_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function authGuard(c: Context<{ Bindings: Env }>): Response | null {
  if (!isAuthenticated(c)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return null;
}

interface OgPreviewResponse {
  title: string | null;
  description: string | null;
  image: string | null;
  domain: string;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function readMetaContent(html: string, key: string): string | null {
  const metaTagRegex = /<meta\s+[^>]*>/gi;
  const attrRegex = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  const target = key.toLowerCase();

  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = metaTagRegex.exec(html)) !== null) {
    const attrs = new Map<string, string>();
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(tagMatch[0])) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[3] ?? attrMatch[4] ?? attrMatch[5] ?? '';
      attrs.set(attrName, attrValue);
    }

    const tagKey = (attrs.get('property') ?? attrs.get('name') ?? '').toLowerCase();
    if (tagKey !== target) continue;

    const content = normalizeWhitespace(decodeHtmlEntities(attrs.get('content') ?? ''));
    if (content) return content;
  }

  return null;
}

function readTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return null;
  const title = normalizeWhitespace(decodeHtmlEntities(match[1]));
  return title || null;
}

function toAbsoluteUrl(value: string | null, baseUrl: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

async function readHtmlWithLimit(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    return text.slice(0, maxBytes);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (totalBytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;

      if (totalBytes + value.byteLength <= maxBytes) {
        chunks.push(value);
        totalBytes += value.byteLength;
      } else {
        const remaining = maxBytes - totalBytes;
        if (remaining > 0) {
          chunks.push(value.slice(0, remaining));
          totalBytes += remaining;
        }
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(bytes);
}

function emptyPreview(domain: string): OgPreviewResponse {
  return {
    title: null,
    description: null,
    image: null,
    domain,
  };
}

function buildLinkResponse(
  link: {
    id: number;
    url: string;
    og_title?: string | null;
    og_desc?: string | null;
    og_image?: string | null;
    og_enabled?: number;
    created_at?: string;
    updated_at?: string;
  },
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
    ogEnabled: Boolean(link.og_enabled),
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

  return c.json(links.map((l) => buildLinkResponse(l, baseUrl, { clickCount: l.click_count })));
}

/**
 * POST /api/links — create a new link
 */
export async function createLink(c: Context<{ Bindings: Env }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  let body: {
    url?: string;
    ogTitle?: string;
    ogDesc?: string;
    ogImage?: string;
    ogEnabled?: boolean;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (!body.url || !body.url.trim()) {
    return c.json({ error: 'url is required' }, 400);
  }

  if (body.ogEnabled !== undefined && typeof body.ogEnabled !== 'boolean') {
    return c.json({ error: 'ogEnabled must be a boolean' }, 400);
  }

  try {
    const parsed = new URL(body.url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return c.json({ error: 'URL must use http or https scheme' }, 400);
    }
  } catch {
    return c.json({ error: 'Invalid URL' }, 400);
  }

  const link = await dbCreateLink(c.env.DB, {
    url: body.url,
    ogTitle: body.ogTitle,
    ogDesc: body.ogDesc,
    ogImage: body.ogImage,
    ogEnabled: body.ogEnabled ?? false,
  });

  // Update KV cache
  await kvSet(c.env.KV, link.id, {
    url: link.url,
    ogTitle: link.og_title,
    ogDesc: link.og_desc,
    ogImage: link.og_image,
    ogEnabled: Boolean(link.og_enabled),
  });

  return c.json(buildLinkResponse(link, c.env.SHORT_BASE_URL), 201);
}

/**
 * PUT /api/links/:id — update a link
 */
export async function updateLink(c: Context<{ Bindings: Env }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  const id = parseInt(c.req.param('id') ?? '', 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);

  let body: {
    url?: string;
    ogTitle?: string | null;
    ogDesc?: string | null;
    ogImage?: string | null;
    ogEnabled?: boolean;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (body.url !== undefined) {
    if (!body.url.trim()) {
      return c.json({ error: 'url cannot be empty' }, 400);
    }
    try {
      const parsed = new URL(body.url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return c.json({ error: 'URL must use http or https scheme' }, 400);
      }
    } catch {
      return c.json({ error: 'Invalid URL' }, 400);
    }
  }

  if (body.ogEnabled !== undefined && typeof body.ogEnabled !== 'boolean') {
    return c.json({ error: 'ogEnabled must be a boolean' }, 400);
  }

  const updated = await dbUpdateLink(c.env.DB, id, {
    url: body.url,
    ogTitle: body.ogTitle,
    ogDesc: body.ogDesc,
    ogImage: body.ogImage,
    ogEnabled: body.ogEnabled,
  });

  if (!updated) return c.json({ error: 'Link not found' }, 404);

  // Update KV cache
  await kvSet(c.env.KV, id, {
    url: updated.url,
    ogTitle: updated.og_title,
    ogDesc: updated.og_desc,
    ogImage: updated.og_image,
    ogEnabled: Boolean(updated.og_enabled),
  });

  return c.json(buildLinkResponse(updated, c.env.SHORT_BASE_URL));
}

/**
 * DELETE /api/links/:id — delete a link
 */
export async function deleteLink(c: Context<{ Bindings: Env }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  const id = parseInt(c.req.param('id') ?? '', 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);

  const r2BaseUrl = c.env.R2_BASE_URL;

  // Check if there's an OG image to clean up from R2
  const link = await dbGetLink(c.env.DB, id);
  if (link?.og_image) {
    const key = r2KeyFromUrl(link.og_image, r2BaseUrl);
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

  const id = parseInt(c.req.param('id') ?? '', 10);
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

  const r2BaseUrl = c.env.R2_BASE_URL;

  const formData = await c.req.formData().catch(() => null);
  if (!formData) return c.json({ error: 'Invalid form data' }, 400);

  const file = formData.get('image') as File | null;
  if (!file) return c.json({ error: 'image field is required' }, 400);

  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'Image must be 5MB or smaller' }, 400);
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Unsupported image type' }, 400);
  }

  const ext = file.type.split('/')[1];
  const linkId = formData.get('linkId') as string | null;
  const prefix = linkId ? `${linkId}` : 'misc';
  const key = `${prefix}/${Date.now()}.${ext}`;

  const buffer = await file.arrayBuffer();
  const url = await r2Upload(c.env.R2, key, buffer, file.type, r2BaseUrl);

  return c.json({ url });
}

/**
 * POST /api/preview/fetch-og — fetch destination OG metadata
 */
export async function fetchOgPreview(c: Context<{ Bindings: Env }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  let body: { url?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  if (!body.url || !body.url.trim()) {
    return c.json({ error: 'url is required' }, 400);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(body.url.trim());
  } catch {
    return c.json({ error: 'Invalid URL' }, 400);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return c.json({ error: 'URL must use http or https scheme' }, 400);
  }

  const domain = parsedUrl.hostname;
  const fallback = emptyPreview(domain);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PREVIEW_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': PREVIEW_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) return c.json(fallback);

    const html = await readHtmlWithLimit(response, PREVIEW_MAX_HTML_BYTES);
    if (!html) return c.json(fallback);

    const title = readMetaContent(html, 'og:title') ?? readTitleTag(html);
    const description = readMetaContent(html, 'og:description');
    const image = toAbsoluteUrl(readMetaContent(html, 'og:image'), parsedUrl.toString());

    return c.json({
      title: title || null,
      description: description || null,
      image: image || null,
      domain,
    } satisfies OgPreviewResponse);
  } catch {
    return c.json(fallback);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * GET /api/me — verify API key and return status
 */
export async function getMe(c: Context<{ Bindings: Env }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;
  return c.json({ ok: true });
}

/**
 * GET /api/stats/overview — dashboard aggregate stats
 */
export async function getOverviewStats(c: Context<{ Bindings: Env }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  const overview = await dbGetOverviewStats(c.env.DB);
  const baseUrl = c.env.SHORT_BASE_URL;

  return c.json({
    todayClicks: overview.todayClicks,
    weekClicks: overview.weekClicks,
    totalLinks: overview.totalLinks,
    topLinks: overview.topLinks.map((link) => ({
      id: link.id,
      url: link.url,
      shortUrl: `${baseUrl}/${sqidsEncode(link.id)}`,
      longUrl: `${baseUrl}/${loganEncode(link.id)}`,
      clickCount: link.click_count,
    })),
    clicksByDay: overview.clicksByDay,
  });
}
