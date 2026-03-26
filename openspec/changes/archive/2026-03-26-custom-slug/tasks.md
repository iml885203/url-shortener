## 1. Database

- [ ] 1.1 Create `migrations/0003_add_custom_slug.sql` (ALTER TABLE + CREATE UNIQUE INDEX)

## 2. Shared package

- [ ] 2.1 Update `packages/shared/src/types.ts` — add `customSlug` to `KVLinkData` and link types
- [ ] 2.2 Update `packages/shared/src/services/kv.ts` — add `kvSetCustomSlug`, `kvGetCustomSlug`, `kvDeleteCustomSlug` helpers (key: `custom:{slug}`)

## 3. Redirect Worker

- [ ] 3.1 Update `packages/redirect/src/redirect.ts` — resolution order: Logan → custom_slug (KV) → Sqids
- [ ] 3.2 On custom slug hit: lookup link ID from KV, then fetch link data normally

## 4. Dashboard API

- [ ] 4.1 Update `packages/dashboard/src/services/db.ts` — include `custom_slug` in all queries (list, get, create, update, delete)
- [ ] 4.2 Update `packages/dashboard/src/handlers/api.ts`:
  - Validate `customSlug` format (pattern + reserved words check)
  - 409 on duplicate slug
  - Sync KV on create/update/delete
  - Include `customSlug` + `customUrl` in all link responses

## 5. Frontend

- [ ] 5.1 `CreateLink.vue` — add optional custom slug input with client-side validation
- [ ] 5.2 `EditLink.vue` — add custom slug input (pre-filled if set, clearable)
- [ ] 5.3 `LinkList.vue` or `DashboardHome.vue` — show `customUrl` badge when set

## 6. Documentation

- [ ] 6.1 `README.md` — add custom slug to features list and self-hosting notes
- [ ] 6.2 `ARCHITECTURE.md` — update DB schema, redirect resolution order, KV schema

## 7. OpenSpec

- [ ] 7.1 Create `openspec/specs/custom-slug/spec.md`
- [ ] 7.2 Update `openspec/specs/admin-api/spec.md` (MODIFIED)
- [ ] 7.3 Update `openspec/specs/redirect/spec.md` (MODIFIED)
