/**
 * Generate a pharmacy-themed app icon
 * Creates a PNG file using pure Node.js (no external dependencies)
 * Then converts to ICO using png-to-ico
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;
const OUT_DIR = path.join(__dirname, '..', 'build');

// PNG chunk helpers
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
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 8);
  ihdr[12] = 8; // bit depth
  ihdr[9] = 2;  // color type: RGB

  // IDAT - raw pixel data with filter byte (0) per row
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter byte
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

  // IEND
  const iend = makeChunk('IEND', Buffer.alloc(0));

  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  return Buffer.concat([sig, ihdrChunk, idat, iend]);
}

function generateIcon() {
  const pixels = new Uint8Array(SIZE * SIZE * 3);

  // Pharmacy cross colors
  const bgColor = [0x1a, 0x73, 0xe8]; // #1a73e8 - medical blue
  const crossColor = [0xff, 0xff, 0xff]; // white
  const crossBorder = [0x0d, 0x47, 0xa1]; // darker blue
  const innerColor = [0x4d, 0xab, 0xf7]; // light blue

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const crossW = 80; // width of cross arms
  const crossH = 140; // height of cross (vertical bar)
  const armW = 140; // width of horizontal arm
  const armH = 80; // height of horizontal arm

  // Rounded rectangle helper
  function isInRoundedRect(x, y, rx, ry, rw, rh, radius) {
    // Check if point is inside rounded rectangle
    const left = rx;
    const right = rx + rw;
    const top = ry;
    const bottom = ry + rh;

    // Quick bounds check
    if (x < left || x > right || y < top || y > bottom) return false;

    // Check corners
    if (x < left + radius && y < top + radius) {
      // top-left
      return (x - (left + radius)) ** 2 + (y - (top + radius)) ** 2 <= radius * radius;
    }
    if (x > right - radius && y < top + radius) {
      // top-right
      return (x - (right - radius)) ** 2 + (y - (top + radius)) ** 2 <= radius * radius;
    }
    if (x < left + radius && y > bottom - radius) {
      // bottom-left
      return (x - (left + radius)) ** 2 + (y - (bottom - radius)) ** 2 <= radius * radius;
    }
    if (x > right - radius && y > bottom - radius) {
      // bottom-right
      return (x - (right - radius)) ** 2 + (y - (bottom - radius)) ** 2 <= radius * radius;
    }
    return true;
  }

  // Draw circle background
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
        // Outside circle - transparent (will be white, but we'll make it a subtle gradient)
        pixels[pi] = 0xf0;
        pixels[pi + 1] = 0xf4;
        pixels[pi + 2] = 0xf8;
        continue;
      }

      // Inside circle - blue background with gradient
      const gradient = 1 - (dist / circleRadius) * 0.15;
      pixels[pi] = Math.min(255, Math.round(bgColor[0] * gradient));
      pixels[pi + 1] = Math.min(255, Math.round(bgColor[1] * gradient));
      pixels[pi + 2] = Math.min(255, Math.round(bgColor[2] * gradient));

      // Draw the cross
      const inVertical = isInRoundedRect(x, y, cx - crossW / 2, cy - crossH / 2, crossW, crossH, 12);
      const inHorizontal = isInRoundedRect(x, y, cx - armW / 2, cy - armH / 2, armW, armH, 12);

      if (inVertical || inHorizontal) {
        // Check if it's border (2px)
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

      // Add a subtle shine effect
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

  const png = createPNG(SIZE, SIZE, pixels);
  const pngPath = path.join(OUT_DIR, 'icon.png');
  fs.writeFileSync(pngPath, png);
  console.log(`PNG icon created: ${pngPath} (${png.length} bytes)`);

  return pngPath;
}

// Run
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const pngPath = generateIcon();
console.log('\nIcon generated successfully!');
console.log('Now run: png-to-ico icon.png > icon.ico');
