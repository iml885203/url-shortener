import QRCode from 'qrcode';
import { encode as encodePng } from 'fast-png';

const WHITE = [255, 255, 255, 255] as const;
const BLACK = [18, 18, 18, 255] as const;

const qrOptions = {
  errorCorrectionLevel: 'M' as const,
  margin: 0,
};

/**
 * Generate a clean QR code PNG (no text, no labels).
 * Returns a square image with quiet zone.
 */
export function buildQrPng(content: string, size = 400): Uint8Array {
  const qr = QRCode.create(content, qrOptions);
  const moduleCount = qr.modules.size;
  const quietZone = 4;
  const totalModules = moduleCount + quietZone * 2;
  const scale = Math.max(2, Math.floor(size / totalModules));
  const imageSize = totalModules * scale;

  const data = new Uint8Array(imageSize * imageSize * 4);
  // Fill white
  for (let i = 0; i < data.length; i += 4) {
    data[i] = WHITE[0];
    data[i + 1] = WHITE[1];
    data[i + 2] = WHITE[2];
    data[i + 3] = WHITE[3];
  }

  // Draw QR modules
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!qr.modules.get(row, col)) continue;
      const px = (col + quietZone) * scale;
      const py = (row + quietZone) * scale;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const idx = ((py + dy) * imageSize + (px + dx)) * 4;
          data[idx] = BLACK[0];
          data[idx + 1] = BLACK[1];
          data[idx + 2] = BLACK[2];
          data[idx + 3] = BLACK[3];
        }
      }
    }
  }

  return encodePng({ width: imageSize, height: imageSize, data, channels: 4 });
}
