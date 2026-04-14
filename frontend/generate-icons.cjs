// Generate PNG icons for PWA - pure Node.js, zero dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcB]);
}

function createPNG(size, bgR, bgG, bgB) {
  // Create rounded-rect icon with "?" symbol
  const cx = size / 2, cy = size / 2, r = size * 0.15;
  const raw = Buffer.alloc(size * (size * 4 + 1)); // RGBA + filter byte per row
  let off = 0;
  for (let y = 0; y < size; y++) {
    raw[off++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      // Rounded rect check
      let inside = true;
      if (x < r && y < r) inside = Math.hypot(x - r, y - r) <= r;
      else if (x > size - r && y < r) inside = Math.hypot(x - (size - r), y - r) <= r;
      else if (x < r && y > size - r) inside = Math.hypot(x - r, y - (size - r)) <= r;
      else if (x > size - r && y > size - r) inside = Math.hypot(x - (size - r), y - (size - r)) <= r;

      if (!inside) { raw[off++] = 0; raw[off++] = 0; raw[off++] = 0; raw[off++] = 0; continue; }

      // Draw "?" mark
      const dx = x - cx, dy = y - cy * 0.85;
      const dist = Math.hypot(dx, dy);
      const qSize = size * 0.28;
      const dotY = cy * 1.35;
      const dotDist = Math.hypot(x - cx, y - dotY);

      // "?" circle arc (top part)
      const arcR = qSize, arcW = size * 0.06;
      const angle = Math.atan2(dy, dx);
      const onArc = Math.abs(dist - arcR) < arcW && angle < Math.PI * 0.6 && angle > -Math.PI;
      // Stem
      const onStem = Math.abs(x - cx) < arcW && y > cy * 0.85 && y < cy * 1.15;
      // Dot
      const onDot = dotDist < size * 0.04;

      if (onArc || onStem || onDot) {
        raw[off++] = 0x22; raw[off++] = 0xC5; raw[off++] = 0x5E; raw[off++] = 255; // green
      } else {
        raw[off++] = bgR; raw[off++] = bgG; raw[off++] = bgB; raw[off++] = 255;
      }
    }
  }

  const deflated = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', deflated), pngChunk('IEND', Buffer.alloc(0))]);
}

const publicDir = path.join(__dirname, 'public');
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createPNG(192, 12, 50, 56));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createPNG(512, 12, 50, 56));
console.log('PWA icons generated (192x192, 512x512)');
