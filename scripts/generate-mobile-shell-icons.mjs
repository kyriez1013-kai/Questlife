import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const projectRoot = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(projectRoot, 'public', 'icons');
const background = [9, 14, 26, 255];
const foreground = [248, 250, 252, 255];
const markPolygons = [
  [[4, 13], [13, 7.5], [22, 13], [13, 18.5]],
  [[13.5, 7], [23, 1.5], [32, 7], [22.5, 12.5]],
  [[13.5, 19], [23, 13.5], [32, 19], [22.5, 24.5]],
  [[4, 14], [12.5, 19.5], [12.5, 30], [4, 24.5]],
  [[4, 25.5], [12.5, 31], [12.5, 41.5], [4, 36]],
  [[13.5, 20], [22, 25.5], [22, 36], [13.5, 30.5]],
  [[13.5, 31.5], [22, 37], [22, 47.5], [13.5, 42]],
  [[33, 25.5], [43.5, 31.5], [33, 37.5]],
];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (1 + width * 4);
    rows[rowOffset] = 0;
    pixels.copy(rows, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const crossed = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crossed) inside = !inside;
  }
  return inside;
}

function markContains(x, y, scale) {
  const coordinate = (value) => (value - 24) / scale + 24;
  const markX = coordinate(x);
  const markY = coordinate(y);
  if ((markX - 40) ** 2 + (markY - 8) ** 2 <= 4.8 ** 2) return true;
  return markPolygons.some((polygon) => pointInPolygon(markX, markY, polygon));
}

function createIcon(size, markScale) {
  const supersample = size <= 32 ? 8 : 4;
  const highSize = size * supersample;
  const highPixels = Buffer.alloc(highSize * highSize * 4);
  for (let y = 0; y < highSize; y += 1) {
    for (let x = 0; x < highSize; x += 1) {
      const normalizedX = ((x + 0.5) / highSize) * 48;
      const normalizedY = ((y + 0.5) / highSize) * 48;
      const color = markContains(normalizedX, normalizedY, markScale) ? foreground : background;
      const offset = (y * highSize + x) * 4;
      highPixels.set(color, offset);
    }
  }

  const pixels = Buffer.alloc(size * size * 4);
  const sampleCount = supersample * supersample;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sum = [0, 0, 0, 0];
      for (let sy = 0; sy < supersample; sy += 1) {
        for (let sx = 0; sx < supersample; sx += 1) {
          const sourceOffset = (((y * supersample + sy) * highSize) + x * supersample + sx) * 4;
          for (let channel = 0; channel < 4; channel += 1) sum[channel] += highPixels[sourceOffset + channel];
        }
      }
      const targetOffset = (y * size + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) pixels[targetOffset + channel] = Math.round(sum[channel] / sampleCount);
    }
  }
  return encodePng(size, size, pixels);
}

fs.mkdirSync(outputDir, { recursive: true });
const outputs = [
  ['questlife-192.png', 192, 0.72],
  ['questlife-512.png', 512, 0.72],
  ['questlife-maskable-512.png', 512, 0.58],
  ['apple-touch-icon.png', 180, 0.72],
  ['favicon-32.png', 32, 0.92],
];

for (const [name, size, markScale] of outputs) {
  fs.writeFileSync(path.join(outputDir, name), createIcon(size, markScale));
}

console.log(`Generated ${outputs.length} QuestLife shell icons in ${path.relative(projectRoot, outputDir)}`);
