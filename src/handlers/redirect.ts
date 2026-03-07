import { Context } from 'hono';
import { Env, KVLinkData } from '../types';
import { LOGAN_PATTERN, decodeSlug as loganDecode } from '../codec/logan';
import { decodeSlug as sqidsDecode } from '../codec/sqids';
import { isCrawler } from '../utils/crawler';
import { sha256Hex } from '../utils/hash';
import { kvGet, kvSet } from '../services/kv';
import { dbGetLink, dbLogClick } from '../services/db';

/**
 * Build an HTML response for crawlers with OG meta tags.
 */
function buildOgHtml(targetUrl: string, data: KVLinkData, shortUrl: string): string {
  const title = data.ogTitle ?? '';
  const desc = data.ogDesc ?? '';
  const image = data.ogImage ?? '';

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
  <title>${escape(title) || escape(targetUrl)}</title>
  <meta property="og:title" content="${escape(title)}" />
  <meta property="og:description" content="${escape(desc)}" />
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
export async function handleRedirect(c: Context<{ Bindings: Env }>): Promise<Response> {
  const rawSlug = c.req.param('slug') ?? '';
  // Decode percent-encoded Unicode characters (e.g. logan encoding o variants)
  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    return c.text('Not found', 404);
  }

  // 1. Decode slug to ID
  let id: number | null = null;
  if (LOGAN_PATTERN.test(slug)) {
    id = loganDecode(slug);
  } else {
    id = sqidsDecode(slug);
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
    };
    // Backfill KV cache on D1 hit
    c.executionCtx.waitUntil(
      kvSet(c.env.KV, id, linkData)
    );
  }

  const targetUrl = linkData.url;

  // 3. Log click asynchronously
  const ua = c.req.header('User-Agent') ?? null;
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

  // 4. Crawlers with custom OG get HTML, otherwise everyone gets a redirect
  const hasCustomOg = linkData.ogTitle || linkData.ogDesc || linkData.ogImage;
  if (isCrawler(ua) && hasCustomOg) {
    const shortUrl = `${c.env.SHORT_BASE_URL}/${slug}`;
    const html = buildOgHtml(targetUrl, linkData, shortUrl);
    return c.html(html, 200);
  }

  return c.redirect(targetUrl, 302);
}
