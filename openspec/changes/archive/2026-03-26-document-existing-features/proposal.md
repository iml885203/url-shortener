## Why

The initial specs only documented redirect, admin-api, and encoding. Several existing features (QR code generation, per-link stats, overview dashboard, and OG toggle) are missing spec coverage. Without specs, future changes to these features have no acceptance criteria to validate against.

## What Changes

- Add spec files for four undocumented existing capabilities
- No code changes — this is a documentation-only change

## Capabilities

### New Capabilities
- `qr-code`: QR code generation for short and long URLs, served as PNG via `/api/links/:id/qr?type=short|long`
- `link-stats`: Per-link click analytics (by day, referrer, country) via `/api/links/:id/stats`
- `overview-dashboard`: Aggregate stats for the home dashboard (today/week clicks, total links, top links, clicks-by-day chart) via `/api/stats/overview`
- `og-toggle`: Per-link OG meta enable/disable toggle (`ogEnabled` field), with legacy fallback for links created before the field existed

### Modified Capabilities
<!-- None — no requirement changes to existing specs -->

## Impact

- `openspec/specs/` — four new spec files created
- No code changes
