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

## Deploy

```bash
git clone https://github.com/iml885203/url-shortener.git
cd url-shortener
npm install && cd packages/dashboard/frontend && npm install && cd ../../..

# Create Cloudflare resources (D1, KV, R2) and fill in wrangler.toml
cp packages/redirect/wrangler.toml.example packages/redirect/wrangler.toml
cp packages/dashboard/wrangler.toml.example packages/dashboard/wrangler.toml
# Edit both files with your IDs and domain

npx wrangler d1 execute url-shortener --file=migrations/0001_init.sql --remote
npx wrangler d1 execute url-shortener --file=migrations/0002_add_og_enabled.sql --remote
npx wrangler d1 execute url-shortener --file=migrations/0003_add_custom_slug.sql --remote

cd packages/dashboard/frontend && npm run build && cd ../..
npx wrangler deploy  # run in both packages/redirect and packages/dashboard
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full setup guide and system design.

## Configuration

Copy `.example` files and fill in your values:

| Key | Description |
|---|---|
| `SHORT_BASE_URL` | Your public domain, e.g. `https://your-domain.com` |
| `D1 database_id` | From `wrangler d1 create url-shortener` |
| `KV id` | From `wrangler kv namespace create url-shortener-cache` |
| `R2 bucket_name` | From `wrangler r2 bucket create url-shortener-images` |
| `API_KEY` | Set via `wrangler secret put API_KEY` |

## Development

```bash
npm test                    # unit tests
cd packages/redirect && npx wrangler dev
cd packages/dashboard/frontend && npm run dev  # frontend dev server
```

## License

MIT © 2025 Logan
