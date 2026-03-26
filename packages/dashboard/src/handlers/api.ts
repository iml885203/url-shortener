import { Context } from 'hono';
import { DashboardEnv } from '../types.js';
import { isAuthenticated } from '../utils/auth.js';
import {
  sqidsEncodeId,
  loganEncodeId,
  sqidsDecodeSlug,
  loganDecodeSlug,
  LOGAN_PATTERN,
  kvSet,
  kvDelete,
  kvSetCustomSlug,
  kvDeleteCustomSlug,
} from '@url-shortener/shared';
import {
  dbListLinksPage,
  dbGetLink,
  dbCreateLink,
  dbUpdateLink,
  dbDeleteLink,
  dbGetClicksByDay,
  dbGetClicksByReferrer,
  dbGetClicksByCountry,
  dbGetOverviewStats,
} from '../services/db.js';
import { r2Upload, r2Delete, r2KeyFromUrl } from '../services/r2.js';
import { buildQrPng } from '../services/qr.js';

const PREVIEW_FETCH_TIMEOUT_MS = 8000;
const PREVIEW_MAX_HTML_BYTES = 256 * 1024;
const PREVIEW_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const UPLOAD_MAX_BYTES = 1024 * 1024; // 1MB hard limit for OG images

function authGuard(c: Context<{ Bindings: DashboardEnv }>): Response | null {
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

const CUSTOM_SLUG_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const CUSTOM_SLUG_RESERVED = new Set(['api', 'dashboard', 'assets']);

function validateCustomSlug(slug: string): string | null {
  if (!CUSTOM_SLUG_PATTERN.test(slug)) {
    return 'Custom slug must be 1–64 characters and contain only letters, numbers, hyphens, or underscores';
  }
  if (CUSTOM_SLUG_RESERVED.has(slug.toLowerCase())) {
    return `Custom slug "${slug}" is reserved`;
  }
  if (LOGAN_PATTERN.test(slug)) {
    return `Custom slug "${slug}" conflicts with a reserved pattern`;
  }
  return null;
}

function buildLinkResponse(
  link: {
    id: number;
    url: string;
    og_title?: string | null;
    og_desc?: string | null;
    og_image?: string | null;
    og_enabled?: number;
    custom_slug?: string | null;
    created_at?: string;
    updated_at?: string;
  },
  baseUrl: string,
  extra: Record<string, unknown> = {}
) {
  const customSlug = link.custom_slug ?? null;
  const customSlugFields = customSlug
    ? { customSlug, customUrl: `${baseUrl}/${customSlug}` }
    : {};

  return {
    id: link.id,
    url: link.url,
    shortUrl: `${baseUrl}/${sqidsEncodeId(link.id)}`,
    longUrl: `${baseUrl}/${loganEncodeId(link.id)}`,
    ogTitle: link.og_title ?? null,
    ogDesc: link.og_desc ?? null,
    ogImage: link.og_image ?? null,
    ogEnabled: Boolean(link.og_enabled),
    createdAt: link.created_at,
    updatedAt: link.updated_at,
    ...customSlugFields,
    ...extra,
  };
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function buildLinkSharePayload(link: { id: number; url: string }, baseUrl: string) {
  const shortUrl = `${baseUrl}/${sqidsEncodeId(link.id)}`;
  const longUrl = `${baseUrl}/${loganEncodeId(link.id)}`;
  return {
    shortUrl,
    longUrl,
    targetUrl: link.url,
    shortShareText: `Check this link: ${shortUrl}`,
    longShareText: `Check this link: ${longUrl}`,
  };
}

/**
 * GET /api/links — list links with search + pagination
 */
export async function listLinks(c: Context<{ Bindings: DashboardEnv }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  const q = c.req.query('q')?.trim() || undefined;
  const page = parsePositiveInt(c.req.query('page'), 1);
  const pageSize = Math.min(parsePositiveInt(c.req.query('pageSize'), 20), 100);

  const exactId = q ? sqidsDecodeSlug(q) ?? loganDecodeSlug(q) : null;

  const { items, total } = await dbListLinksPage(c.env.DB, {
    q,
    exactId,
    page,
    pageSize,
  });

  const baseUrl = c.env.SHORT_BASE_URL;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return c.json({
    items: items.map((item) => buildLinkResponse(item, baseUrl, { clickCount: item.click_count })),
    page,
    pageSize,
    total,
    totalPages,
  });
}

/**
 * GET /api/links/:id — get one link
 */
export async function getLink(c: Context<{ Bindings: DashboardEnv }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  const id = parseInt(c.req.param('id') ?? '', 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);

  const link = await dbGetLink(c.env.DB, id);
  if (!link) return c.json({ error: 'Link not found' }, 404);

  return c.json(buildLinkResponse(link, c.env.SHORT_BASE_URL));
}

/**
 * GET /api/links/:id/share — share payload for mobile/native share sheet
 */
export async function getLinkShare(c: Context<{ Bindings: DashboardEnv }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  const id = parseInt(c.req.param('id') ?? '', 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);

  const link = await dbGetLink(c.env.DB, id);
  if (!link) return c.json({ error: 'Link not found' }, 404);

  return c.json(buildLinkSharePayload(link, c.env.SHORT_BASE_URL));
}

/**
 * GET /api/links/:id/qr?type=short|long — single QR code PNG (no text)
 */
export async function getLinkQr(c: Context<{ Bindings: DashboardEnv }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  const id = parseInt(c.req.param('id') ?? '', 10);
  if (isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);

  const type = (c.req.query('type') ?? 'short') as 'short' | 'long';
  if (type !== 'short' && type !== 'long') {
    return c.json({ error: 'type must be "short" or "long"' }, 400);
  }

  const link = await dbGetLink(c.env.DB, id);
  if (!link) return c.json({ error: 'Link not found' }, 404);

  const baseUrl = c.env.SHORT_BASE_URL;
  const url = type === 'short'
    ? `${baseUrl}/${sqidsEncodeId(link.id)}`
    : `${baseUrl}/${loganEncodeId(link.id)}`;

  const png = buildQrPng(url);

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': `inline; filename="link-${id}-qr-${type}.png"`,
    },
  });
}

/**
 * POST /api/links — create a new link
 */
export async function createLink(c: Context<{ Bindings: DashboardEnv }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  let body: {
    url?: string;
    ogTitle?: string;
    ogDesc?: string;
    ogImage?: string;
    ogEnabled?: boolean;
    customSlug?: string;
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

  // Validate custom slug if provided
  const customSlug = body.customSlug?.trim() || undefined;
  if (customSlug) {
    const slugError = validateCustomSlug(customSlug);
    if (slugError) return c.json({ error: slugError }, 400);
  }

  let link;
  try {
    link = await dbCreateLink(c.env.DB, {
      url: body.url,
      ogTitle: body.ogTitle,
      ogDesc: body.ogDesc,
      ogImage: body.ogImage,
      ogEnabled: body.ogEnabled ?? false,
      customSlug,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('UNIQUE') && msg.includes('custom_slug')) {
      return c.json({ error: 'Slug already taken' }, 409);
    }
    throw err;
  }

  // Update KV cache
  await kvSet(c.env.KV, link.id, {
    url: link.url,
    ogTitle: link.og_title,
    ogDesc: link.og_desc,
    ogImage: link.og_image,
    ogEnabled: Boolean(link.og_enabled),
  });

  // Set custom slug KV pointer
  if (link.custom_slug) {
    await kvSetCustomSlug(c.env.KV, link.custom_slug, link.id);
  }

  return c.json(buildLinkResponse(link, c.env.SHORT_BASE_URL), 201);
}

/**
 * PUT /api/links/:id — update a link
 */
export async function updateLink(c: Context<{ Bindings: DashboardEnv }>): Promise<Response> {
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
    customSlug?: string | null;
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

  // Validate custom slug if provided (non-null)
  // null means "clear slug", undefined means "keep existing"
  let customSlug: string | null | undefined = undefined;
  if ('customSlug' in body) {
    if (body.customSlug === null || body.customSlug === '') {
      customSlug = null; // clear slug
    } else if (typeof body.customSlug === 'string') {
      const trimmed = body.customSlug.trim();
      if (trimmed) {
        const slugError = validateCustomSlug(trimmed);
        if (slugError) return c.json({ error: slugError }, 400);
        customSlug = trimmed;
      } else {
        customSlug = null; // empty string = clear
      }
    }
  }

  // Fetch existing link to get old custom_slug for KV cleanup
  const existing = await dbGetLink(c.env.DB, id);
  if (!existing) return c.json({ error: 'Link not found' }, 404);

  let updated;
  try {
    updated = await dbUpdateLink(c.env.DB, id, {
      url: body.url,
      ogTitle: body.ogTitle,
      ogDesc: body.ogDesc,
      ogImage: body.ogImage,
      ogEnabled: body.ogEnabled,
      customSlug,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('UNIQUE') && msg.includes('custom_slug')) {
      return c.json({ error: 'Slug already taken' }, 409);
    }
    throw err;
  }

  if (!updated) return c.json({ error: 'Link not found' }, 404);

  // Update KV cache
  await kvSet(c.env.KV, id, {
    url: updated.url,
    ogTitle: updated.og_title,
    ogDesc: updated.og_desc,
    ogImage: updated.og_image,
    ogEnabled: Boolean(updated.og_enabled),
  });

  // Sync custom slug KV pointers
  const oldSlug = existing.custom_slug;
  const newSlug = updated.custom_slug;

  if (oldSlug && oldSlug !== newSlug) {
    // Remove old slug pointer
    await kvDeleteCustomSlug(c.env.KV, oldSlug);
  }
  if (newSlug && newSlug !== oldSlug) {
    // Set new slug pointer
    await kvSetCustomSlug(c.env.KV, newSlug, id);
  }

  return c.json(buildLinkResponse(updated, c.env.SHORT_BASE_URL));
}

/**
 * DELETE /api/links/:id — delete a link
 */
export async function deleteLink(c: Context<{ Bindings: DashboardEnv }>): Promise<Response> {
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

  // Remove custom slug KV pointer if set
  if (link?.custom_slug) {
    await kvDeleteCustomSlug(c.env.KV, link.custom_slug);
  }

  return c.json({ success: true });
}

/**
 * GET /api/links/:id/stats — click statistics for a link
 */
export async function getLinkStats(c: Context<{ Bindings: DashboardEnv }>): Promise<Response> {
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
export async function uploadImage(c: Context<{ Bindings: DashboardEnv }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;

  const r2BaseUrl = c.env.R2_BASE_URL;

  const formData = await c.req.formData().catch(() => null);
  if (!formData) return c.json({ error: 'Invalid form data' }, 400);

  const file = formData.get('image') as File | null;
  if (!file) return c.json({ error: 'image field is required' }, 400);

  if (file.size > UPLOAD_MAX_BYTES) {
    return c.json({ error: 'Image too large for social preview (max 1MB, recommend <= 600KB)' }, 400);
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
export async function fetchOgPreview(c: Context<{ Bindings: DashboardEnv }>): Promise<Response> {
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
export async function getMe(c: Context<{ Bindings: DashboardEnv }>): Promise<Response> {
  const denied = authGuard(c);
  if (denied) return denied;
  return c.json({ ok: true });
}

/**
 * GET /api/stats/overview — dashboard aggregate stats
 */
export async function getOverviewStats(c: Context<{ Bindings: DashboardEnv }>): Promise<Response> {
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
      shortUrl: `${baseUrl}/${sqidsEncodeId(link.id)}`,
      longUrl: `${baseUrl}/${loganEncodeId(link.id)}`,
      clickCount: link.click_count,
    })),
    clicksByDay: overview.clicksByDay,
  });
}
