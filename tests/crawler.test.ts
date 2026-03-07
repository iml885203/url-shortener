import { describe, it, expect } from 'vitest';
import { isCrawler } from '@url-shortener/shared';

describe('isCrawler', () => {
  it('matches common preview bots', () => {
    expect(isCrawler('facebookexternalhit/1.1')).toBe(true);
    expect(isCrawler('Twitterbot/1.0')).toBe(true);
    expect(isCrawler('Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)')).toBe(true);
    expect(isCrawler('Discordbot/2.0')).toBe(true);
    expect(isCrawler('LinkedInBot/1.0')).toBe(true);
    expect(isCrawler('TelegramBot (like TwitterBot)')).toBe(true);
  });

  it('does not match normal browser UA', () => {
    expect(
      isCrawler(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });

  it('handles null/empty safely', () => {
    expect(isCrawler(null)).toBe(false);
    expect(isCrawler(undefined)).toBe(false);
    expect(isCrawler('')).toBe(false);
  });
});
