import { KVLinkData } from '../types';

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
