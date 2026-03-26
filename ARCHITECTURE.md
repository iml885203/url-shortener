# Architecture

## Overview

your-domain.com is a personal URL shortener deployed as a **Cloudflare Workers monorepo**. It uses two Workers, one D1 database, one KV namespace, and one R2 bucket — all on Cloudflare's free tier.

Every link gets two URLs simultaneously:
- **Short** (Sqids-encoded): `your-domain.com/Uk`
- **Long** (Logan-encoded): `your-domain.com/loοgan`

Both decode to the same integer ID and point to the same database record.

---

## System Diagram

```
                         ┌─────────────────────────┐
                         │     Cloudflare DNS       │
                         │      your-domain.com          │
                         └──────────┬──────────────┘
                                    │
          ┌─────────────────────────┼────────────────────────────┐
          │                         │                            │
┌─────────▼─────────┐     ┌────────▼──────────┐     ┌──────────▼────────┐
│  Redirect Worker  │     │  Dashboard Worker  │     │   Pages Assets    │
│  your-domain.com/*     │     │  /api/* /dashboard │     │   (bundled with   │
│  (packages/       │     │  (packages/        │     │    dashboard       │
│   redirect)       │     │   dashboard)       │     │    worker)        │
└──┬────────────────┘     └──┬─────────────────┘     └───────────────────┘
   │                         │
   │  ┌─────────┐            │  ┌────────────┐   ┌─────────────┐
   └──► KV Cache│         ───┤  │ D1 Database│   │  R2 Bucket  │
      └─────────┘            ├──► (links +   │   │  (OG images)│
                             │  │  clicks)   │   └─────────────┘
                             │  └────────────┘
                             └──► KV Cache
                                └──────────┘
```

---

## Components

### Cloudflare Worker — Redirect (`packages/redirect`)

Routes: `your-domain.com/*`

Handles all public URL resolution:

**Redirect resolution order:**

1. **Logan pattern** — if slug matches `LOGAN_PATTERN` (`/^l[oοоᴏ]{2,}gan$/u`), decode via Logan codec → link ID.
2. **Custom slug** — look up `custom:{slug}` key in KV; hit → use stored link ID.
3. **Sqids decode** — treat slug as Sqids-encoded ID.
4. **404** — if no match found.

**Then:**

5. **Cache lookup** — checks KV store for `{id}` key; hit → skip D1.
6. **D1 lookup** — on cache miss, queries `links` table by ID.
7. **Crawler detection** — if User-Agent matches known bots (LINE, Discord, Telegram, Slack, Facebook, Twitter, etc.), returns an HTML page with `<meta og:*>` tags and a `<meta http-equiv="refresh">` redirect.
8. **User redirect** — returns `302 Found` to target URL.
9. **Click logging** — uses `waitUntil()` to asynchronously insert into `clicks` table (non-blocking).

### Cloudflare Worker — Dashboard (`packages/dashboard`)

Routes: `your-domain.com/api/*` and `your-domain.com/dashboard/*`

Serves the admin API (Hono framework) and the compiled Vue 3 SPA as static assets.

**Admin API endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/links` | List all links with click counts |
| `POST` | `/api/links` | Create a new link |
| `PUT` | `/api/links/:id` | Update URL or OG meta |
| `DELETE` | `/api/links/:id` | Delete a link |
| `GET` | `/api/links/:id/stats` | Click stats (by day / referrer / country) |
| `POST` | `/api/upload` | Upload OG image to R2 |

Authentication: `API_KEY` secret (set via `wrangler secret put API_KEY`). Accepts either `Authorization: Bearer <key>` or `X-API-Key: <key>` header.

### D1 Database

Cloudflare's serverless SQLite. Two tables:

- `links` — stores each link's URL and OG metadata.
- `clicks` — append-only log of every redirect event.

### KV Store

Used as a read-through cache for the Redirect Worker with two key namespaces:

**Link data cache:**
- **Key**: `{id}` (integer link ID stringified)
- **Value**: JSON `{ url, ogTitle, ogDesc, ogImage, ogEnabled }`
- **Written/invalidated** by the Dashboard Worker on create, update, or delete.

**Custom slug pointers:**
- **Key**: `custom:{slug}` (e.g. `custom:github`)
- **Value**: JSON `{ id }` — pointer to the link ID
- **Written** by Dashboard Worker when a custom slug is set; deleted when the slug is cleared or the link is deleted.

The cache eliminates D1 reads on hot links, keeping latency low.

### R2 Bucket

Stores OG preview images uploaded via the Dashboard. Images are served from a public R2 custom domain (`r2.your-domain.com`).

### Dashboard SPA (Vue 3)

A Vite-built single-page app served as static assets from the Dashboard Worker. Features:

- Link list with short + long URL display and copy buttons
- Create / edit links (URL + OG meta)
- OG image upload with preview
- Click statistics (daily trend, referrer breakdown, country breakdown)
- API key login (stored in `localStorage`)

Stack: Vue 3 + Vue Router + Vite + Tailwind CSS

---

## Database Schema

```sql
-- Link table (from migrations/0001_init.sql + 0002_add_og_enabled.sql + 0003_add_custom_slug.sql)
CREATE TABLE IF NOT EXISTS links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  url         TEXT NOT NULL,
  og_title    TEXT,
  og_desc     TEXT,
  og_image    TEXT,
  og_enabled  INTEGER NOT NULL DEFAULT 0,
  custom_slug TEXT UNIQUE,            -- optional branded slug (e.g. "github")
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_links_custom_slug ON links(custom_slug);

-- Click log (append-only)
CREATE TABLE IF NOT EXISTS clicks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id     INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at  TEXT NOT NULL DEFAULT (datetime('now')),
  referrer    TEXT,
  country     TEXT,
  user_agent  TEXT,
  ip_hash     TEXT        -- SHA-256 of client IP; never plaintext
);

CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_clicks_link_time ON clicks(link_id, clicked_at);
```

Short and long slugs are computed from the auto-increment `id` at runtime. The optional `custom_slug` column enables user-defined branded paths like `/github` or `/blog`.

---

## Dual Encoding

### Sqids (Short URLs)

Uses the [Sqids](https://sqids.org) library with a custom alphabet that excludes `l`, `g`, `a`, `n` to prevent collisions with the Logan pattern:

```
ALPHABET = 'bcdefhijkmopqrstuvwxyzBCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
minLength = 2
```

```
encode(1)   → "Uk"
encode(100) → "yB"
encode(999) → "J8n"
```

Decoding is deterministic and requires no database lookup for the slug itself.

### Logan (Long URLs)

A custom codec that maps integer IDs to visually indistinguishable "loooogan"-style strings using four Unicode variants of the letter "o":

| Digit | Character | Unicode |
|---|---|---|
| 0 | `o` | U+006F Latin small letter o |
| 1 | `ο` | U+03BF Greek small letter omicron |
| 2 | `о` | U+043E Cyrillic small letter o |
| 3 | `ᴏ` | U+1D0F Latin letter small capital O |

Algorithm:
1. Convert ID to base-4 string
2. Pad to minimum 2 digits
3. Map each digit → Unicode o character
4. Wrap: `l` + encoded + `gan`

```
ID 0   → base4 "00" → "oo"     → "loogan"
ID 1   → base4 "01" → "oο"     → "loοgan"
ID 5   → base4 "11" → "οο"     → "lοοgan"
ID 15  → base4 "33" → "ᴏᴏ"     → "lᴏᴏgan"
ID 255 → base4 "3333" → "ᴏᴏᴏᴏ" → "lᴏᴏᴏᴏgan"
```

The Redirect Worker detects Logan slugs via regex: `/^l[oοоᴏ]{2,}gan$/u`

---

## Crawler Detection & OG Response

The Redirect Worker uses a two-layer detection strategy (see `packages/shared/src/utils/crawler.ts`):

1. **Explicit social preview keywords** — fast regex match against known preview bots:
   - `facebookexternalhit`, `facebot`, `twitterbot`, `linkedinbot`
   - `discordbot`, `slackbot`, `Slack-ImgProxy`, `SkypeUriPreview`
   - `WhatsApp`, `TelegramBot`, `LINE`

2. **`isbot` library** — maintained generic bot detection as a fallback baseline.

When a crawler is detected and the link has `og_enabled = 1`, the Worker returns an HTML page instead of a 302:

```html
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="{og_title}" />
  <meta property="og:description" content="{og_desc}" />
  <meta property="og:image" content="{og_image}" />
  <meta property="og:url" content="{short_url}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0;url={target_url}" />
</head>
<body></body>
</html>
```

Human visitors always get a plain `302 Found`.

---

## Click Tracking & Privacy

Click events are recorded asynchronously using Cloudflare Workers' `waitUntil()` — the redirect fires immediately and the D1 write happens in the background without adding latency.

Each click record contains:
- `link_id` — foreign key to `links`
- `clicked_at` — UTC timestamp
- `referrer` — from `Referer` header (may be null)
- `country` — from `CF-IPCountry` header (Cloudflare geo)
- `user_agent` — raw UA string
- `ip_hash` — **SHA-256 hash of client IP** (never stored in plaintext)

---

## Cloudflare Free Tier Limits

| Resource | Free Limit | Notes |
|---|---|---|
| Workers requests | 100,000/day | 1 per redirect |
| KV reads | 100,000/day | 1 per redirect (cache hit skips D1) |
| D1 reads | 5,000,000/day | Fallback on KV miss |
| D1 writes | 100,000/day | 1 per click log |
| D1 storage | 500 MB | ~200 bytes/click → ~2.5M records |
| R2 storage | 10 GB | OG images only |
| R2 reads | 10,000,000/month | Only on crawler requests |
| R2 writes | 1,000,000/month | On image upload |
| Pages deployments | Unlimited | SPA frontend |
