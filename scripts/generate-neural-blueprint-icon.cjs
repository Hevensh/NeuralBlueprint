const fs = require('node:fs');
const path = require('node:path');

const OUTPUT = path.join(__dirname, '..', 'assets', 'icons', 'neural-blueprint.ico');
const SIZES = [16, 24, 32, 48, 64, 128, 256];
const SUPERSAMPLE = 4;

const COLORS = {
  body: '#0f172a',
  header: '#1e293b',
  border: '#22d3ee',
  red: '#fb7185',
  yellow: '#facc15',
  green: '#4ade80',
  nodeA: '#22d3ee',
  nodeB: '#a5f3fc',
  nodeC: '#38bdf8',
  line: '#94a3b8',
};

function generateIcon() {
  const images = SIZES.map((size) => createIconImage(size));
  const headerSize = 6 + images.length * 16;
  let offset = headerSize;

  const entries = images.map((image) => {
    const entry = { ...image, offset };
    offset += image.data.length;
    return entry;
  });

  const buffer = Buffer.alloc(offset);
  buffer.writeUInt16LE(0, 0);
  buffer.writeUInt16LE(1, 2);
  buffer.writeUInt16LE(entries.length, 4);

  entries.forEach((entry, index) => {
    const start = 6 + index * 16;
    buffer.writeUInt8(entry.size === 256 ? 0 : entry.size, start);
    buffer.writeUInt8(entry.size === 256 ? 0 : entry.size, start + 1);
    buffer.writeUInt8(0, start + 2);
    buffer.writeUInt8(0, start + 3);
    buffer.writeUInt16LE(1, start + 4);
    buffer.writeUInt16LE(32, start + 6);
    buffer.writeUInt32LE(entry.data.length, start + 8);
    buffer.writeUInt32LE(entry.offset, start + 12);
    entry.data.copy(buffer, entry.offset);
  });

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, buffer);
}

function createIconImage(size) {
  const highSize = size * SUPERSAMPLE;
  const pixels = new Uint8ClampedArray(highSize * highSize * 4);
  const scale = highSize / 64;

  drawRoundedRect(pixels, highSize, scale, 6, 8, 52, 48, 10, COLORS.body);
  drawRoundedRect(pixels, highSize, scale, 6, 8, 52, 12, 6, COLORS.header);
  drawCircle(pixels, highSize, scale, 14, 15, 2, COLORS.red);
  drawCircle(pixels, highSize, scale, 21, 15, 2, COLORS.yellow);
  drawCircle(pixels, highSize, scale, 28, 15, 2, COLORS.green);
  strokeRoundedRect(pixels, highSize, scale, 6, 8, 52, 48, 10, 2, COLORS.border);
  drawCircle(pixels, highSize, scale, 42, 30, 3.5, COLORS.nodeA);
  drawCircle(pixels, highSize, scale, 50, 38, 3.5, COLORS.nodeB);
  drawCircle(pixels, highSize, scale, 40, 46, 3.5, COLORS.nodeC);
  drawLine(pixels, highSize, scale, 44.5, 32.5, 47.5, 35.5, 2, COLORS.line);
  drawLine(pixels, highSize, scale, 47, 39.8, 43, 44.2, 2, COLORS.line);
  drawLine(pixels, highSize, scale, 41.5, 33.5, 40.5, 42.5, 2, COLORS.line);

  return {
    size,
    data: createDib(size, downsample(pixels, highSize, size)),
  };
}

function drawRoundedRect(pixels, canvasSize, scale, x, y, width, height, radius, color) {
  drawShape(
    pixels,
    canvasSize,
    scale,
    x,
    y,
    width,
    height,
    color,
    (px, py) => insideRoundedRect(px, py, x, y, width, height, radius),
  );
}

function strokeRoundedRect(
  pixels,
  canvasSize,
  scale,
  x,
  y,
  width,
  height,
  radius,
  strokeWidth,
  color,
) {
  drawShape(
    pixels,
    canvasSize,
    scale,
    x - strokeWidth,
    y - strokeWidth,
    width + strokeWidth * 2,
    height + strokeWidth * 2,
    color,
    (px, py) => (
      insideRoundedRect(
        px,
        py,
        x - strokeWidth / 2,
        y - strokeWidth / 2,
        width + strokeWidth,
        height + strokeWidth,
        radius + strokeWidth / 2,
      )
      && !insideRoundedRect(
        px,
        py,
        x + strokeWidth / 2,
        y + strokeWidth / 2,
        width - strokeWidth,
        height - strokeWidth,
        Math.max(0, radius - strokeWidth / 2),
      )
    ),
  );
}

function drawCircle(pixels, canvasSize, scale, cx, cy, radius, color) {
  drawShape(
    pixels,
    canvasSize,
    scale,
    cx - radius,
    cy - radius,
    radius * 2,
    radius * 2,
    color,
    (px, py) => (px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2,
  );
}

function drawLine(pixels, canvasSize, scale, x1, y1, x2, y2, width, color) {
  const half = width / 2;
  drawShape(
    pixels,
    canvasSize,
    scale,
    Math.min(x1, x2) - half,
    Math.min(y1, y2) - half,
    Math.abs(x2 - x1) + width,
    Math.abs(y2 - y1) + width,
    color,
    (px, py) => distanceToSegment(px, py, x1, y1, x2, y2) <= half,
  );
}

function drawShape(
  pixels,
  canvasSize,
  scale,
  x,
  y,
  width,
  height,
  color,
  contains,
) {
  const [red, green, blue, alpha] = parseColor(color);
  const left = Math.max(0, Math.floor(x * scale));
  const top = Math.max(0, Math.floor(y * scale));
  const right = Math.min(canvasSize, Math.ceil((x + width) * scale));
  const bottom = Math.min(canvasSize, Math.ceil((y + height) * scale));

  for (let py = top; py < bottom; py += 1) {
    for (let px = left; px < right; px += 1) {
      const ox = (px + 0.5) / scale;
      const oy = (py + 0.5) / scale;
      if (!contains(ox, oy)) continue;
      const index = (py * canvasSize + px) * 4;
      blend(pixels, index, red, green, blue, alpha);
    }
  }
}

function insideRoundedRect(px, py, x, y, width, height, radius) {
  if (px < x || px > x + width || py < y || py > y + height) return false;
  const cx = clamp(px, x + radius, x + width - radius);
  const cy = clamp(py, y + radius, y + height - radius);
  return (px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2;
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared === 0
    ? 0
    : clamp(((px - x1) * dx + (py - y1) * dy) / lengthSquared, 0, 1);
  const x = x1 + ratio * dx;
  const y = y1 + ratio * dy;
  return Math.hypot(px - x, py - y);
}

function downsample(source, sourceSize, targetSize) {
  const target = new Uint8ClampedArray(targetSize * targetSize * 4);
  const sampleCount = SUPERSAMPLE * SUPERSAMPLE;

  for (let y = 0; y < targetSize; y += 1) {
    for (let x = 0; x < targetSize; x += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;

      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const sourceIndex = (
            (y * SUPERSAMPLE + sy) * sourceSize
            + x * SUPERSAMPLE
            + sx
          ) * 4;
          const sampleAlpha = source[sourceIndex + 3];
          red += source[sourceIndex] * sampleAlpha;
          green += source[sourceIndex + 1] * sampleAlpha;
          blue += source[sourceIndex + 2] * sampleAlpha;
          alpha += sampleAlpha;
        }
      }

      const targetIndex = (y * targetSize + x) * 4;
      target[targetIndex] = alpha ? Math.round(red / alpha) : 0;
      target[targetIndex + 1] = alpha ? Math.round(green / alpha) : 0;
      target[targetIndex + 2] = alpha ? Math.round(blue / alpha) : 0;
      target[targetIndex + 3] = Math.round(alpha / sampleCount);
    }
  }

  return target;
}

function createDib(size, pixels) {
  const headerSize = 40;
  const pixelSize = size * size * 4;
  const maskStride = Math.ceil(size / 32) * 4;
  const maskSize = maskStride * size;
  const buffer = Buffer.alloc(headerSize + pixelSize + maskSize);

  buffer.writeUInt32LE(headerSize, 0);
  buffer.writeInt32LE(size, 4);
  buffer.writeInt32LE(size * 2, 8);
  buffer.writeUInt16LE(1, 12);
  buffer.writeUInt16LE(32, 14);
  buffer.writeUInt32LE(0, 16);
  buffer.writeUInt32LE(pixelSize, 20);
  buffer.writeInt32LE(0, 24);
  buffer.writeInt32LE(0, 28);
  buffer.writeUInt32LE(0, 32);
  buffer.writeUInt32LE(0, 36);

  let offset = headerSize;
  for (let y = size - 1; y >= 0; y -= 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      buffer[offset] = pixels[index + 2];
      buffer[offset + 1] = pixels[index + 1];
      buffer[offset + 2] = pixels[index];
      buffer[offset + 3] = pixels[index + 3];
      offset += 4;
    }
  }

  return buffer;
}

function blend(pixels, index, red, green, blue, alpha) {
  const sourceAlpha = alpha / 255;
  const targetAlpha = pixels[index + 3] / 255;
  const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

  if (outputAlpha === 0) return;

  pixels[index] = (
    red * sourceAlpha
    + pixels[index] * targetAlpha * (1 - sourceAlpha)
  ) / outputAlpha;
  pixels[index + 1] = (
    green * sourceAlpha
    + pixels[index + 1] * targetAlpha * (1 - sourceAlpha)
  ) / outputAlpha;
  pixels[index + 2] = (
    blue * sourceAlpha
    + pixels[index + 2] * targetAlpha * (1 - sourceAlpha)
  ) / outputAlpha;
  pixels[index + 3] = outputAlpha * 255;
}

function parseColor(color) {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
    255,
  ];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

generateIcon();
