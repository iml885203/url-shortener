import {
  LinkRecord,
  LinkWithStats,
  ClickRecord,
  DayStats,
  ReferrerStats,
  CountryStats,
} from '../types';

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
  data: { url: string; ogTitle?: string; ogDesc?: string; ogImage?: string }
): Promise<LinkRecord> {
  const result = await db
    .prepare(
      `INSERT INTO links (url, og_title, og_desc, og_image)
       VALUES (?, ?, ?, ?)
       RETURNING *`
    )
    .bind(data.url, data.ogTitle ?? null, data.ogDesc ?? null, data.ogImage ?? null)
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
  data: { url?: string; ogTitle?: string | null; ogDesc?: string | null; ogImage?: string | null }
): Promise<LinkRecord | null> {
  const existing = await dbGetLink(db, id);
  if (!existing) return null;

  const url = data.url ?? existing.url;
  const ogTitle = data.ogTitle !== undefined ? data.ogTitle : existing.og_title;
  const ogDesc = data.ogDesc !== undefined ? data.ogDesc : existing.og_desc;
  const ogImage = data.ogImage !== undefined ? data.ogImage : existing.og_image;

  const result = await db
    .prepare(
      `UPDATE links
       SET url = ?, og_title = ?, og_desc = ?, og_image = ?, updated_at = datetime('now')
       WHERE id = ?
       RETURNING *`
    )
    .bind(url, ogTitle, ogDesc, ogImage, id)
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
