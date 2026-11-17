import { sqidsEncodeId, LinkRecord, ClickRecord } from '@url-shortener/shared';
import {
  LinkWithStats,
  DayStats,
  ReferrerStats,
  CountryStats,
  OverviewStats,
  OverviewTopLinkRow,
  LinksPageResult,
} from '../types.js';

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Get a single link by ID.
 */
export async function dbGetLink(db: D1Database, id: number): Promise<LinkRecord | null> {
  const result = await db
    .prepare('SELECT * FROM links WHERE id = ?')
    .bind(id)
    .first<LinkRecord>();
  return result ?? null;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * List links with optional search + pagination.
 */
export async function dbListLinksPage(
  db: D1Database,
  options: {
    q?: string;
    exactId?: number | null;
    page: number;
    pageSize: number;
  }
): Promise<LinksPageResult> {
  const trimmedQuery = options.q?.trim() ?? '';
  const hasQuery = trimmedQuery.length > 0;
  const hasExactId = typeof options.exactId === 'number' && Number.isFinite(options.exactId);
  const page = Math.max(1, Math.trunc(options.page));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(options.pageSize)));
  const offset = (page - 1) * pageSize;

  const whereClause = hasQuery || hasExactId
    ? `WHERE (
         l.url LIKE ? ESCAPE '\\'
         OR IFNULL(l.og_title, '') LIKE ? ESCAPE '\\'
         OR IFNULL(l.og_desc, '') LIKE ? ESCAPE '\\'
         OR CAST(l.id AS TEXT) LIKE ? ESCAPE '\\'
         OR IFNULL(l.custom_slug, '') LIKE ? ESCAPE '\\'
         OR (? IS NOT NULL AND l.id = ?)
       )`
    : '';

  const searchValue = hasQuery ? `%${escapeLike(trimmedQuery)}%` : '';
  const exactId = hasExactId ? Math.trunc(options.exactId as number) : null;
  const baseBindings = [searchValue, searchValue, searchValue, searchValue, searchValue, exactId, exactId];
  const countBindings = hasQuery || hasExactId ? baseBindings : [];
  const listBindings = hasQuery || hasExactId ? [...baseBindings, pageSize, offset] : [pageSize, offset];

  const countQuery = `SELECT COUNT(*) as count FROM links l ${whereClause}`;
  const listQuery = `SELECT l.*, COUNT(c.id) as click_count
                     FROM links l
                     LEFT JOIN clicks c ON c.link_id = l.id
                     ${whereClause}
                     GROUP BY l.id
                     ORDER BY l.created_at DESC
                     LIMIT ? OFFSET ?`;

  const [countResult, listResult] = await Promise.all([
    db.prepare(countQuery).bind(...countBindings).first<{ count: number }>(),
    db.prepare(listQuery).bind(...listBindings).all<LinkWithStats>(),
  ]);

  return {
    items: listResult.results ?? [],
    total: Number(countResult?.count ?? 0),
  };
}

/**
 * Create a new link. Returns the created record.
 */
export async function dbCreateLink(
  db: D1Database,
  data: { url: string; ogTitle?: string; ogDesc?: string; ogImage?: string; ogEnabled?: boolean; customSlug?: string }
): Promise<LinkRecord> {
  // Reserve candidate IDs and both codes in one statement via database triggers.
  // Explicit IDs let us skip future auto codes already owned by a custom code.
  for (let attempt = 0; attempt < 20; attempt++) {
    const sequence = await db.prepare("SELECT max(coalesce((SELECT seq FROM sqlite_sequence WHERE name = 'links'), 0), coalesce((SELECT max(id) FROM links), 0)) AS id").first<{ id: number }>();
    let id = (sequence?.id ?? 0) + 1;
    while (await db.prepare('SELECT 1 FROM short_codes WHERE code = ?').bind(sqidsEncodeId(id)).first() || sqidsEncodeId(id) === data.customSlug) id++;
    if (data.customSlug && await db.prepare('SELECT 1 FROM short_codes WHERE code = ?').bind(data.customSlug).first()) throw new Error('Slug already taken');
    try {
      const result = await db.prepare(`INSERT INTO links (id, auto_slug, url, og_title, og_desc, og_image, og_enabled, custom_slug)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`)
        .bind(id, sqidsEncodeId(id), data.url, data.ogTitle ?? null, data.ogDesc ?? null, data.ogImage ?? null, data.ogEnabled ? 1 : 0, data.customSlug ?? null).first<LinkRecord>();
      if (!result) throw new Error('Failed to create link');
      return result;
    } catch (error) {
      if (!String(error).includes('UNIQUE')) throw error;
      // A concurrent creator or rename won the reservation. Retry from D1.
    }
  }
  throw new Error('Link allocation contention; please retry');
}

/**
 * Update an existing link. Returns the updated record.
 */
export async function dbUpdateLink(
  db: D1Database,
  id: number,
  data: {
    url?: string;
    ogTitle?: string | null;
    ogDesc?: string | null;
    ogImage?: string | null;
    ogEnabled?: boolean;
    customSlug?: string | null;
  }
): Promise<LinkRecord | null> {
  if (data.customSlug && await db.prepare('SELECT 1 FROM short_codes WHERE code = ? AND NOT (link_id = ? AND kind = ?)').bind(data.customSlug, id, 'custom').first()) throw new Error('Slug already taken');
  // Update only supplied fields so simultaneous edits do not overwrite each other.
  const fields: [string, string | number | null | undefined][] = [
    ['url', data.url], ['og_title', data.ogTitle], ['og_desc', data.ogDesc],
    ['og_image', data.ogImage], ['og_enabled', data.ogEnabled === undefined ? undefined : Number(data.ogEnabled)],
    ['custom_slug', data.customSlug],
  ];
  const supplied = fields.filter(([, value]) => value !== undefined);
  const assignments = supplied.map(([name]) => `${name} = ?`);
  const values = supplied.map(([, value]) => value as string | number | null);
  const result = await db.prepare(`UPDATE links SET ${[...assignments, "updated_at = datetime('now')"].join(', ')} WHERE id = ? RETURNING *`)
    .bind(...values, id).first<LinkRecord>();
  return result ?? null;
}

/**
 * Delete a link by ID. Returns true if a row was deleted.
 */
export async function dbDeleteLink(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare('DELETE FROM links WHERE id = ?').bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}

/**
 * Insert a click log entry.
 */
export async function dbLogClick(
  db: D1Database,
  data: {
    linkId: number;
    referrer: string | null;
    country: string | null;
    userAgent: string | null;
    ipHash: string | null;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO clicks (link_id, referrer, country, user_agent, ip_hash)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(data.linkId, data.referrer, data.country, data.userAgent, data.ipHash)
    .run();
}

/**
 * Get click count by day for a link.
 */
export async function dbGetClicksByDay(db: D1Database, linkId: number): Promise<DayStats[]> {
  const result = await db
    .prepare(
      `SELECT date(clicked_at) as date, COUNT(*) as count
       FROM clicks
       WHERE link_id = ?
       GROUP BY date(clicked_at)
       ORDER BY date DESC
       LIMIT 30`
    )
    .bind(linkId)
    .all<DayStats>();
  return result.results ?? [];
}

/**
 * Get click count by referrer for a link.
 */
export async function dbGetClicksByReferrer(
  db: D1Database,
  linkId: number
): Promise<ReferrerStats[]> {
  const result = await db
    .prepare(
      `SELECT referrer, COUNT(*) as count
       FROM clicks
       WHERE link_id = ?
       GROUP BY referrer
       ORDER BY count DESC
       LIMIT 20`
    )
    .bind(linkId)
    .all<ReferrerStats>();
  return result.results ?? [];
}

/**
 * Get click count by country for a link.
 */
export async function dbGetClicksByCountry(
  db: D1Database,
  linkId: number
): Promise<CountryStats[]> {
  const result = await db
    .prepare(
      `SELECT country, COUNT(*) as count
       FROM clicks
       WHERE link_id = ?
       GROUP BY country
       ORDER BY count DESC
       LIMIT 20`
    )
    .bind(linkId)
    .all<CountryStats>();
  return result.results ?? [];
}

/**
 * Get recent click records for a link.
 */
export async function dbGetRecentClicks(
  db: D1Database,
  linkId: number,
  limit = 50
): Promise<ClickRecord[]> {
  const result = await db
    .prepare(
      `SELECT * FROM clicks
       WHERE link_id = ?
       ORDER BY clicked_at DESC
       LIMIT ?`
    )
    .bind(linkId, limit)
    .all<ClickRecord>();
  return result.results ?? [];
}

/**
 * Get aggregate overview stats for the dashboard.
 */
export async function dbGetOverviewStats(db: D1Database): Promise<OverviewStats> {
  const [todayResult, weekResult, totalLinksResult, topLinksResult, clicksByDayResult] =
    await Promise.all([
      db
        .prepare(
          `SELECT COUNT(*) as count
           FROM clicks
           WHERE date(clicked_at) = date(?)`
        )
        .bind('now')
        .first<{ count: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) as count
           FROM clicks
           WHERE clicked_at >= datetime(?, ?)`
        )
        .bind('now', '-7 days')
        .first<{ count: number }>(),
      db.prepare('SELECT COUNT(*) as count FROM links').first<{ count: number }>(),
      db
        .prepare(
          `SELECT l.id, l.auto_slug, l.url, COUNT(c.id) as click_count
           FROM links l
           LEFT JOIN clicks c ON c.link_id = l.id
           GROUP BY l.id
           ORDER BY click_count DESC, l.id DESC
           LIMIT ?`
        )
        .bind(5)
        .all<OverviewTopLinkRow>(),
      db
        .prepare(
          `SELECT date(clicked_at) as date, COUNT(*) as count
           FROM clicks
           WHERE date(clicked_at) >= date(?, ?)
           GROUP BY date(clicked_at)
           ORDER BY date(clicked_at) ASC`
        )
        .bind('now', '-13 days')
        .all<DayStats>(),
    ]);

  const dayCounts = new Map(
    (clicksByDayResult.results ?? []).map((row) => [row.date, Number(row.count)])
  );

  const today = startOfUtcDay(new Date());
  const range14Start = addUtcDays(today, -13);
  const clicksByDay: DayStats[] = [];

  for (let i = 0; i < 14; i += 1) {
    const date = formatUtcDate(addUtcDays(range14Start, i));
    clicksByDay.push({ date, count: dayCounts.get(date) ?? 0 });
  }

  return {
    todayClicks: Number(todayResult?.count ?? 0),
    weekClicks: Number(weekResult?.count ?? 0),
    totalLinks: Number(totalLinksResult?.count ?? 0),
    topLinks: (topLinksResult.results ?? []).map((link) => ({
      id: link.id,
      auto_slug: link.auto_slug,
      url: link.url,
      click_count: Number(link.click_count),
    })),
    clicksByDay,
  };
}
