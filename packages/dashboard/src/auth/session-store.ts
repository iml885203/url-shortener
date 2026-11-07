// OIDC sessions are local to this application. D1 primary reads avoid stale revocation.
export const SESSION_SECONDS = 180 * 24 * 60 * 60;
const now = () => Math.floor(Date.now() / 1000);
export async function sessionHash(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
}
export class SessionStore {
  constructor(private db: D1Database, private secret: string) {}
  private primary() { return this.db.withSession('first-primary'); }
  async create(subject: string, issued: number): Promise<string> {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), x => x.toString(16).padStart(2, '0')).join('');
    const hash = await sessionHash(token, this.secret);
    const db = this.primary();
    const results = await db.batch([
      db.prepare('DELETE FROM auth_sessions WHERE expires <= ?').bind(now()),
      db.prepare('DELETE FROM auth_revoked WHERE expires <= ?').bind(now()),
      db.prepare(`INSERT INTO auth_sessions (id_hash, subject, issued, expires)
        SELECT ?, ?, ?, ? WHERE (SELECT count(*) FROM auth_sessions) < 10000
        AND NOT EXISTS (SELECT 1 FROM auth_revoked WHERE subject = ? AND cutoff >= ?)`)
        .bind(hash, subject, issued, now() + SESSION_SECONDS, subject, issued),
    ]);
    if (results[2].meta.changes !== 1) throw new Error('Session denied or capacity reached');
    return token;
  }
  async read(token?: string): Promise<{ subject: string } | null> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    return this.primary().prepare('SELECT subject FROM auth_sessions WHERE id_hash = ? AND expires > ?')
      .bind(await sessionHash(token, this.secret), now()).first<{ subject: string }>();
  }
  async logout(token?: string): Promise<void> {
    if (token && /^[a-f0-9]{64}$/.test(token)) await this.primary().prepare('DELETE FROM auth_sessions WHERE id_hash = ?')
      .bind(await sessionHash(token, this.secret)).run();
  }
  async revoke(subject: string, issued: number, jti: string, expiry: number): Promise<void> {
    const db = this.primary();
    const cutoff = Math.max(now(), issued);
    const results = await db.batch([
      db.prepare('DELETE FROM auth_replay WHERE expires <= ?').bind(now()),
      db.prepare('DELETE FROM auth_revoked WHERE expires <= ?').bind(now()),
      db.prepare('DELETE FROM auth_sessions WHERE expires <= ?').bind(now()),
      db.prepare(`INSERT INTO auth_revoked (subject, cutoff, expires)
        SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM auth_replay WHERE jti = ?)
        AND ((SELECT count(*) FROM auth_revoked) < 10000 OR EXISTS (SELECT 1 FROM auth_revoked WHERE subject = ?))
        ON CONFLICT(subject) DO UPDATE SET cutoff = max(cutoff, excluded.cutoff), expires = max(expires, excluded.expires)`)
        .bind(subject, cutoff, now() + SESSION_SECONDS, jti, subject),
      db.prepare(`DELETE FROM auth_sessions WHERE subject = ? AND NOT EXISTS (SELECT 1 FROM auth_replay WHERE jti = ?)
        AND EXISTS (SELECT 1 FROM auth_revoked WHERE subject = ? AND cutoff >= ?)`)
        .bind(subject, jti, subject, cutoff),
      db.prepare(`INSERT OR IGNORE INTO auth_replay (jti, expires) SELECT ?, ?
        WHERE EXISTS (SELECT 1 FROM auth_revoked WHERE subject = ? AND cutoff >= ?)`)
        .bind(jti, expiry + 30, subject, cutoff),
    ]);
    if (!results[5].meta.changes && !await db.prepare('SELECT jti FROM auth_replay WHERE jti = ?').bind(jti).first()) {
      throw new Error('Revocation capacity reached');
    }
  }
}
