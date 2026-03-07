import { LinkRecord, ClickRecord } from '@url-shortener/shared';
import {
  LinkWithStats,
  DayStats,
  ReferrerStats,
  CountryStats,
  OverviewStats,
  OverviewTopLinkRow,
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

/**
 * Get all links with their total click count.
 */
export async function dbListLinks(db: D1Database): Promise<LinkWithStats[]> {
  const result = await db
    .prepare(
      `SELECT l.*, COUNT(c.id) as click_count
       FROM links l
       LEFT JOIN clicks c ON c.link_id = l.id
       GROUP BY l.id
       ORDER BY l.created_at DESC`
    )
    .all<LinkWithStats>();
  return result.results ?? [];
}

/**
 * Create a new link. Returns the created record.
 */
export async function dbCreateLink(
  db: D1Database,
  data: { url: string; ogTitle?: string; ogDesc?: string; ogImage?: string; ogEnabled?: boolean }
): Promise<LinkRecord> {
  const result = await db
    .prepare(
      `INSERT INTO links (url, og_title, og_desc, og_image, og_enabled)
       VALUES (?, ?, ?, ?, ?)
       RETURNING *`
    )
    .bind(
      data.url,
      data.ogTitle ?? null,
      data.ogDesc ?? null,
      data.ogImage ?? null,
      data.ogEnabled ? 1 : 0
    )
    .first<LinkRecord>();

  if (!result) throw new Error('Failed to create link');
  return result;
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
  }
): Promise<LinkRecord | null> {
  const existing = await dbGetLink(db, id);
  if (!existing) return null;

  const url = data.url ?? existing.url;
  const ogTitle = data.ogTitle !== undefined ? data.ogTitle : existing.og_title;
  const ogDesc = data.ogDesc !== undefined ? data.ogDesc : existing.og_desc;
  const ogImage = data.ogImage !== undefined ? data.ogImage : existing.og_image;
  const ogEnabled = data.ogEnabled !== undefined ? (data.ogEnabled ? 1 : 0) : existing.og_enabled;

  const result = await db
    .prepare(
      `UPDATE links
       SET url = ?, og_title = ?, og_desc = ?, og_image = ?, og_enabled = ?, updated_at = datetime('now')
       WHERE id = ?
       RETURNING *`
    )
    .bind(url, ogTitle, ogDesc, ogImage, ogEnabled, id)
    .first<LinkRecord>();

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
          `SELECT l.id, l.url, COUNT(c.id) as click_count
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
      url: link.url,
      click_count: Number(link.click_count),
    })),
    clicksByDay,
  };
}
