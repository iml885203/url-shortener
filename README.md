# go.dotw.me — Personal URL Shortener

> A serverless, zero-cost URL shortener with dual encoding, OG meta customization, and click analytics — running entirely on Cloudflare's free tier.

<!-- Screenshot / Demo placeholder -->
<!-- ![Demo](docs/screenshot.png) -->

## ✨ Features

- **Dual URL encoding** — short URLs (Sqids) and human-friendly long URLs (Logan encoding)
- **OG meta customization** — set custom title, description, and image per link; toggle on/off
- **OG image upload** — upload preview images directly to R2 storage
- **Click analytics** — track clicks by day, referrer, and country
- **Crawler detection** — serve OG HTML to LINE, Discord, Telegram, Slack, Facebook, Twitter, etc.
- **IP privacy** — IPs are SHA-256 hashed before storage; never stored in plaintext
- **Zero cost** — runs entirely on Cloudflare's free tier (Workers + D1 + KV + R2 + Pages)

---

## 🆓 Why Free?

This project is designed to fit entirely within Cloudflare's generous free plan. Here's what each click consumes:

| Resource | Free Limit | Usage per click |
|---|---|---|
| Workers requests | 100,000/day | 1 |
| KV reads | 100,000/day | 1 |
| D1 writes | 100,000/day | 1 (click log) |
| D1 storage | 500 MB | ~200 bytes/click |
| R2 storage | 10 GB | — |
| R2 reads | 10,000,000/month | 1 (OG image, crawlers only) |
| Pages deployments | Unlimited | — |

At 100,000 clicks/day you hit the Workers and KV limits — well beyond personal use. D1 can hold ~2.5 million click records before hitting the storage cap.

---

## 🏗️ Architecture

```
                         ┌─────────────────────────┐
                         │     Cloudflare DNS       │
                         │      go.dotw.me          │
                         └──────────┬──────────────┘
                                    │
              ┌─────────────────────┼──────────────────────┐
              │                     │                      │
   ┌──────────▼──────────┐  ┌───────▼────────┐   ┌────────▼────────┐
   │  Redirect Worker    │  │ Dashboard API  │   │  Dashboard SPA  │
   │  go.dotw.me/*       │  │ /api/* Worker  │   │  /dashboard/*   │
   │  (packages/         │  │ (packages/     │   │  (Vue 3 + Vite) │
   │   redirect)         │  │  dashboard)    │   │                 │
   └──┬──────────────────┘  └──┬─────────────┘   └─────────────────┘
      │                        │
      │  ┌────────┐            │  ┌────────┐  ┌────────────┐
      └──► KV     │         ───┤  │   D1   │  │ R2 Bucket  │
         │ Cache  │            ├──► Database│  │ OG Images  │
         └────────┘            │  └────────┘  └────────────┘
                               └──► KV
                                  └────────┘
```

**Two Cloudflare Workers, one D1 database:**

- **Redirect Worker** (`packages/redirect`) — handles `go.dotw.me/*`. Decodes slugs, checks KV cache, queries D1, detects crawlers, issues 302 redirects, logs clicks asynchronously.
- **Dashboard Worker** (`packages/dashboard`) — handles `go.dotw.me/api/*` (CRUD API) and serves the SPA at `go.dotw.me/dashboard/*`. Manages links, uploads, and analytics.
- **Shared package** (`packages/shared`) — codec logic (Sqids + Logan), crawler detection, KV helpers, and types — imported by both Workers.

---

## 🔗 Dual URL Encoding

Every link gets **two URLs** pointing to the same database record — no extra storage needed.

### Short URL (Sqids)

Sqids encodes the integer ID into a URL-safe string using a custom alphabet (excludes `l`, `g`, `a`, `n` to avoid colliding with the Logan format):

```
ID 1   → "Uk"
ID 100 → "yB"
ID 999 → "J8n"
```

### Long URL (Logan encoding)

The Logan codec maps each base-4 digit of the ID to one of four visually identical Unicode "o" characters, wrapped in `l...gan`:

| Character | Unicode | Base-4 value |
|---|---|---|
| `o` | U+006F | 0 |
| `ο` | U+03BF (Greek omicron) | 1 |
| `о` | U+043E (Cyrillic o) | 2 |
| `ᴏ` | U+1D0F (Small capital O) | 3 |

```
ID 0   → "loogan"      (looks like "loogan")
ID 1   → "loοgan"      (looks like "loogan")
ID 5   → "lοοgan"      (looks like "loogan")
ID 255 → "lᴏᴏᴏᴏgan"   (looks like "looooogan")
```

Both URLs resolve to the same link — the Redirect Worker detects the pattern `/^l[oοоᴏ]{2,}gan$/` and routes accordingly.

---

## 🚀 Self-Hosting

### Prerequisites

- Node.js 18+
- Wrangler CLI: `npm install -g wrangler`
- A Cloudflare account (free tier is sufficient)

### 1. Clone

```bash
git clone https://github.com/your-username/url-shortener.git
cd url-shortener
```

### 2. Install

```bash
npm install
cd packages/dashboard/frontend && npm install && cd ../../..
```

### 3. Create Cloudflare Resources

```bash
# Authenticate with Cloudflare
wrangler login

# Create a D1 database
wrangler d1 create url-shortener

# Create a KV namespace
wrangler kv namespace create url-shortener-cache

# Create an R2 bucket
wrangler r2 bucket create url-shortener-images

# Run DB migrations
wrangler d1 execute url-shortener --file=migrations/0001_init.sql
wrangler d1 execute url-shortener --file=migrations/0002_add_og_enabled.sql
```

### 4. Configure wrangler.toml

Update `packages/redirect/wrangler.toml` and `packages/dashboard/wrangler.toml` with the IDs from step 3.

**`packages/redirect/wrangler.toml`** — key settings:

| Key | Description |
|---|---|
| `routes[].pattern` | Your domain pattern, e.g. `go.example.com/*` |
| `routes[].zone_name` | Your Cloudflare zone, e.g. `example.com` |
| `d1_databases[].database_id` | D1 database ID from `wrangler d1 create` |
| `kv_namespaces[].id` | KV namespace ID from `wrangler kv namespace create` |
| `vars.SHORT_BASE_URL` | Your public base URL, e.g. `https://go.example.com` |
| `vars.DEFAULT_OG_IMAGE` | Default OG image URL |

**`packages/dashboard/wrangler.toml`** — additional settings:

| Key | Description |
|---|---|
| `r2_buckets[].bucket_name` | R2 bucket name |
| `vars.R2_BASE_URL` | Public URL for R2 images |

### 5. Set API Key Secret

```bash
# Set secret for dashboard worker (used to protect the API)
cd packages/dashboard
wrangler secret put API_KEY
```

### 6. Deploy

```bash
# Build the frontend first
cd packages/dashboard/frontend
npm run build
cd ../../..

# Deploy redirect worker
cd packages/redirect
wrangler deploy
cd ..

# Deploy dashboard worker (serves API + SPA assets)
cd packages/dashboard
wrangler deploy
```

---

## 🧪 Development

```bash
# Run unit tests
npm test

# Watch mode
npm run test:watch

# Local dev (redirect worker)
cd packages/redirect
wrangler dev

# Local dev (dashboard worker — requires frontend build first)
cd packages/dashboard/frontend && npm run build && cd ..
wrangler dev
```

---

## 📁 Project Structure

```
url-shortener/
├── package.json              # Monorepo root (npm workspaces)
├── tsconfig.json
├── vitest.config.ts
├── migrations/
│   ├── 0001_init.sql         # links + clicks tables
│   └── 0002_add_og_enabled.sql
├── tests/                    # Codec unit tests
├── packages/
│   ├── shared/               # Shared library
│   │   └── src/
│   │       ├── codec/
│   │       │   ├── sqids.ts  # Short URL encoding (Sqids)
│   │       │   └── logan.ts  # Long URL encoding (Logan)
│   │       ├── services/
│   │       │   └── kv.ts     # KV cache helpers
│   │       ├── utils/
│   │       │   ├── crawler.ts # Crawler/bot detection
│   │       │   └── hash.ts   # IP hashing
│   │       └── types.ts
│   │
│   ├── redirect/             # Redirect Worker
│   │   ├── wrangler.toml
│   │   └── src/
│   │       ├── index.ts      # Worker entry point
│   │       └── redirect.ts   # Redirect + OG response logic + D1 queries
│   │
│   └── dashboard/            # Dashboard Worker + SPA
│       ├── wrangler.toml
│       ├── src/
│       │   ├── index.ts      # Worker entry point (Hono)
│       │   ├── handlers/
│       │   │   └── api.ts    # Admin CRUD + upload API
│       │   └── services/
│       │       ├── db.ts     # D1 operations
│       │       ├── r2.ts     # R2 image operations
│       │       └── qr.ts     # QR code generation
│       └── frontend/         # Vue 3 + Vite SPA
│           └── src/
│               ├── views/    # Pages (LinkList, CreateLink, EditLink, Stats…)
│               ├── api/      # API client
│               └── components/
```

---

## 📄 License

MIT © 2025 Logan
