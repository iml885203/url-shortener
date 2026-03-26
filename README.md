# URL Shortener

> A free, serverless URL shortener built on Cloudflare. Zero infrastructure cost.

<!-- Screenshot placeholder -->
<!-- ![Dashboard](docs/screenshot.png) -->

## Features

- **Dual URLs** — every link gets a short URL (`/Uk`) and a human-readable "loooogan" URL (`/loοgan`) — same link, two paths
- **Custom slugs** — set a memorable path like `/github` or `/blog`
- **OG meta** — custom title, description, and image per link; social preview for LINE, Discord, Telegram, etc.
- **Click analytics** — by day, referrer, and country
- **Zero cost** — runs entirely on Cloudflare free tier (Workers + D1 + KV + R2 + Pages)

## Usage

1. Open `https://your-domain.com/dashboard` and enter your API key
2. Create a link — paste any URL, optionally set a custom slug
3. Set a custom **OG title / description / image** so the link shows a rich preview when shared on LINE, Discord, Telegram, etc.
4. View click stats per link — by day, referrer, and country

## Deploy

### Option A: GitHub Actions (recommended)

Fork this repo, then set the following GitHub Secrets in your fork:

| Secret | Description |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers + D1 + KV + R2 permissions |
| `SHORT_BASE_URL` | e.g. `https://your-domain.com` |
| `ZONE_NAME` | Your Cloudflare zone, e.g. `your-domain.com` |
| `D1_DATABASE_ID` | From `wrangler d1 create url-shortener` |
| `KV_NAMESPACE_ID` | From `wrangler kv namespace create url-shortener-cache` |
| `R2_BASE_URL` | e.g. `https://r2.your-domain.com` |
| `DEFAULT_OG_IMAGE` | e.g. `https://your-domain.com/dashboard/og-default.svg` |

Push to `main` — CI deploys automatically.

### Option B: Manual

```bash
git clone https://github.com/iml885203/url-shortener.git
cd url-shortener
npm install && cd packages/dashboard/frontend && npm install && cd ../../..

# Copy and fill in wrangler config
cp packages/redirect/wrangler.toml.example packages/redirect/wrangler.toml
cp packages/dashboard/wrangler.toml.example packages/dashboard/wrangler.toml
# Edit both files with your IDs and domain

# Run DB migrations
npx wrangler d1 execute url-shortener --file=migrations/0001_init.sql --remote
npx wrangler d1 execute url-shortener --file=migrations/0002_add_og_enabled.sql --remote
npx wrangler d1 execute url-shortener --file=migrations/0003_add_custom_slug.sql --remote

# Build and deploy
cd packages/dashboard/frontend && npm run build && cd ../../..
cd packages/redirect && npx wrangler deploy && cd ..
cd packages/dashboard && npx wrangler deploy
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for full system design details.

## Development

```bash
npm test                                          # unit tests
cd packages/redirect && npx wrangler dev          # redirect worker
cd packages/dashboard/frontend && npm run dev     # frontend dev server
```

## License

MIT © 2025 Logan
