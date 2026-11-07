# Deployment

Use Node.js 22 or newer, a Cloudflare account with Workers, D1, KV and R2 enabled, and a domain on Cloudflare.

## Prepare Cloudflare

Clone this repository (or your fork) and install dependencies:

```bash
git clone https://github.com/iml885203/url-shortener.git
cd url-shortener
npm ci
npm --prefix packages/dashboard/frontend ci
npx wrangler login
```

Create the resources once. Both Workers use the same D1 database and KV namespace:

```bash
npx wrangler d1 create url-shortener
npx wrangler kv namespace create url-shortener-cache
npx wrangler r2 bucket create url-shortener-images
```

Connect a public custom domain to the R2 bucket for preview images. Copy the example configurations:

```bash
cp packages/redirect/wrangler.toml.example packages/redirect/wrangler.toml
cp packages/dashboard/wrangler.toml.example packages/dashboard/wrangler.toml
```

Edit both files with the IDs printed above, your domain and preview-image URLs. The local configuration files are ignored by Git. Keep `/dashboard/*`, `/api/*` and `/auth/*` on the dashboard Worker; all other paths go to the redirect Worker.

Apply every migration in filename order, then set a strong API token on both Workers. Enter the same token at each secret prompt:

```bash
for migration in migrations/*.sql; do
  npx wrangler d1 execute url-shortener --config=packages/dashboard/wrangler.toml --file="$migration" --remote
done

npx wrangler secret put API_KEY --config=packages/redirect/wrangler.toml
npx wrangler secret put API_KEY --config=packages/dashboard/wrangler.toml
```

## Deploy manually

From the repository root:

```bash
npm --prefix packages/dashboard/frontend run build
npx wrangler deploy --config=packages/redirect/wrangler.toml
npx wrangler deploy --config=packages/dashboard/wrangler.toml
```

Open `https://your-domain.com/dashboard/` and sign in with the API token. Create a test link and check its redirect.

## Deploy with GitHub Actions

Complete the setup above in your fork, then add these GitHub Actions secrets:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers, D1, KV and R2 permissions |
| `SHORT_BASE_URL` | Your origin, such as `https://your-domain.com` |
| `ZONE_NAME` | Your Cloudflare zone, such as `your-domain.com` |
| `D1_DATABASE_ID` | Database ID from the setup command |
| `KV_NAMESPACE_ID` | Namespace ID from the setup command |
| `R2_BASE_URL` | Public image origin, such as `https://r2.your-domain.com` |
| `DEFAULT_OG_IMAGE` | Default preview image, such as `https://your-domain.com/dashboard/og-default.svg` |

Push to `main` to verify and deploy affected Workers. The first deployment needs all migrations applied; subsequent dashboard deployments also apply the additive authentication migration. Worker secrets such as `API_KEY` are configured separately from GitHub Actions secrets.

SSO is optional. See [OpenID Connect setup](authentication.md) to enable it. Keep credentials in Worker secrets or ignored local files.
