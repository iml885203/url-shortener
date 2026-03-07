import { describe, it, expect } from 'vitest';
import { sqidsEncodeId, sqidsDecodeSlug, loganEncodeId, loganDecodeSlug, LOGAN_PATTERN } from '@url-shortener/shared';

// ── Sqids codec ──────────────────────────────────────────────────────────────

describe('Sqids codec', () => {
  it('encodes 0 to a string of at least 2 chars', () => {
    const slug = sqidsEncodeId(0);
    expect(slug.length).toBeGreaterThanOrEqual(2);
  });

  it('round-trips small IDs', () => {
    for (const id of [0, 1, 5, 42, 100, 999]) {
      expect(sqidsDecodeSlug(sqidsEncodeId(id))).toBe(id);
    }
  });

  it('round-trips large IDs', () => {
    for (const id of [1000, 9999, 100_000, 1_000_000]) {
      expect(sqidsDecodeSlug(sqidsEncodeId(id))).toBe(id);
    }
  });

  it('returns null for an invalid slug', () => {
    expect(sqidsDecodeSlug('!@#$')).toBeNull();
    expect(sqidsDecodeSlug('')).toBeNull();
  });

  it('does not contain l, g, a, n characters in alphabet', () => {
    // Encode many IDs and check that none of the characters l/g/a/n appear
    for (let id = 0; id < 200; id++) {
      const slug = sqidsEncodeId(id);
      expect(slug).not.toMatch(/[lgan]/);
    }
  });

  it('encoded slugs do NOT match the logan pattern', () => {
    for (let id = 0; id < 100; id++) {
      const slug = sqidsEncodeId(id);
      expect(LOGAN_PATTERN.test(slug)).toBe(false);
    }
  });
});

// ── Logan codec ──────────────────────────────────────────────────────────────

describe('Logan codec', () => {
  const cases: [number, string][] = [
    [0, 'loogan'],
    [1, 'lo\u03BFgan'],   // loοgan
    [2, 'lo\u043Egan'],   // loоgan
    [3, 'lo\u1D0Fgan'],   // loᴏgan
    [4, 'l\u03BFogan'],   // lοogan
    [5, 'l\u03BF\u03BFgan'], // lοοgan
    [15, 'l\u1D0F\u1D0Fgan'], // lᴏᴏgan
    [16, 'l\u03BFoogan'],    // lοoogan
    [255, 'l\u1D0F\u1D0F\u1D0F\u1D0Fgan'], // lᴏᴏᴏᴏgan
  ];

  it('encodes known IDs correctly', () => {
    for (const [id, expected] of cases) {
      expect(loganEncodeId(id)).toBe(expected);
    }
  });

  it('decodes known slugs correctly', () => {
    for (const [id, slug] of cases) {
      expect(loganDecodeSlug(slug)).toBe(id);
    }
  });

  it('round-trips arbitrary IDs', () => {
    for (let id = 0; id < 300; id++) {
      expect(loganDecodeSlug(loganEncodeId(id))).toBe(id);
    }
  });

  it('minimum 2 o characters in encoded output', () => {
    const slug = loganEncodeId(0);
    // "loogan" has 2 o chars between l and gan
    const inner = slug.slice(1, -3);
    expect(inner.length).toBeGreaterThanOrEqual(2);
  });

  it('returns null for invalid slugs', () => {
    expect(loganDecodeSlug('loogan_bad')).toBeNull();
    expect(loganDecodeSlug('short')).toBeNull();
    expect(loganDecodeSlug('')).toBeNull();
    expect(loganDecodeSlug('lxgan')).toBeNull();
    expect(loganDecodeSlug('logan')).toBeNull(); // only 1 o char, invalid
  });

  it('LOGAN_PATTERN matches valid slugs', () => {
    for (const [, slug] of cases) {
      expect(LOGAN_PATTERN.test(slug)).toBe(true);
    }
  });

  it('LOGAN_PATTERN rejects normal strings', () => {
    expect(LOGAN_PATTERN.test('hello')).toBe(false);
    expect(LOGAN_PATTERN.test('Uk')).toBe(false);
    expect(LOGAN_PATTERN.test('loogan_x')).toBe(false);
  });
});
