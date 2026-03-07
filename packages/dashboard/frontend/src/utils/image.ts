const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 630;
const TARGET_MAX_BYTES = 600 * 1024; // 600KB
const API_HARD_LIMIT_BYTES = 1024 * 1024; // 1MB

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to encode image'));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

/**
 * Optimize uploaded OG image for social preview:
 * - Resize to 1200x630 (cover)
 * - Encode to webp/jpeg with target <= 600KB
 * - Enforce hard limit <= 1MB
 */
export async function optimizeOgImage(file: File): Promise<File> {
  // Keep GIF as-is to preserve potential animation; only enforce hard limit.
  if (file.type === 'image/gif') {
    if (file.size > API_HARD_LIMIT_BYTES) {
      throw new Error('GIF image is too large. Maximum size is 1MB.');
    }
    return file;
  }

  // SVG is usually small and text-based; keep original unless too big.
  if (file.type === 'image/svg+xml') {
    if (file.size > API_HARD_LIMIT_BYTES) {
      throw new Error('SVG image is too large. Maximum size is 1MB.');
    }
    return file;
  }

  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  // Draw cover crop
  const srcRatio = img.width / img.height;
  const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;

  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (srcRatio > targetRatio) {
    // wider → crop horizontally
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    // taller → crop vertically
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

  // Try webp first with stepped quality
  const candidates: Array<{ type: string; quality?: number; ext: string }> = [
    { type: 'image/webp', quality: 0.9, ext: 'webp' },
    { type: 'image/webp', quality: 0.8, ext: 'webp' },
    { type: 'image/webp', quality: 0.7, ext: 'webp' },
    { type: 'image/jpeg', quality: 0.85, ext: 'jpg' },
    { type: 'image/jpeg', quality: 0.75, ext: 'jpg' },
  ];

  let best: Blob | null = null;
  let bestMeta: { type: string; ext: string } | null = null;

  for (const c of candidates) {
    const blob = await canvasToBlob(canvas, c.type, c.quality);
    if (!best || blob.size < best.size) {
      best = blob;
      bestMeta = { type: c.type, ext: c.ext };
    }
    if (blob.size <= TARGET_MAX_BYTES) {
      best = blob;
      bestMeta = { type: c.type, ext: c.ext };
      break;
    }
  }

  if (!best || !bestMeta) throw new Error('Failed to optimize image');

  if (best.size > API_HARD_LIMIT_BYTES) {
    throw new Error('Image is too large after optimization. Please use a simpler image.');
  }

  const base = file.name.replace(/\.[^.]+$/, '') || 'og-image';
  return new File([best], `${base}.${bestMeta.ext}`, { type: bestMeta.type });
}
