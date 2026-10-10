#!/usr/bin/env node
/**
 * make-icons.mjs — generate the PWA raster icons.
 *
 * A tiny dependency-free PNG encoder (zlib is built into Node). The icon is
 * drawn procedurally so there is no binary blob in the repository and no image
 * library to install.
 *
 *   node scripts/make-icons.mjs
 *
 * Android will not offer "Install app" without a 192px and a 512px PNG, so
 * these are required for the offline install story, not decoration.
 */
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = resolve(fileURLToPath(new URL("../app/assets", import.meta.url)));

/* ------------------------------------------------------------- PNG writer */

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** rgba: Uint8Array of size*size*4 */
function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 6;    // colour type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Filter type 0 per scanline
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy
      ? Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1)
      : raw.set(rgba.subarray(y * size * 4, (y + 1) * size * 4), y * (size * 4 + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------- drawing */

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];

/** Signed-distance rounded rectangle; negative inside. */
function sdRoundRect(px, py, cx, cy, halfW, halfH, radius) {
  const qx = Math.abs(px - cx) - (halfW - radius);
  const qy = Math.abs(py - cy) - (halfH - radius);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - radius;
}

function drawIcon(size) {
  const data = Buffer.alloc(size * size * 4);
  const S = size;
  const bg = [15, 17, 21];        // #0f1115
  const gradA = [28, 95, 214];    // #1c5fd6
  const gradB = [123, 63, 228];   // #7b3fe4

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x + 0.5) / S;
      const v = (y + 0.5) / S;

      // Outer squircle: the canvas itself
      let d = sdRoundRect(u * S, v * S, S / 2, S / 2, S / 2, S / 2, S * 0.22);

      // Inner panel with the gradient
      const dPanel = sdRoundRect(u * S, v * S, S / 2, S * 0.46, S * 0.32, S * 0.30, S * 0.07);

      // A simple downward chevron, the "descend into the details" mark
      const cyN = v * S - S * 0.44;
      const cxN = u * S - S * 0.5;
      const chev = Math.abs(Math.abs(cxN) - Math.max(0, cyN) * 0.95);
      const inChevV = Math.abs(cyN) < S * 0.11 && Math.abs(cxN) < S * 0.15;
      const dChev = inChevV ? chev - S * 0.022 : 1e9;

      // The base bar
      const dBar = sdRoundRect(u * S, v * S, S / 2, S * 0.72, S * 0.21, S * 0.016, S * 0.016);

      let colour = bg;
      if (dPanel < 0) {
        const t = clamp((u + v) / 2);
        colour = mix(gradA, gradB, t);
        if (dChev < 0) colour = [255, 255, 255];
        if (dBar < 0) colour = mix(colour, [255, 255, 255], 0.55);
      }

      // 1px-ish antialiasing at the outer edge
      const alpha = clamp((0.5 - d) * S * 0.9) / 1;
      const i = (y * S + x) * 4;
      data[i] = clamp(colour[0]);
      data[i + 1] = clamp(colour[1]);
      data[i + 2] = clamp(colour[2]);
      data[i + 3] = clamp(alpha * 255);
    }
  }
  return data;
}

for (const size of [192, 512]) {
  const png = encodePNG(size, drawIcon(size));
  const file = resolve(OUT_DIR, `icon-${size}.png`);
  writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes)`);
}