// Read-only preflight, then a single atomic D1 SQL-file import. Never rename existing codes.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planMigration } from './short-code-migration.mjs';
const cwd = new URL('../packages/dashboard/', import.meta.url);
const run = (...args) => execFileSync('npx', ['wrangler', 'd1', 'execute', 'url-shortener', '--remote', ...args], { cwd, encoding: 'utf8' });
const query = sql => JSON.parse(run('--command', sql, '--json'))[0].results;
if (query("SELECT name FROM sqlite_master WHERE type='table' AND name='short_codes'").length) {
  console.log('Short-code migration already applied.');
  process.exit(0);
}
const rows = query('SELECT id, custom_slug FROM links ORDER BY id');
const sql = planMigration(rows, readFileSync(new URL('../migrations/0005_short_codes.sql', import.meta.url), 'utf8'));
console.log(`Preflight passed: ${rows.length} links with no code collisions.`);
if (process.argv.includes('--check')) process.exit(0);
const file = join(mkdtempSync(join(tmpdir(), 'short-codes-')), 'migration.sql');
writeFileSync(file, sql);
console.log(run('--file', file, '--yes'));
