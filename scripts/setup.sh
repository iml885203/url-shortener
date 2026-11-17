#!/usr/bin/env bash
# One-time Cloudflare resource setup for url-shortener
set -euo pipefail

echo "=== Creating D1 database ==="
wrangler d1 create url-shortener

echo ""
echo "=== Creating KV namespace ==="
wrangler kv namespace create KV

echo ""
echo "=== Creating R2 bucket ==="
wrangler r2 bucket create url-shortener-images

echo ""
echo "=== Applying D1 migrations ==="
echo "After writing packages/dashboard/wrangler.toml, apply migrations as documented in docs/deployment.md."
# Resource IDs must be configured before any remote migration; do not guess them.

echo ""
echo "Done! Copy the IDs above into wrangler.toml, then:"
echo "  wrangler secret put API_KEY"
echo "  npm run deploy"
