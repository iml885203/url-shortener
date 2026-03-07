/**
 * Upload a file to R2 and return the public URL.
 */
export async function r2Upload(
  bucket: R2Bucket,
  key: string,
  body: ArrayBuffer,
  contentType: string,
  baseUrl: string
): Promise<string> {
  await bucket.put(key, body, {
    httpMetadata: { contentType },
  });
  return `${baseUrl}/${key}`;
}

/**
 * Delete an object from R2 by key.
 */
export async function r2Delete(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}

/**
 * Extract the R2 key from an OG image URL.
 * Returns null if the URL doesn't match the expected pattern.
 */
export function r2KeyFromUrl(url: string, baseUrl: string): string | null {
  if (!url.startsWith(baseUrl + '/')) return null;
  return url.slice(baseUrl.length + 1);
}
