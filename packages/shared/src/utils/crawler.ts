import { isbot } from 'isbot';

/**
 * Crawler detection for OG preview rendering.
 *
 * Strategy:
 * 1) Use `isbot` as maintained baseline (reduces manual UA maintenance)
 * 2) Keep explicit social-preview keywords as safety net
 */

export const PREVIEW_BOT_KEYWORDS = [
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'discordbot',
  'slackbot',
  'Slack-ImgProxy',
  'SkypeUriPreview',
  'WhatsApp',
  'TelegramBot',
  'LINE',
] as const;

const PREVIEW_BOT_RE = new RegExp(PREVIEW_BOT_KEYWORDS.join('|'), 'i');

/**
 * Returns true if User-Agent should be treated as crawler/preview bot.
 */
export function isCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;

  // explicit preview bots first
  if (PREVIEW_BOT_RE.test(userAgent)) return true;

  // maintained generic bot detection baseline
  return isbot(userAgent);
}
