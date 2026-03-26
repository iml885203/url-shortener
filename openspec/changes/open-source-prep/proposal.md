## Why

This project is personal and currently documented in Chinese. The goal is to make it welcoming to open-source contributors and self-hosters: clearly explain its unique value (free, fully serverless on Cloudflare free-tier), describe the dual-URL encoding concept, architecture, Cloudflare free limits, and provide an actionable deployment guide — all in English.

## What Changes

### Documentation
- Rewrite `README.md` in English with:
  - Project value proposition (100% free, zero infra cost, serverless on Cloudflare)
  - Architecture overview (Worker, D1, KV, R2, Pages)
  - Cloudflare free-tier limits table
  - Dual URL encoding concept (Sqids short / Logan long)
  - Self-hosting quickstart (prerequisites, wrangler.toml config, deploy steps)
  - Screenshot placeholder / demo link section
- Rewrite `ARCHITECTURE.md` in English with:
  - System diagram (text-art)
  - Component responsibilities
  - Database schema
  - Encoding algorithm details
  - Click tracking and privacy (IP hashing)

### Project metadata
- Add `LICENSE` file (MIT)
- Update `package.json` `"license"` field to `"MIT"`

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
<!-- None — doc/meta only, no API/runtime changes -->

## Impact

- `README.md`
- `ARCHITECTURE.md`
- `LICENSE`
- `package.json`

## Non-goals
- No code changes
- No GitHub Actions setup
- No public GitHub repo creation (Logan handles that manually)
