import QRCode from 'qrcode';
import { encode as encodePng } from 'fast-png';
// @ts-expect-error - package has no published TypeScript definitions.
import oledFont5x7 from 'oled-font-5x7';

const WHITE = [255, 255, 255, 255] as const;
const BLACK = [18, 18, 18, 255] as const;
const LABEL = [71, 85, 105, 255] as const;

const FONT_WIDTH = 5;
const FONT_HEIGHT = 7;
const FONT_SPACING = 1;
const LINE_HEIGHT = FONT_HEIGHT + 3;

const qrOptions = {
  errorCorrectionLevel: 'M' as const,
  margin: 0,
};

const fontLookup: string[] = oledFont5x7.lookup as string[];
const fontData: number[] = oledFont5x7.fontData as number[];

function setPixel(
  data: Uint8Array,
  canvasWidth: number,
  x: number,
  y: number,
  color: readonly [number, number, number, number]
): void {
  if (x < 0 || y < 0) return;
  const idx = (y * canvasWidth + x) * 4;
  if (idx < 0 || idx + 3 >= data.length) return;
  data[idx] = color[0];
  data[idx + 1] = color[1];
  data[idx + 2] = color[2];
  data[idx + 3] = color[3];
}

function fillRect(
  data: Uint8Array,
  canvasWidth: number,
  x: number,
  y: number,
  width: number,
  height: number,
  color: readonly [number, number, number, number]
): void {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      setPixel(data, canvasWidth, px, py, color);
    }
  }
}

function drawChar(
  data: Uint8Array,
  canvasWidth: number,
  x: number,
  y: number,
  char: string,
  color: readonly [number, number, number, number],
  scale = 1
): number {
  const charIndex = fontLookup.indexOf(char);
  if (charIndex === -1) {
    return (FONT_WIDTH + FONT_SPACING) * scale;
  }

  const start = charIndex * FONT_WIDTH;
  for (let col = 0; col < FONT_WIDTH; col += 1) {
    const bits = fontData[start + col] ?? 0;
    for (let row = 0; row < FONT_HEIGHT; row += 1) {
      if (((bits >> row) & 1) === 0) continue;
      fillRect(data, canvasWidth, x + col * scale, y + row * scale, scale, scale, color);
    }
  }

  return (FONT_WIDTH + FONT_SPACING) * scale;
}

function drawText(
  data: Uint8Array,
  canvasWidth: number,
  x: number,
  y: number,
  text: string,
  color: readonly [number, number, number, number],
  scale = 1
): void {
  let cursor = x;
  for (const char of text) {
    cursor += drawChar(data, canvasWidth, cursor, y, char, color, scale);
  }
}

function wrapText(input: string, maxChars: number): string[] {
  if (!input) return [''];

  const chunks: string[] = [];
  let remaining = input;
  while (remaining.length > maxChars) {
    chunks.push(remaining.slice(0, maxChars));
    remaining = remaining.slice(maxChars);
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

function drawQr(
  data: Uint8Array,
  canvasWidth: number,
  x: number,
  y: number,
  size: number,
  content: string
): void {
  const qr = QRCode.create(content, qrOptions);
  const moduleCount = qr.modules.size;
  const quietZone = 4;
  const moduleWithQuiet = moduleCount + quietZone * 2;
  const scale = Math.max(2, Math.floor(size / moduleWithQuiet));
  const renderedSize = moduleWithQuiet * scale;
  const originX = x + Math.floor((size - renderedSize) / 2);
  const originY = y + Math.floor((size - renderedSize) / 2);

  fillRect(data, canvasWidth, originX, originY, renderedSize, renderedSize, WHITE);

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!qr.modules.get(row, col)) continue;
      const px = originX + (col + quietZone) * scale;
      const py = originY + (row + quietZone) * scale;
      fillRect(data, canvasWidth, px, py, scale, scale, BLACK);
    }
  }
}

interface QrPanel {
  label: string;
  value: string;
}

export function buildShareQrPng(panels: QrPanel[]): Uint8Array {
  const panelWidth = 300;
  const panelGap = 24;
  const padding = 24;
  const qrSize = 220;
  const labelScale = 2;
  const textTop = padding + 18 + qrSize + 18;
  const textMaxChars = Math.max(20, Math.floor((panelWidth - 16) / ((FONT_WIDTH + FONT_SPACING) * 1)));

  const panelTextLines = panels.map((panel) => wrapText(panel.value, textMaxChars));
  const maxLines = panelTextLines.reduce((acc, lines) => Math.max(acc, lines.length), 1);
  const textBlockHeight = maxLines * LINE_HEIGHT;

  const canvasWidth = padding * 2 + panelWidth * panels.length + panelGap * (panels.length - 1);
  const canvasHeight = textTop + textBlockHeight + padding;

  const data = new Uint8Array(canvasWidth * canvasHeight * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = WHITE[0];
    data[i + 1] = WHITE[1];
    data[i + 2] = WHITE[2];
    data[i + 3] = WHITE[3];
  }

  panels.forEach((panel, index) => {
    const panelX = padding + index * (panelWidth + panelGap);
    const qrX = panelX + Math.floor((panelWidth - qrSize) / 2);
    const labelTextWidth = panel.label.length * (FONT_WIDTH + FONT_SPACING) * labelScale;
    const labelX = panelX + Math.floor((panelWidth - labelTextWidth) / 2);

    drawText(data, canvasWidth, labelX, padding, panel.label, LABEL, labelScale);
    drawQr(data, canvasWidth, qrX, padding + 18, qrSize, panel.value);

    const lines = panelTextLines[index] ?? [];
    lines.forEach((line, lineIndex) => {
      const lineWidth = line.length * (FONT_WIDTH + FONT_SPACING);
      const lineX = panelX + Math.floor((panelWidth - lineWidth) / 2);
      drawText(data, canvasWidth, lineX, textTop + lineIndex * LINE_HEIGHT, line, LABEL, 1);
    });
  });

  return encodePng({
    width: canvasWidth,
    height: canvasHeight,
    data,
    channels: 4,
  });
}
