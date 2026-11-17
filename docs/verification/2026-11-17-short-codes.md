# Short-code verification log — 2026-11-17

- Suspect deployment confirmed successful: Actions run 42661134897, commit
  b37100bb1d2e400d552fe60d73fe6911a18d1af6, 2026-11-09 17:05 UTC.
- Reproduced before changing implementation: create `cache-expiry-test`, delete
  its KV pointer (the same state as 24h expiry), request it. Test failed with
  **404 instead of 302**. `kv.ts` sets 86400s TTL; redirect consulted KV then
  Sqids, never D1 by custom slug. A decodable colliding slug could select another
  record. Existing uniqueness covered custom/custom only.
- Production read-only preflight: 14 links, 15 codes, no custom/auto collisions.
  No existing short link was visited or changed during investigation.
- Design: persisted auto/custom codes share `short_codes.code` primary key.
  Triggers atomically reserve/update codes, FK cascade removes them. Creators
  skip IDs whose auto code is reserved. App checks return 409; DB constraints
  arbitrate races. Existing URLs remain unchanged. Responses use stored auto
  codes. Exact persisted codes precede canonical Logan ID fallback.
- Redirects now query D1 primary for routing and content. KV reads and writes
  are retired for this path: stale edge copies, expired pointers and delayed
  backfills cannot resurrect renamed/deleted links or obsolete destinations.
  This trades cache latency/read savings for consistent behavior.
- Guarded migration performs read-only collision preflight, verifies the same
  ID/custom-code snapshot inside the SQL import, then backfills and installs
  triggers in one D1 transaction. Duplicate/snapshot failures stop deployment;
  no codes are silently renamed. Dashboard rollout precedes redirect rollout.
- Whole-repository review passes covered workers, codecs, SQL, auth/session
  lifecycle, request validation, uploads/preview fetches, frontend async flows,
  build/setup and deployment. Fixed: malformed JSON field types; partial or
  unsafe IDs; missing reserved `auth`; custom-code search; lost partial edits;
  shared OG-image deletion; upload filename collisions; preview image URL base
  after redirects; stale preview/list responses; QR response after modal close.
  Canonical route lookup also removes Sqids decoder aliases and unsafe Logan
  integer/leading-zero aliases. No further blocking findings in the final pass.
- Verification includes expiry, stale KV, rename, delete, reuse, both collision
  directions, concurrent reservations/edits, DB constraints, migration data
  preservation and rollback, validation, auth and OG HTML escaping. ESLint and
  Vue typechecking were added because no lint command existed and typechecking
  previously covered only dashboard backend. UI snapshot files were unchanged.
- Operational limits: D1 primary is now on every redirect. Old dashboards cannot
  create links between schema migration and dashboard rollout; retry after
  rollout. Rollback must retain registry-compatible code. Full browser suite
  intentionally skips the opt-in README screenshot capture.
- Final local checks: 40/40 unit/integration tests; 11/11 enabled browser tests
  (one opt-in screenshot test skipped); lint with zero warnings; shared,
  redirect, dashboard and Vue typechecks; frontend production build; both
  Worker deployment dry-run builds; UI snapshot and whitespace checks passed.
