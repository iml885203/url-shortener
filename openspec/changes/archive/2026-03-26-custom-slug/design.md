## Context

Add optional custom slug support to the URL shortener. Custom slugs are user-defined URL-safe strings stored separately from the auto-generated Sqids/Logan encoding.

## Goals / Non-Goals

**Goals:**
- Optional `customSlug` on create and update
- Redirect priority: custom_slug > Logan > Sqids
- Validation: alphanumeric + hyphen/underscore, 1–64 chars, unique
- Conflict detection: 409 on duplicate; clear error on reserved patterns
- Full roundtrip: KV cache, D1 storage, API response, frontend UI
- English docs updated

**Non-Goals:**
- No blocklist/reservation system
- No custom slug analytics breakout
- No bulk slug import

## Key Design Decisions

### Redirect resolution order
```
1. Check LOGAN_PATTERN regex → Logan decode
2. Check custom_slug index in KV (key: "custom:{slug}") → link ID
3. Sqids decode
4. 404
```
Custom slug is checked via KV (fast path), not D1 scan.

### KV schema extension
Existing key: `{id}` → `{ url, ogTitle, ogDesc, ogImage, ogEnabled }`
New key: `custom:{slug}` → `{ id }` (pointer to link id)

On create/update with customSlug:
- Write `custom:{slug}` → `{ id }` to KV
- On delete or slug change: remove old `custom:{slug}` from KV

### DB migration
```sql
ALTER TABLE links ADD COLUMN custom_slug TEXT UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_links_custom_slug ON links(custom_slug);
```
Nullable, unique. No backfill needed.

### Validation rules
- Pattern: `/^[a-zA-Z0-9_-]{1,64}$/`
- Reserved: must not match LOGAN_PATTERN (`/^l[oοоᴏ]{2,}gan$/u`)
- Reserved: must not be `api`, `dashboard`, `assets` (Worker route prefixes)
- Conflict: 409 if slug already taken by another link

### API changes

`POST /api/links` body:
```json
{ "url": "...", "customSlug": "github" }
```

`PUT /api/links/:id` body:
```json
{ "customSlug": "new-slug" }   // update slug
{ "customSlug": null }          // remove slug
```

Response (create/update/list/get) adds:
```json
{
  "customSlug": "github",
  "customUrl": "https://your-domain.com/github"
}
```

### Frontend
- `CreateLink.vue` / `EditLink.vue`: optional text input after URL field
  - Client-side pattern validation (immediate feedback)
  - Server-side 409 error shown inline
- `LinkList.vue`: show `customUrl` as a third badge/row when set

## Migration Plan

1. Add `migrations/0003_add_custom_slug.sql`
2. Update shared types and KV helpers
3. Update redirect Worker resolution order
4. Update dashboard API handlers
5. Update frontend views
6. Update docs (README + ARCHITECTURE)
7. Run wrangler d1 execute for migration on prod (manual step)

## Risks

- [Low] KV `custom:` key namespace collision with future features → Mitigation: document the prefix convention.
- [Low] Users set custom slug that matches a future Worker route → Mitigation: reserved list includes `api`, `dashboard`, `assets`.

## Open Questions

- Should `customUrl` appear in the share payload? → Yes, add as fourth URL option.
