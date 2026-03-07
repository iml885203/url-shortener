const CRAWLER_RE =
  /facebookexternalhit|facebot|Twitterbot|LinkedInBot|linkedinbot|Discordbot|Slackbot|Slack-ImgProxy|SkypeUriPreview|WhatsApp|TelegramBot|Applebot|Googlebot|bingbot|DuckDuckBot|ia_archiver|crawler|bot/i;

/**
 * Returns true if the User-Agent string looks like a social media crawler
 * that would benefit from OG meta tags rather than a redirect.
 */
export function isCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return CRAWLER_RE.test(userAgent);
}
