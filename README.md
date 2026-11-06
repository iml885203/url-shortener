# URL Shortener

> A free, serverless URL shortener built on Cloudflare. Zero infrastructure cost.

![Dashboard](docs/screenshot.png)

```
your-domain.com/Uk        ← short (Sqids)
your-domain.com/loοgan    ← same link, looks identical to "loogan" (Logan encoding)
your-domain.com/github    ← custom slug
```

## Features

- **Dual URLs** — every link gets a short URL (`/Uk`) and a human-readable "loooogan" URL (`/loοgan`) — same link, two paths
- **Custom slugs** — set a memorable path like `/github` or `/blog`
- **OG meta** — custom title, description, and image per link; social preview for LINE, Discord, Telegram, etc.
- **Click analytics** — by day, referrer, and country
- **Zero cost** — runs entirely on Cloudflare free tier (Workers + D1 + KV + R2 + Pages)

## Usage

1. Open `https://your-domain.com/dashboard/` and sign in with your API token, or with SSO when the administrator has enabled it.
2. Choose System, Light or Dark appearance; the choice stays in this browser.
3. Create a link — paste any URL, optionally set a custom slug
4. Set a custom **OG title / description / image** so the link shows a rich preview when shared on LINE, Discord, Telegram, etc.
5. View click stats per link — by day, referrer, and country

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
npm ci && npm --prefix packages/dashboard/frontend ci

# Copy and fill in wrangler config
cp packages/redirect/wrangler.toml.example packages/redirect/wrangler.toml
cp packages/dashboard/wrangler.toml.example packages/dashboard/wrangler.toml
# Edit both files with your IDs and domain

# Run DB migrations
npx wrangler d1 execute url-shortener --config=packages/dashboard/wrangler.toml --file=migrations/0001_init.sql --remote
npx wrangler d1 execute url-shortener --config=packages/dashboard/wrangler.toml --file=migrations/0002_add_og_enabled.sql --remote
npx wrangler d1 execute url-shortener --config=packages/dashboard/wrangler.toml --file=migrations/0003_add_custom_slug.sql --remote
npx wrangler d1 execute url-shortener --config=packages/dashboard/wrangler.toml --file=migrations/0004_auth_sessions.sql --remote

# Build and deploy
cd packages/dashboard/frontend && npm run build && cd ../../..
cd packages/redirect && npx wrangler deploy && cd ..
cd packages/dashboard && npx wrangler deploy
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for full system design details.

## Optional OpenID Connect sign-in

API token sign-in and both API headers remain supported. The token is stored in
this browser's localStorage, as before. SSO is optional and uses an independent
HttpOnly session cookie; it does not put provider tokens in browser storage.

To enable OIDC (including providers such as Pocket ID), register a confidential
client with PKCE S256 and the exact callback
`https://your-domain.com/auth/callback`. If the provider supports subject-wide
back-channel logout, register
`https://your-domain.com/auth/backchannel-logout` as its notification receiver.
Both `/auth/*` routes and `/api/*` must reach the dashboard Worker; the example
configuration and deployment workflow include them. Public short links and OG
images remain independent of sign-in. Share/QR generation APIs remain private.

Apply migration `0004_auth_sessions.sql` to the dashboard D1 binding before
enabling SSO. It adds separate auth tables without changing links or clicks.
Set these runtime values through Worker secrets or another private deployment
configuration, never in frontend code or committed wrangler configuration:

| Setting | Meaning |
| --- | --- |
| `OIDC_ISSUER` | Exact HTTPS issuer URL matching discovery |
| `OIDC_CLIENT_ID` | Registered confidential client ID |
| `OIDC_CLIENT_SECRET` | Client secret |
| `SESSION_SECRET` | Independently generated random secret of at least 32 characters |
| `OIDC_REQUIRED_GROUP` | Optional group name required in verified ID-token groups |
| `OIDC_PROVIDER_NAME` | Optional display label; defaults to SSO |

Keep all OIDC settings absent for token-only mode. Partial configuration fails
closed. `SHORT_BASE_URL` must be the application's HTTPS origin. Use the token
mode for ordinary HTTP local development; `.dev.vars` files are ignored.

Users explicitly choose SSO; opening a private view never silently starts an
identity-provider redirect. The local session lasts 180 days, survives Worker
restarts, and reads D1's primary for current revocation state. Local logout
revokes the current session and clears local credentials without logging out of
the provider or invalidating independent API keys. Cookie-authenticated writes
and logout require the same Origin. Ordinary provider logout leaves local
sessions intact. Valid signed subject-wide notifications revoke that user's
sessions and reject older pending callbacks; identical notification replays are
idempotent. Providers that do not deliver these notifications cannot revoke
existing local sessions immediately. Providers using session-specific `sid`
notifications are not supported by this receiver. Storage failure rejects
private access rather than accepting a stale cached session.

Changing the issuer/client or recovering from a compromised session secret
requires rotating `SESSION_SECRET` to invalidate existing sessions. Keep D1 auth
state durable; restoring an old auth database can resurrect revoked sessions.
For rollback, first remove the OIDC runtime settings together to return to token
mode, then deploy the preceding Worker version. Leave additive auth tables and
existing link data intact. Before re-enabling SSO after an auth-state restore,
clear restored auth sessions and rotate the session secret.

## UI snapshot maintenance

The dashboard owns its copied neutral UI files and builds without access to an
upstream repository. `ui-source.json` records content snapshots and file hashes;
it deliberately contains no private source location or history. Verify it with
`npm run check:ui-source`. Put application-specific changes outside
`src/ui/foundation`; review changes and update files and receipt together only
after verification. A snapshot hash checks content, not provenance authenticity.
The current stylesheet and Tailwind mapping support the app's system/light/dark
preference. Components and task layouts remain local to this application.

## Development

Use Node.js 22 or newer. Install root and frontend dependencies with `npm ci`.

```bash
npm test
npm run check:types
npm run check:ui-source
npm --prefix packages/dashboard/frontend run build
# Once per machine, install the browser used by the UI suite:
npm --prefix packages/dashboard/frontend exec -- playwright install chromium
npm run test:browser
```

Protocol tests use a synthetic OIDC provider with signed tokens and a local D1
Worker. Browser tests use synthetic links and credentials. Verify a real provider
login, local logout and administrative revocation separately for each deployment;
the synthetic checks do not exercise a real passkey.


```bash
npm test                                          # unit tests
cd packages/redirect && npx wrangler dev          # redirect worker
cd packages/dashboard/frontend && npm run dev     # frontend dev server
```

## License

MIT © 2025 Logan
