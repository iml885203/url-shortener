# Spec: admin-api

## Purpose

Define the authenticated dashboard/admin API contract for link management, share/QR utilities, analytics, upload, and OG metadata preview.
## Requirements
### Requirement: API key authentication for admin endpoints
All `/api/*` admin endpoints MUST require a valid `X-API-Key` header.

#### Scenario: Missing or invalid API key
- **WHEN** a request is sent to any admin endpoint without a valid API key
- **THEN** the system MUST return `401` with `{ "error": "Unauthorized" }`

#### Scenario: Valid API key
- **WHEN** a request is sent with a valid API key
- **THEN** the system MUST continue request processing and return endpoint-specific response

### Requirement: API key verification endpoint
The system MUST provide `GET /api/me` for API key verification.

#### Scenario: Verify key success
- **WHEN** `GET /api/me` is called with a valid API key
- **THEN** the system MUST return `200` with `{ "ok": true }`

### Requirement: Link listing supports search and pagination
The system MUST provide `GET /api/links` with optional search and pagination.

#### Scenario: Default list response
- **WHEN** `GET /api/links` is called without query parameters
- **THEN** the system MUST return `{ items, page, pageSize, total, totalPages }` with defaults `page=1` and `pageSize=20`

#### Scenario: Search links
- **WHEN** `GET /api/links?q=<query>` is called
- **THEN** the system MUST filter links by query match and return paginated results

#### Scenario: Pagination bounds
- **WHEN** `GET /api/links?page=<p>&pageSize=<n>` is called
- **THEN** the system MUST treat non-positive values as defaults and MUST cap `pageSize` at `100`

#### Scenario: List item response shape
- **WHEN** `GET /api/links` returns items
- **THEN** each item MUST include `id`, `url`, `shortUrl`, `longUrl`, `ogTitle`, `ogDesc`, `ogImage`, `ogEnabled`, `createdAt`, `updatedAt`, and `clickCount`

### Requirement: Get one link endpoint
The system MUST provide `GET /api/links/:id` to fetch a single link.

#### Scenario: Get one link success
- **WHEN** `GET /api/links/:id` is called with an existing numeric ID
- **THEN** the system MUST return `id`, `url`, `shortUrl`, `longUrl`, `ogTitle`, `ogDesc`, `ogImage`, `ogEnabled`, `createdAt`, and `updatedAt`

#### Scenario: Invalid ID format
- **WHEN** `GET /api/links/:id` is called with non-numeric ID
- **THEN** the system MUST return `400` with `{ "error": "Invalid ID" }`

#### Scenario: Link not found
- **WHEN** `GET /api/links/:id` is called with non-existent ID
- **THEN** the system MUST return `404` with `{ "error": "Link not found" }`

### Requirement: Share payload endpoint
The system MUST provide `GET /api/links/:id/share` for share payload generation.

#### Scenario: Get share payload success
- **WHEN** `GET /api/links/:id/share` is called with an existing link ID
- **THEN** the system MUST return `shortUrl`, `longUrl`, `targetUrl`, `shortShareText`, and `longShareText`

### Requirement: Create link endpoint
The system MUST provide `POST /api/links` to create a new link.

#### Scenario: Create link success
- **WHEN** `POST /api/links` is called with valid `url` and optional `ogTitle`, `ogDesc`, `ogImage`, `ogEnabled`
- **THEN** the system MUST create the link and return `201` with canonical camelCase link fields

#### Scenario: Invalid JSON body
- **WHEN** `POST /api/links` body is not valid JSON
- **THEN** the system MUST return `400` with `{ "error": "Invalid JSON" }`

#### Scenario: Missing URL
- **WHEN** `POST /api/links` is called without `url`
- **THEN** the system MUST return `400` with `{ "error": "url is required" }`

#### Scenario: Invalid URL scheme
- **WHEN** `POST /api/links` is called with non-http(s) URL
- **THEN** the system MUST return `400` with `{ "error": "URL must use http or https scheme" }`

#### Scenario: Invalid ogEnabled type
- **WHEN** `POST /api/links` is called with non-boolean `ogEnabled`
- **THEN** the system MUST return `400` with `{ "error": "ogEnabled must be a boolean" }`

### Requirement: Update link endpoint
The system MUST provide `PUT /api/links/:id` for partial updates.

#### Scenario: Update link success
- **WHEN** `PUT /api/links/:id` is called with valid fields
- **THEN** the system MUST update the link and return canonical camelCase link fields

#### Scenario: Invalid ID format on update
- **WHEN** `PUT /api/links/:id` is called with non-numeric ID
- **THEN** the system MUST return `400` with `{ "error": "Invalid ID" }`

#### Scenario: Empty URL on update
- **WHEN** `PUT /api/links/:id` includes `url` as empty string
- **THEN** the system MUST return `400` with `{ "error": "url cannot be empty" }`

#### Scenario: Link not found on update
- **WHEN** `PUT /api/links/:id` targets a non-existent ID
- **THEN** the system MUST return `404` with `{ "error": "Link not found" }`

### Requirement: Delete link endpoint
The system MUST provide `DELETE /api/links/:id` to remove link data and invalidate cache.

#### Scenario: Delete link success
- **WHEN** `DELETE /api/links/:id` is called with an existing ID
- **THEN** the system MUST delete the link and return `{ "success": true }`

#### Scenario: Delete link not found
- **WHEN** `DELETE /api/links/:id` targets a non-existent ID
- **THEN** the system MUST return `404` with `{ "error": "Link not found" }`

### Requirement: Link stats endpoint
The system MUST provide `GET /api/links/:id/stats` for per-link analytics.

#### Scenario: Get stats success
- **WHEN** `GET /api/links/:id/stats` is called with an existing ID
- **THEN** the system MUST return `{ byDay, byReferrer, byCountry }`

### Requirement: OG image upload endpoint
The system MUST provide `POST /api/upload` for OG image uploads.

#### Scenario: Upload success
- **WHEN** `POST /api/upload` is called with multipart `image` of type jpeg/png/gif/webp and size <= 1MB
- **THEN** the system MUST upload to R2 and return `{ "url": "<public-url>" }`

#### Scenario: Upload includes linkId prefix
- **WHEN** multipart form includes `linkId`
- **THEN** uploaded object key MUST use `<linkId>/` prefix

#### Scenario: Upload without image field
- **WHEN** `POST /api/upload` is called without `image`
- **THEN** the system MUST return `400` with `{ "error": "image field is required" }`

#### Scenario: Upload unsupported type
- **WHEN** file type is not jpeg/png/gif/webp
- **THEN** the system MUST return `400` with `{ "error": "Unsupported image type" }`

#### Scenario: Upload too large
- **WHEN** file size exceeds 1MB
- **THEN** the system MUST return `400` with an image-too-large error

### Requirement: Destination OG preview endpoint
The system MUST provide `POST /api/preview/fetch-og` to fetch destination metadata.

#### Scenario: Preview success
- **WHEN** `POST /api/preview/fetch-og` is called with valid http(s) `url`
- **THEN** the system MUST return `{ title, description, image, domain }`

#### Scenario: Preview invalid URL
- **WHEN** preview request has missing or invalid `url`
- **THEN** the system MUST return `400` with URL validation error

#### Scenario: Preview fetch failure fallback
- **WHEN** remote fetch fails, times out, or returns non-OK
- **THEN** the system MUST return fallback payload with `domain` and null `title/description/image`

### Requirement: KV synchronization for link cache
The system MUST synchronize KV cache on create, update, and delete.

#### Scenario: Create or update writes cache
- **WHEN** a link is created or updated
- **THEN** the system MUST write KV value `{ url, ogTitle, ogDesc, ogImage, ogEnabled }` with TTL 24h

#### Scenario: Delete invalidates cache
- **WHEN** a link is deleted
- **THEN** the system MUST remove the KV key

### Requirement: Admin API contract is OpenSpec-normalized
The admin-api specification MUST use a normalized OpenSpec structure and accurately describe implemented endpoint behavior.

#### Scenario: Spec consumers rely on this contract
- **WHEN** agents or developers implement admin API features
- **THEN** they MUST be able to follow this spec as the authoritative contract for current behavior

