import { KVLinkData, KVCustomSlugPointer } from '../types.js';

const KV_TTL = 86400; // 24 hours

/**
 * Get a link from KV cache by ID.
 * Returns null on miss.
 */
export async function kvGet(kv: KVNamespace, id: number): Promise<KVLinkData | null> {
  const raw = await kv.get(String(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as KVLinkData;
  } catch {
    return null;
  }
}

/**
 * Set a link in KV cache by ID.
 */
export async function kvSet(kv: KVNamespace, id: number, data: KVLinkData): Promise<void> {
  await kv.put(String(id), JSON.stringify(data), { expirationTtl: KV_TTL });
}

/**
 * Delete a link from KV cache by ID.
 */
export async function kvDelete(kv: KVNamespace, id: number): Promise<void> {
  await kv.delete(String(id));
}

/**
 * Set a custom slug pointer in KV cache.
 * Key: "custom:{slug}" → { id }
 */
export async function kvSetCustomSlug(kv: KVNamespace, slug: string, id: number): Promise<void> {
  const data: KVCustomSlugPointer = { id };
  await kv.put(`custom:${slug}`, JSON.stringify(data), { expirationTtl: KV_TTL });
}

/**
 * Get a custom slug pointer from KV cache.
 * Returns the link ID, or null on miss.
 */
export async function kvGetCustomSlug(kv: KVNamespace, slug: string): Promise<number | null> {
  const raw = await kv.get(`custom:${slug}`);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as KVCustomSlugPointer;
    return typeof data.id === 'number' ? data.id : null;
  } catch {
    return null;
  }
}

/**
 * Delete a custom slug pointer from KV cache.
 */
export async function kvDeleteCustomSlug(kv: KVNamespace, slug: string): Promise<void> {
  await kv.delete(`custom:${slug}`);
}
