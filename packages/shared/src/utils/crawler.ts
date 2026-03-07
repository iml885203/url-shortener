const CRAWLER_RE =
  /facebookexternalhit|Twitterbot|LinkedInBot|Discordbot|LINE|Slackbot|Googlebot|bingbot|WhatsApp|TelegramBot|Applebot|ia_archiver/i;

/**
 * Returns true if the User-Agent string looks like a social media crawler
 * that would benefit from OG meta tags rather than a redirect.
 */
export function isCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return CRAWLER_RE.test(userAgent);
}
