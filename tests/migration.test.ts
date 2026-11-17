import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { planMigration } from '../scripts/short-code-migration.mjs';
import { sqidsEncodeId } from '../packages/shared/src/index';
const template = readFileSync(new URL('../migrations/0005_short_codes.sql', import.meta.url), 'utf8');
function fixture() {
  const db = new DatabaseSync(':memory:');
  for (const name of ['0001_init.sql', '0002_add_og_enabled.sql', '0003_add_custom_slug.sql']) db.exec(readFileSync(new URL('../migrations/' + name, import.meta.url), 'utf8'));
  db.exec("INSERT INTO links (url, custom_slug) VALUES ('https://example.com', 'existing-code')");
  return db;
}
function apply(db: DatabaseSync, sql: string) {
  db.exec('BEGIN');
  try { db.exec(sql); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
}
it('preserves existing links and reserves both code kinds; reruns are detected by deploy script', () => {
  const db = fixture();
  const rows = db.prepare('SELECT id, custom_slug FROM links').all();
  apply(db, planMigration(rows, template));
  expect(db.prepare('SELECT code FROM short_codes ORDER BY kind').all().map(r => r.code)).toEqual([sqidsEncodeId(1), 'existing-code']);
  expect(db.prepare('SELECT url FROM links').get()?.url).toBe('https://example.com');
  expect(() => db.exec("INSERT INTO links (auto_slug, url) VALUES ('existing-code', 'https://other.example')")).toThrow(/UNIQUE/);
  expect(() => db.exec("INSERT INTO links (url) VALUES ('https://old-worker.example')")).toThrow(/NOT NULL/);
  db.close();
});
it('fails before writes on existing cross-kind collisions', () => {
  expect(() => planMigration([{ id: 1, custom_slug: sqidsEncodeId(2) }, { id: 2, custom_slug: null }], template)).toThrow(/collision/);
});
it('aborts and rolls back if a link is created, deleted or renamed after preflight', () => {
  for (const mutation of ["INSERT INTO links (url) VALUES ('https://new.example')", 'DELETE FROM links', "UPDATE links SET custom_slug = 'renamed'"]) {
    const db = fixture();
    const sql = planMigration(db.prepare('SELECT id, custom_slug FROM links').all(), template);
    db.exec(mutation);
    expect(() => apply(db, sql)).toThrow(/CHECK/);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'short_codes'").get()).toBeUndefined();
    expect(db.prepare('PRAGMA table_info(links)').all().some(r => r.name === 'auto_slug')).toBe(false);
    db.close();
  }
});
it('migrates an empty database', () => {
  const db = fixture(); db.exec('DELETE FROM links');
  apply(db, planMigration([], template));
  expect(db.prepare('SELECT count(*) AS n FROM short_codes').get()?.n).toBe(0);
  db.close();
});
