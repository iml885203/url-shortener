import Sqids from 'sqids';

// Custom alphabet excluding l, g, a, n to avoid collision with logan encoding pattern
// Default alphabet: abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
const ALPHABET = 'bcdefhijkmopqrstuvwxyzBCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const sqids = new Sqids({
  alphabet: ALPHABET,
  minLength: 2,
});

/**
 * Encode an integer ID to a short URL-safe string.
 * Example: 1 → "Uk"
 */
export function encodeId(id: number): string {
  return sqids.encode([id]);
}

/**
 * Decode a short string back to an integer ID.
 * Returns null if the string is invalid.
 */
export function decodeSlug(slug: string): number | null {
  try {
    const nums = sqids.decode(slug);
    if (nums.length !== 1) return null;
    return nums[0];
  } catch {
    return null;
  }
}
