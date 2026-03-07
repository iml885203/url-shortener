# Crawler UA Rules (Traceable Sources)

Last updated: 2026-03-07

This file explains why each crawler keyword exists in `src/utils/crawler.ts`.

## High-confidence keywords (platform-specific)

- `facebookexternalhit`, `facebot`
  - Purpose: Facebook/Meta link preview crawlers.
  - Source: Meta sharing crawler docs and common OG implementations.

- `twitterbot`
  - Purpose: X/Twitter card fetcher.
  - Source: X/Twitter cards docs + community OG implementations.

- `linkedinbot`, `LinkedInBot`
  - Purpose: LinkedIn preview crawler.
  - Source: LinkedIn Post Inspector ecosystem/docs references.

- `discordbot`
  - Purpose: Discord link preview crawler.
  - Source: Real-world link preview behavior and community references.

- `slackbot`, `Slack-ImgProxy`
  - Purpose: Slack classic unfurl + image proxy fetches.
  - Source: Slack unfurl docs (`docs.slack.dev/messaging/unfurling-links-in-messages/`).

- `SkypeUriPreview`
  - Purpose: Skype/Teams-family preview crawler.
  - Source: common UA lists used by OG routing systems.

- `WhatsApp`, `TelegramBot`, `LINE`
  - Purpose: chat platform link preview fetchers.
  - Source: common preview UA lists and community troubleshooting threads.

- `googlebot`, `bingbot`, `DuckDuckBot`, `Applebot`, `ia_archiver`
  - Purpose: bot traffic that may request metadata pages.
  - Source: widespread crawler UA references and production bot filtering patterns.

## Lower-confidence fallback keywords

- `crawler`, `bot`
  - Purpose: catch unknown preview validators not yet in allowlist.
  - Risk: may classify some non-preview bots as crawler (acceptable for OG path).
  - Mitigation: keep click logging disabled for crawler path; add specific keywords over time and reduce fallback usage.

## Operational notes

- If a platform fails to show custom OG:
  1. capture request UA from logs,
  2. verify platform source,
  3. add explicit keyword here + in `crawler.ts`,
  4. re-test with validator and real share.

- Debug endpoint/flag: use `?og=1` to force OG HTML for validation tools.

## Reference links

- Slack unfurling docs:
  - https://docs.slack.dev/messaging/unfurling-links-in-messages/
- Short.io OG/social preview docs:
  - https://docs.short.io/articles/features/features/how-to-set-up-social-media-preview
- Vercel discussion (bot UA routing in OG use-cases):
  - https://github.com/vercel/vercel/discussions/6926
