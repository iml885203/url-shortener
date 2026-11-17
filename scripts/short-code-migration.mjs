import Sqids from 'sqids';
const codec = new Sqids({ alphabet: 'bcdefhijkmopqrstuvwxyzBCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', minLength: 2 });
const quote = value => value === null ? 'NULL' : "'" + String(value).replaceAll("'", "''") + "'";
export function planMigration(rows, template) {
  const owners = new Set();
  for (const row of rows) {
    for (const code of [codec.encode([row.id]), row.custom_slug].filter(x => x !== null)) {
      if (owners.has(code)) throw new Error('Existing code collision; migration stopped before any writes');
      owners.add(code);
    }
  }
  // Guard against concurrent creates, deletes or renames since preflight. A failed CHECK
  // aborts the entire file import, including ALTER TABLE. No data is silently skipped.
  const snapshot = rows.length ? rows.map(r => `(${r.id}, ${quote(r.custom_slug)})`).join(',') : '';
  const guard = `CREATE TABLE _short_codes_guard (ok INTEGER CHECK(ok = 1));
  INSERT INTO _short_codes_guard SELECT CASE WHEN (SELECT count(*) FROM links) = ${rows.length}
  AND NOT EXISTS (SELECT id, custom_slug FROM links EXCEPT SELECT * FROM (${snapshot ? 'VALUES ' + snapshot : 'SELECT NULL, NULL WHERE 0'})) THEN 1 ELSE 0 END;
  DROP TABLE _short_codes_guard;`;
  const backfill = rows.map(r => `UPDATE links SET auto_slug = ${quote(codec.encode([r.id]))} WHERE id = ${r.id};`).join('\n');
  return guard + '\n' + template.replace('-- BACKFILL', backfill);
}
