# Custom Slug

**Status:** Implemented
**Capability ID:** `custom-slug`

## Purpose

Allow users to define a memorable, branded path for any short link (e.g. `/github`, `/blog`). Custom slugs are resolved by the Redirect Worker before auto-generated Sqids/Logan paths, enabling stable, human-readable short URLs.

## Requirements

### Functional

- `POST /api/links` accepts optional `customSlug` string field.
- `PUT /api/links/:id` accepts optional `customSlug` string field (`null` or empty string clears the slug).
- `GET /api/links`, `GET /api/links/:id` include `customSlug` and `customUrl` fields when a slug is set.
- `customUrl` is omitted from the response when no custom slug is set (no `null` field).
- Redirect Worker resolves slugs in this order: Logan pattern → `custom:{slug}` KV lookup → Sqids decode → 404.

### Validation

- Pattern: `/^[a-zA-Z0-9_-]{1,64}$/` — only alphanumeric, hyphens, and underscores; 1–64 characters.
- Reserved words: `api`, `dashboard`, `assets` → 400 error.
- Reserved pattern: must not match Logan pattern `/^l[oοоᴏ]{2,}gan$/u` → 400 error.
- Uniqueness: if slug is already taken by another link → 409 `{ "error": "Slug already taken" }`.

### Storage

- DB: `links.custom_slug TEXT UNIQUE` (nullable); added via `migrations/0003_add_custom_slug.sql`.
- KV: key `custom:{slug}` → `{ id: number }` pointer; TTL 24 hours (same as link data cache).
- KV is kept in sync on every create/update/delete operation.

### Frontend

- `CreateLink.vue`: optional custom slug input with client-side pattern validation and server-side 409 error displayed inline.
- `EditLink.vue`: custom slug input pre-filled from existing value; clearing the field sends `null` to remove the slug.
- `LinkList.vue`: shows a custom URL badge alongside short and long URLs when `customSlug` is set.

### Non-Goals

- No per-slug analytics breakout (custom slugs share the same `clicks` table).
- No blocklist or slug reservation beyond the reserved word list.
- No bulk slug import.
- No auto-suggestion for slugs.
