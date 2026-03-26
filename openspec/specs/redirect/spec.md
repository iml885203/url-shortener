# Spec: redirect

## Purpose

Define the runtime behavior for `GET /:slug` in the redirect worker, including slug decoding, ID resolution, cache/database lookup, OG preview rendering, click logging, and final HTTP response.

## Requirements

### Requirement: The handler MUST decode route slug before codec detection
The redirect handler MUST read `:slug` from route params and run `decodeURIComponent` before any codec logic.

#### Scenario: Percent-encoded slug is valid
- **WHEN** the incoming path slug is percent-encoded and `decodeURIComponent` succeeds
- **THEN** the system MUST continue using the decoded slug value

#### Scenario: Percent-encoded slug is invalid
- **WHEN** `decodeURIComponent` throws for the incoming slug
- **THEN** the system MUST return `404 Not found`

### Requirement: The handler MUST choose codec by Logan pattern
The handler MUST use Logan decode when slug matches `LOGAN_PATTERN` (`/^l[oοоᴏ]{2,}gan$/u`), otherwise MUST use Sqids decode.

#### Scenario: Slug matches Logan pattern
- **WHEN** the decoded slug matches `LOGAN_PATTERN`
- **THEN** the system MUST call `loganDecodeSlug(slug)` and MUST NOT call Sqids decode for that request

#### Scenario: Slug does not match Logan pattern
- **WHEN** the decoded slug does not match `LOGAN_PATTERN`
- **THEN** the system MUST call `sqidsDecodeSlug(slug)`

#### Scenario: Decode result is invalid
- **WHEN** the selected decode function returns `null`
- **THEN** the system MUST return `404 Not found`

### Requirement: The handler MUST resolve link data via KV-first and D1 fallback
After ID decode, the handler MUST query KV first; on KV miss it MUST query D1 and backfill KV asynchronously.

#### Scenario: KV hit
- **WHEN** `kvGet(KV, id)` returns link data
- **THEN** the system MUST use KV data directly and MUST skip D1 query

#### Scenario: KV miss and D1 hit
- **WHEN** `kvGet(KV, id)` returns `null` and `dbGetLink(DB, id)` returns a row
- **THEN** the system MUST map DB fields to `KVLinkData` and MUST schedule `kvSet(KV, id, linkData)` via `waitUntil`

#### Scenario: KV miss and D1 miss
- **WHEN** both KV and D1 do not contain the decoded ID
- **THEN** the system MUST return `404 Not found`

### Requirement: The handler MUST determine OG response using ogEnabled, query override, and crawler detection
The handler MUST render OG HTML only when OG is enabled and request is forced-OG or crawler.

#### Scenario: OG enabled flag resolution
- **WHEN** link data contains boolean `ogEnabled`
- **THEN** the system MUST use that boolean as OG enable state

#### Scenario: Legacy OG enabled fallback
- **WHEN** `ogEnabled` is absent and at least one of `ogTitle`, `ogDesc`, `ogImage` is non-empty
- **THEN** the system MUST treat OG as enabled

#### Scenario: Query force OG
- **WHEN** query parameter `og` is `1` or `true` (case-insensitive)
- **THEN** the system MUST treat request as force-OG signal

#### Scenario: Crawler detection source
- **WHEN** force-OG is not active
- **THEN** crawler detection MUST be based on `isCrawler(User-Agent)`, which includes explicit preview bot keywords and `isbot` baseline detection

#### Scenario: Return OG HTML
- **WHEN** OG is enabled AND (`og` force is active OR request is crawler)
- **THEN** the system MUST return status `200` HTML with OG tags and MUST include meta refresh to target URL

### Requirement: The handler MUST log click analytics only for non-OG redirect path
Click logging MUST happen only when request takes real redirect path (not OG HTML path).

#### Scenario: OG path exclusion
- **WHEN** request returns OG HTML
- **THEN** the system MUST NOT insert a click record

#### Scenario: Redirect path logging
- **WHEN** request is on non-OG path
- **THEN** the system MUST schedule async click logging via `waitUntil`

#### Scenario: Logged fields and IP hashing
- **WHEN** logging a click on non-OG path
- **THEN** the system MUST include `linkId`, `referrer`, `country`, `userAgent`, and `ipHash`
- **THEN** `ipHash` MUST be SHA-256 hex of `CF-Connecting-IP` or `X-Forwarded-For` when present, otherwise `null`

### Requirement: The non-OG success response MUST be HTTP 302 redirect
For non-OG successful resolution, the handler MUST issue an HTTP redirect to target URL with status 302.

#### Scenario: Redirect response
- **WHEN** ID is resolved and request does not enter OG HTML path
- **THEN** the system MUST respond with `302` and `Location` set to the target URL
