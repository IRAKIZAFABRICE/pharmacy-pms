/**
 * Generate a proper .ico file from our PNG
 * ICO format: header + directory entries + image data (BMP format)
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;
const PNG_PATH = path.join(__dirname, '..', 'build', 'icon.png');
const ICO_PATH = path.join(__dirname, '..', 'build', 'icon.ico');

// Create the PNG
function crc32(buf) {
  let crc = 0xffffffff;
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, typeB, data, crc]);
}

function createPNG(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 8);
  ihdr[12] = 8;
  ihdr[9] = 2; // RGB

  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0;
    for (let x = 0; x < width; x++) {
      const idx = y * (1 + width * 3) + 1 + x * 3;
      const pi = (y * width + x) * 3;
      raw[idx] = pixels[pi];
      raw[idx + 1] = pixels[pi + 1];
      raw[idx + 2] = pixels[pi + 2];
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  return Buffer.concat([sig, ihdrChunk, idat, iend]);
}

function generatePixels() {
  const pixels = new Uint8Array(SIZE * SIZE * 3);
  const bgColor = [0x1a, 0x73, 0xe8];
  const crossColor = [0xff, 0xff, 0xff];
  const crossBorder = [0x0d, 0x47, 0xa1];

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const crossW = 80;
  const crossH = 140;
  const armW = 140;
  const armH = 80;

  function isInRoundedRect(x, y, rx, ry, rw, rh, radius) {
    const left = rx;
    const right = rx + rw;
    const top = ry;
    const bottom = ry + rh;
    if (x < left || x > right || y < top || y > bottom) return false;
    if (x < left + radius && y < top + radius) return (x - (left + radius)) ** 2 + (y - (top + radius)) ** 2 <= radius * radius;
    if (x > right - radius && y < top + radius) return (x - (right - radius)) ** 2 + (y - (top + radius)) ** 2 <= radius * radius;
    if (x < left + radius && y > bottom - radius) return (x - (left + radius)) ** 2 + (y - (bottom - radius)) ** 2 <= radius * radius;
    if (x > right - radius && y > bottom - radius) return (x - (right - radius)) ** 2 + (y - (bottom - radius)) ** 2 <= radius * radius;
    return true;
  }

  const circleRadius = SIZE / 2 - 8;
  const circleCx = cx;
  const circleCy = cy;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const pi = (y * SIZE + x) * 3;
      const dx = x - circleCx;
      const dy = y - circleCy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > circleRadius) {
        pixels[pi] = 0xf0;
        pixels[pi + 1] = 0xf4;
        pixels[pi + 2] = 0xf8;
        continue;
      }

      const gradient = 1 - (dist / circleRadius) * 0.15;
      pixels[pi] = Math.min(255, Math.round(bgColor[0] * gradient));
      pixels[pi + 1] = Math.min(255, Math.round(bgColor[1] * gradient));
      pixels[pi + 2] = Math.min(255, Math.round(bgColor[2] * gradient));

      const inVertical = isInRoundedRect(x, y, cx - crossW / 2, cy - crossH / 2, crossW, crossH, 12);
      const inHorizontal = isInRoundedRect(x, y, cx - armW / 2, cy - armH / 2, armW, armH, 12);

      if (inVertical || inHorizontal) {
        const inVerticalInner = isInRoundedRect(x, y, cx - crossW / 2 + 3, cy - crossH / 2 + 3, crossW - 6, crossH - 6, 10);
        const inHorizontalInner = isInRoundedRect(x, y, cx - armW / 2 + 3, cy - armH / 2 + 3, armW - 6, armH - 6, 10);

        if ((inVertical && !inVerticalInner) || (inHorizontal && !inHorizontalInner)) {
          pixels[pi] = crossBorder[0];
          pixels[pi + 1] = crossBorder[1];
          pixels[pi + 2] = crossBorder[2];
        } else {
          pixels[pi] = crossColor[0];
          pixels[pi + 1] = crossColor[1];
          pixels[pi + 2] = crossColor[2];
        }
      }

      // Shine
      const shineX = x - (circleCx - circleRadius * 0.3);
      const shineY = y - (circleCy - circleRadius * 0.3);
      const shineDist = Math.sqrt(shineX * shineX + shineY * shineY);
      if (shineDist < circleRadius * 0.4) {
        const shine = (1 - shineDist / (circleRadius * 0.4)) * 0.12;
        pixels[pi] = Math.min(255, pixels[pi] + Math.round(255 * shine));
        pixels[pi + 1] = Math.min(255, pixels[pi + 1] + Math.round(255 * shine));
        pixels[pi + 2] = Math.min(255, pixels[pi + 2] + Math.round(255 * shine));
      }
    }
  }

  return pixels;
}

// Special: generate ICO using embedded BMP approach
// ICO format uses BMP-like DIB data for the image
function createICOFromPNG(pngData) {
  // For .ico, we embed the entire PNG as the image data
  // This is supported by modern Windows
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type: ICO
  icoHeader.writeUInt16LE(1, 4); // Count: 1 entry

  // Directory entry
  const entry = Buffer.alloc(16);
  entry.writeUInt8(SIZE >= 256 ? 0 : SIZE, 0); // Width (0 means 256)
  entry.writeUInt8(SIZE >= 256 ? 0 : SIZE, 1); // Height (0 means 256)
  entry.writeUInt8(0, 2); // Colors
  entry.writeUInt8(0, 3); // Reserved
  entry.writeUInt16LE(1, 4); // Color planes
  entry.writeUInt16LE(32, 6); // Bits per pixel

  // BMP data offset = header + entry = 22
  const dataOffset = 22;
  entry.writeUInt32LE(pngData.length, 8); // Size of image data
  entry.writeUInt32LE(dataOffset, 12); // Offset to image data

  return Buffer.concat([icoHeader, entry, pngData]);
}

// Actually, let's just create a proper BMP-based ICO for best compatibility
function createICOFromBMP(width, height, pixels) {
  // BMP header for ICO (DIB format - BITMAPINFOHEADER)
  const bpp = 32; // BGRA
  const rowSize = Math.floor((bpp * width + 31) / 32) * 4;
  const pixelDataSize = rowSize * height;
  
  // DIB header (BITMAPINFOHEADER) - 40 bytes
  const dib = Buffer.alloc(40);
  dib.writeUInt32LE(40, 0); // Header size
  dib.writeInt32LE(width, 4); // Width
  dib.writeInt32LE(height * 2, 8); // Height (double for ICO - XOR + AND mask)
  dib.writeUInt16LE(1, 12); // Planes
  dib.writeUInt16LE(bpp, 14); // BPP
  dib.writeUInt32LE(0, 16); // Compression (BI_RGB)
  dib.writeUInt32LE(pixelDataSize * 2, 20); // Image size (XOR + AND)

  // XOR mask (BGRA pixels, bottom-up)
  const xorMask = Buffer.alloc(pixelDataSize);
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const pi = (srcY * width + x) * 3;
      const dstOffset = y * rowSize + x * 4;
      xorMask[dstOffset] = pixels[pi + 2];     // B
      xorMask[dstOffset + 1] = pixels[pi + 1]; // G
      xorMask[dstOffset + 2] = pixels[pi];     // R
      xorMask[dstOffset + 3] = 0xff;            // A (fully opaque)
    }
  }

  // AND mask (1-bit transparency, all 0 = opaque)
  const andRowSize = Math.floor((width + 31) / 32) * 4;
  const andMask = Buffer.alloc(andRowSize * height);

  // ICO file
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type: ICO
  icoHeader.writeUInt16LE(1, 4); // Count

  const imageData = Buffer.concat([dib, xorMask, andMask]);
  const dataOffset = 22;

  // Directory entry
  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0);
  entry.writeUInt8(height >= 256 ? 0 : height, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(bpp, 6); // bpp
  entry.writeUInt32LE(imageData.length, 8);
  entry.writeUInt32LE(dataOffset, 12);

  return Buffer.concat([icoHeader, entry, imageData]);
}

// Main
const pixels = generatePixels();
const ico = createICOFromBMP(SIZE, SIZE, pixels);
fs.writeFileSync(ICO_PATH, ico);
console.log(`ICO created: ${ICO_PATH} (${ico.length} bytes)`);

// Also write PNG
const png = createPNG(SIZE, SIZE, pixels);
fs.writeFileSync(PNG_PATH, png);
console.log(`PNG created: ${PNG_PATH} (${png.length} bytes)`);

console.log('\nDone!');
