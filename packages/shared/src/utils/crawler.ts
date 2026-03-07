/**
 * Crawler detection for OG preview rendering.
 *
 * Traceable sources and confidence notes live in:
 *   packages/shared/references/crawler-ua.md
 *
 * Design:
 * - Prefer explicit, platform-specific UA keywords (high confidence).
 * - Keep one low-confidence fallback group for unknown validators (`crawler`, `bot`).
 */

export const KNOWN_PREVIEW_BOT_KEYWORDS = [
  // Meta/Facebook
  'facebookexternalhit',
  'facebot',

  // X/Twitter
  'twitterbot',

  // LinkedIn
  'linkedinbot',
  'LinkedInBot',

  // Chat platforms
  'discordbot',
  'slackbot',
  'Slack-ImgProxy',
  'SkypeUriPreview',
  'WhatsApp',
  'TelegramBot',
  'LINE',

  // Search/archive bots that often fetch metadata
  'googlebot',
  'bingbot',
  'DuckDuckBot',
  'Applebot',
  'ia_archiver',
] as const;

/**
 * Heuristic fallback keywords.
 * Lower confidence than known platform bots; kept for practical coverage of
 * preview validators we haven't explicitly enumerated yet.
 */
export const HEURISTIC_BOT_KEYWORDS = ['crawler', 'bot'] as const;

const KNOWN_BOT_RE = new RegExp(KNOWN_PREVIEW_BOT_KEYWORDS.join('|'), 'i');
const HEURISTIC_BOT_RE = new RegExp(HEURISTIC_BOT_KEYWORDS.join('|'), 'i');

/**
 * Returns true if the User-Agent string looks like a crawler that should get OG HTML.
 */
export function isCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return KNOWN_BOT_RE.test(userAgent) || HEURISTIC_BOT_RE.test(userAgent);
}
