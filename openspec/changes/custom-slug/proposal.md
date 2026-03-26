## Why

Auto-generated slugs (Sqids) are opaque and hard to share meaningfully. Users often want branded or memorable short links like `/github` or `/blog`. Custom slugs are the most-requested feature in URL shortener projects.

## What Changes

### Runtime
- `links` table gains an optional `custom_slug` column (unique, nullable, no spaces, URL-safe chars only)
- Redirect Worker resolves custom slugs before attempting Sqids/Logan decode
- Admin API: `POST /api/links` and `PUT /api/links/:id` accept optional `customSlug` field
- `GET /api/links` and `GET /api/links/:id` return `customSlug` and `customUrl` fields
- KV cache updated to include `customSlug` so redirect Worker can route without D1

### Dashboard UI
- Create/Edit link form: new "Custom slug" input field (optional, with validation feedback)
- Link list: show custom URL badge when `customSlug` is set

### Documentation
- `README.md`: mention custom slug in features list
- `ARCHITECTURE.md`: update DB schema section, redirect resolution order

## Capabilities

### New Capabilities
- `custom-slug`: Users can set a memorable custom path for any link

### Modified Capabilities
- `admin-api`: create/update/list endpoints gain `customSlug` field
- `redirect`: slug resolution checks custom_slug first

## Impact

- `migrations/0003_add_custom_slug.sql`
- `packages/shared/src/services/kv.ts`
- `packages/shared/src/types.ts`
- `packages/redirect/src/redirect.ts`
- `packages/dashboard/src/services/db.ts`
- `packages/dashboard/src/handlers/api.ts`
- `packages/dashboard/frontend/src/views/CreateLink.vue`
- `packages/dashboard/frontend/src/views/EditLink.vue`
- `packages/dashboard/frontend/src/views/LinkList.vue` (or DashboardHome)
- `README.md`
- `ARCHITECTURE.md`
- `openspec/specs/custom-slug/spec.md` (new)
- `openspec/specs/admin-api/spec.md` (updated)
- `openspec/specs/redirect/spec.md` (updated)

## Non-goals
- No vanity analytics per custom slug (uses same click table)
- No slug reservation / blocklist (out of scope for v1)
- No auto-suggest for slugs
