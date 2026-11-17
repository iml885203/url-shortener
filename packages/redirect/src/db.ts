import { LinkRecord, LOGAN_PATTERN, loganDecodeSlug, loganEncodeId } from '@url-shortener/shared';

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

/** Resolve persisted custom/auto codes exactly; Logan remains a canonical ID codec. */
export async function dbGetLinkByCode(db: D1Database, code: string): Promise<LinkRecord | null> {
  const primary = db.withSession('first-primary');
  const record = await primary.prepare('SELECT l.* FROM short_codes s JOIN links l ON l.id = s.link_id WHERE s.code = ?').bind(code).first<LinkRecord>();
  if (record) return record;
  if (!LOGAN_PATTERN.test(code)) return null;
  const id = loganDecodeSlug(code);
  if (id === null || !Number.isSafeInteger(id) || loganEncodeId(id) !== code) return null;
  return primary.prepare('SELECT * FROM links WHERE id = ?').bind(id).first<LinkRecord>();
}
