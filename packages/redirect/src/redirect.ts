import { Context } from 'hono';
import { RedirectEnv } from './types.js';
import {
  KVLinkData,
  LOGAN_PATTERN,
  loganDecodeSlug,
  sqidsDecodeSlug,
  isCrawler,
  sha256Hex,
  kvGet,
  kvSet,
  kvGetCustomSlug,
} from '@url-shortener/shared';
import { dbGetLink, dbLogClick } from './db.js';

/**
 * Build an HTML response for crawlers with OG meta tags.
 */
function buildOgHtml(targetUrl: string, data: KVLinkData, shortUrl: string, defaultOgImage: string): string {
  const safeTargetUrl = (() => {
    try {
      return new URL(targetUrl);
    } catch {
      return null;
    }
  })();

  const title = (data.ogTitle ?? '').trim() || safeTargetUrl?.hostname || targetUrl;
  const desc = (data.ogDesc ?? '').trim();
  const image = (data.ogImage ?? '').trim() || defaultOgImage;

  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escape(title)}</title>
  <meta property="og:title" content="${escape(title)}" />
  ${desc ? `<meta property="og:description" content="${escape(desc)}" />` : ''}
  ${image ? `<meta property="og:image" content="${escape(image)}" />` : ''}
  <meta property="og:url" content="${escape(shortUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0;url=${escape(targetUrl)}" />
</head>
<body></body>
</html>`;
}

/**
 * Main redirect handler for GET /:slug
 */
export async function handleRedirect(c: Context<{ Bindings: RedirectEnv }>): Promise<Response> {
  const rawSlug = c.req.param('slug') ?? '';
  // Decode percent-encoded Unicode characters (e.g. logan encoding o variants)
  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    return c.text('Not found', 404);
  }

  // 1. Decode slug to ID
  // Resolution order: Logan pattern → custom slug (KV) → Sqids
  let id: number | null = null;
  if (LOGAN_PATTERN.test(slug)) {
    id = loganDecodeSlug(slug);
  } else {
    // 2. Check custom slug in KV before trying Sqids
    const customId = await kvGetCustomSlug(c.env.KV, slug);
    if (customId !== null) {
      id = customId;
    } else {
      id = sqidsDecodeSlug(slug);
    }
  }

  if (id === null) {
    return c.text('Not found', 404);
  }

  // 2. Look up link data — KV first, then D1
  let linkData: KVLinkData | null = await kvGet(c.env.KV, id);

  if (!linkData) {
    const record = await dbGetLink(c.env.DB, id);
    if (!record) return c.text('Not found', 404);
    linkData = {
      url: record.url,
      ogTitle: record.og_title,
      ogDesc: record.og_desc,
      ogImage: record.og_image,
      ogEnabled: Boolean(record.og_enabled),
    };
    // Backfill KV cache on D1 hit
    c.executionCtx.waitUntil(kvSet(c.env.KV, id, linkData));
  }

  const targetUrl = linkData.url;
  const ua = c.req.header('User-Agent') ?? null;

  // 3. OG response decision
  // - crawler UA + OG enabled => return OG HTML
  // - ?og=1 or ?og=true can force OG HTML for debugging/validation tools
  const forceOg = (() => {
    const raw = (c.req.query('og') ?? '').toLowerCase();
    return raw === '1' || raw === 'true';
  })();
  const legacyCustomOg = Boolean(linkData.ogTitle || linkData.ogDesc || linkData.ogImage);
  const ogEnabled = typeof linkData.ogEnabled === 'boolean' ? linkData.ogEnabled : legacyCustomOg;

  if (ogEnabled && (forceOg || isCrawler(ua))) {
    const shortUrl = `${c.env.SHORT_BASE_URL}/${slug}`;
    const html = buildOgHtml(targetUrl, linkData, shortUrl, c.env.DEFAULT_OG_IMAGE);
    return c.html(html, 200);
  }

  // 4. Real user redirect path only — log click asynchronously
  // (crawler/forced OG preview requests are excluded from analytics)
  const referrer = c.req.header('Referer') ?? null;
  const cfData = (c.req.raw as unknown as { cf?: { country?: string } }).cf;
  const country = cfData?.country ?? null;
  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? null;

  c.executionCtx.waitUntil(
    (async () => {
      const ipHash = ip ? await sha256Hex(ip) : null;
      await dbLogClick(c.env.DB, {
        linkId: id!,
        referrer,
        country,
        userAgent: ua,
        ipHash,
      });
    })()
  );

  return c.redirect(targetUrl, 302);
}
