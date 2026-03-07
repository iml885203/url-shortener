/**
 * Logan codec — encodes integer IDs as "loooogan"-style URLs
 *
 * Unicode o characters used as base-4 digits:
 *   o  (U+006F) = 0
 *   ο  (U+03BF) = 1  (Greek small letter omicron)
 *   о  (U+043E) = 2  (Cyrillic small letter o)
 *   ᴏ  (U+1D0F) = 3  (Latin letter small capital o)
 */

const O_CHARS = ['o', 'ο', 'о', 'ᴏ'] as const;

// Build reverse lookup map
const O_MAP = new Map<string, number>();
O_CHARS.forEach((c, i) => O_MAP.set(c, i));

/** Regex to match a valid logan-encoded slug */
export const LOGAN_PATTERN = /^l[oοоᴏ]{2,}gan$/u;

/**
 * Encode an integer ID to a logan-style string.
 * Example:
 *   0   → "loogan"
 *   1   → "loοgan"
 *   5   → "lοοgan"
 *   255 → "lᴏᴏᴏᴏgan"
 */
export function encodeId(id: number): string {
  if (id < 0 || !Number.isInteger(id)) {
    throw new Error(`Invalid ID: ${id}`);
  }

  // Convert to base-4 string
  let base4 = id.toString(4);

  // Pad to minimum 2 digits
  base4 = base4.padStart(2, '0');

  // Replace each digit with corresponding Unicode o character
  const oStr = base4
    .split('')
    .map((d) => O_CHARS[Number(d)])
    .join('');

  return `l${oStr}gan`;
}

/**
 * Decode a logan-style string back to an integer ID.
 * Returns null if the string is not a valid logan encoding.
 */
export function decodeSlug(slug: string): number | null {
  if (!LOGAN_PATTERN.test(slug)) return null;

  // Strip 'l' prefix and 'gan' suffix
  const oStr = slug.slice(1, -3);

  // Map each character back to base-4 digit
  let base4 = '';
  for (const ch of oStr) {
    const digit = O_MAP.get(ch);
    if (digit === undefined) return null;
    base4 += digit.toString();
  }

  const id = parseInt(base4, 4);
  if (isNaN(id)) return null;
  return id;
}
