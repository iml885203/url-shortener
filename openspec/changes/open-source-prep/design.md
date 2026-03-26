## Context

Documentation-only change to prepare `url-shortener` for public open-source release on GitHub.

## Goals / Non-Goals

**Goals:**
- Full English rewrite of README and ARCHITECTURE docs
- MIT license added
- Clear value proposition for new visitors
- Accurate Cloudflare free-tier limits table (Workers/D1/KV/R2/Pages)
- Self-hosting quickstart accurate to current monorepo structure

**Non-Goals:**
- No code changes
- No GitHub Actions / CI setup
- No public repo creation (Logan does this manually)

## README Structure

```
# go.dotw.me — Personal URL Shortener
## ✨ Features
## 🆓 Why Free?  (Cloudflare free-tier table)
## 🏗️ Architecture
## 🔗 Dual URL Encoding
## 🚀 Self-Hosting
### Prerequisites
### 1. Clone
### 2. Create Cloudflare Resources
### 3. Configure wrangler.toml
### 4. Set API Key secret
### 5. Deploy
## 🧪 Development
## 📁 Project Structure
## 📄 License
```

## ARCHITECTURE.md Structure

```
# Architecture
## Overview
## System Diagram
## Components
### Worker (Hono)
### D1 Database
### KV Store
### R2 Bucket
### Dashboard SPA (Vue 3)
## Database Schema
## Dual Encoding
### Sqids (Short URLs)
### Logan (Long URLs)
## Crawler Detection & OG
## Click Tracking & Privacy
## Cloudflare Free Limits
```

## Decisions

- MIT license (permissive, standard for personal open-source projects)
- Use real domain `go.dotw.me` (from TOOLS.md) in docs
- Cloudflare free limits from official docs (verified numbers)
- Keep text-art system diagram for README compat with all Markdown renderers
- Monorepo structure docs reflect actual `packages/` layout (not old `src/` layout)

## Risks

- [Low] ARCHITECTURE.md still mentions old `src/` single-package layout → Mitigation: use actual directory tree from repo.
- [Low] README quickstart steps must reference correct wrangler config keys → sub-agent should read `wrangler.toml`.

## Open Questions

- None.
