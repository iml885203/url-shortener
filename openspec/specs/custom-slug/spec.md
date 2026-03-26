# Spec: custom-slug

## Purpose

Allow users to define a memorable, branded path for any short link (e.g. `/github`, `/blog`). Custom slugs are resolved by the Redirect Worker before auto-generated Sqids/Logan paths, enabling stable, human-readable short URLs.
## Requirements
### Requirement: Create link with custom slug
The system MUST allow an optional `customSlug` field on link creation.

#### Scenario: Create with valid custom slug
- **WHEN** `POST /api/links` is called with a valid `customSlug`
- **THEN** the system MUST store the slug and return `customSlug` and `customUrl` in the response

#### Scenario: Create without custom slug
- **WHEN** `POST /api/links` is called without `customSlug`
- **THEN** the system MUST create the link normally without `customSlug`/`customUrl` fields in the response

### Requirement: Update link custom slug
The system MUST allow updating or clearing a custom slug via `PUT /api/links/:id`.

#### Scenario: Update to new slug
- **WHEN** `PUT /api/links/:id` is called with a new `customSlug`
- **THEN** the system MUST update the slug, invalidate the old KV key, and return the updated `customSlug` and `customUrl`

#### Scenario: Clear custom slug
- **WHEN** `PUT /api/links/:id` is called with `customSlug: null` or empty string
- **THEN** the system MUST remove the slug and delete the `custom:{slug}` KV key

### Requirement: Custom slug resolution in redirect
The system MUST resolve custom slugs before Sqids decode.

#### Scenario: Redirect via custom slug
- **WHEN** a visitor accesses `/{customSlug}`
- **THEN** the system MUST look up `custom:{slug}` in KV, resolve the link ID, and redirect to the target URL

#### Scenario: Resolution order
- **WHEN** a slug is received by the Redirect Worker
- **THEN** the system MUST check in order: Logan pattern → `custom:{slug}` KV → Sqids decode → 404

### Requirement: Custom slug validation
The system MUST validate custom slug format and uniqueness.

#### Scenario: Invalid format
- **WHEN** `customSlug` does not match `/^[a-zA-Z0-9_-]{1,64}$/`
- **THEN** the system MUST return `400` with a format error message

#### Scenario: Reserved word
- **WHEN** `customSlug` is one of `api`, `dashboard`, `assets`
- **THEN** the system MUST return `400` with a reserved slug error

#### Scenario: Reserved Logan pattern
- **WHEN** `customSlug` matches Logan pattern `/^l[oοоᴏ]{2,}gan$/u`
- **THEN** the system MUST return `400` with a pattern conflict error

#### Scenario: Duplicate slug
- **WHEN** `customSlug` is already owned by another link
- **THEN** the system MUST return `409` with `{ "error": "Slug already taken" }`

### Requirement: KV cache synchronization for custom slugs
The system MUST maintain a `custom:{slug}` KV pointer in sync with DB state.

#### Scenario: Write custom slug to KV on create/update
- **WHEN** a link is created or updated with a `customSlug`
- **THEN** the system MUST write `custom:{slug}` → `{ id }` to KV with TTL 24h

#### Scenario: Delete custom slug from KV on remove
- **WHEN** a custom slug is cleared or the link is deleted
- **THEN** the system MUST delete the `custom:{slug}` KV key

### Requirement: Users can create links with a custom slug
The system MUST allow an optional `customSlug` field on link creation and update.

#### Scenario: Custom slug resolves correctly
- **WHEN** a visitor accesses `/{customSlug}`
- **THEN** the system MUST redirect to the target URL via the custom slug resolution path

