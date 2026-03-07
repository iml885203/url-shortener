import { LinkRecord } from '@url-shortener/shared';

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
