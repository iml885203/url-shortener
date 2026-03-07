# Crawler UA Rules (Traceable Sources)

Last updated: 2026-03-07

This file is the audit trail for `src/utils/crawler.ts`.

Current implementation:
- Baseline: `isbot` package (maintained bot detector)
- Overlay: explicit social preview keywords (Discord/Slack/Meta/X/etc.) as safety net

## Rule fields

Each rule should track:
- **Keyword(s)**: UA match token(s)
- **Platform**: expected preview crawler source
- **Purpose**: why we classify as crawler
- **Source(s)**: official docs or high-quality references
- **Confidence**: High / Medium / Low
- **Last validated**: date + method (validator, real share, or UA simulation)
- **Current result**: pass / pending / unknown

## High-confidence rules (platform-specific)

| Keyword(s) | Platform | Purpose | Source(s) | Confidence | Last validated | Current result |
|---|---|---|---|---|---|---|
| `facebookexternalhit`, `facebot` | Facebook/Meta | Force OG HTML for link preview fetch | Meta sharing crawler docs (official), industry OG practice | High | 2026-03-07 (UA simulation via `curl -A`) | ✅ pass |
| `twitterbot` | X/Twitter | Card/preview crawler | X cards docs + industry references | High | 2026-03-07 (UA simulation) | ✅ pass |
| `linkedinbot`, `LinkedInBot` | LinkedIn | Post preview crawler | LinkedIn Post Inspector ecosystem references | High | 2026-03-07 (UA simulation) | ✅ pass |
| `discordbot` | Discord | Link preview crawler | Discord preview behavior + community references | High | 2026-03-07 (real share behavior observed) | ✅ pass |
| `slackbot`, `Slack-ImgProxy` | Slack | Unfurl + image proxy requests | Slack unfurl docs (official) | High | 2026-03-07 (UA simulation) | ✅ pass |
| `SkypeUriPreview` | Skype/Teams family | Preview crawler requests | Common enterprise preview UA references | Medium | 2026-03-07 (UA simulation) | ✅ pass |
| `WhatsApp`, `TelegramBot`, `LINE` | Messaging apps | Chat preview crawler requests | Community troubleshooting references | Medium | 2026-03-07 (UA simulation) | ✅ pass |
| `googlebot`, `bingbot`, `DuckDuckBot`, `Applebot`, `ia_archiver` | Search/archive bots | Prevent analytics pollution from bot fetches | Known crawler UA references | Medium | 2026-03-07 (UA simulation) | ✅ pass |

## Heuristic fallback rules (lower confidence)

| Keyword(s) | Purpose | Risk | Mitigation | Confidence | Last validated | Current result |
|---|---|---|---|---|---|---|
| `crawler`, `bot` | Catch unknown preview validators | May classify non-preview bots as crawler | Crawler path does not log click; add explicit platform keyword once identified | Low | 2026-03-07 (manual review) | ⚠️ keep temporary |

## Platform validation checklist (to keep this file accurate)

Run this checklist when preview issues are reported:

1. **Discord**: post short link in chat, verify custom OG card appears.
2. **Facebook**: run Sharing Debugger, verify refreshed OG values.
3. **LinkedIn**: run Post Inspector, verify title/desc/image update.
4. **Slack**: paste link in workspace, verify unfurl card.
5. Capture real UA in logs if mismatch occurs.
6. Add/adjust keyword in `crawler.ts`, update this file’s row + date + result.

## Debug entrypoint

Use `?og=1` to force OG HTML for validation tools:
- `https://go.dotw.me/<slug>?og=1`

## Source links

- Slack unfurling docs (official):
  - https://docs.slack.dev/messaging/unfurling-links-in-messages/
- Short.io social preview docs:
  - https://docs.short.io/articles/features/features/how-to-set-up-social-media-preview
- Vercel discussion on OG crawler routing:
  - https://github.com/vercel/vercel/discussions/6926
- LinkedIn Post Inspector references (ecosystem docs):
  - https://www.linkedhelper.com/blog/linkedin-post-inspector/
- General crawler list reference:
  - https://www.humansecurity.com/learn/blog/crawlers-list-known-bots-guide/
