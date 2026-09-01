import fs from "fs";
import path from "path";
import zlib from "zlib";

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generatePNG(width, height, drawFn) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk("IHDR", ihdrData);

  // Raw Scanlines
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk("IDAT", compressedData);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw Executive F&R Icon: Deep Zinc background with subtle emerald/indigo glow and clean monogram badge
function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = (x - cx) / (w / 2);
  const dy = (y - cy) / (h / 2);
  const distSq = dx * dx + dy * dy;

  // Rounded squircle mask
  const radius = 0.88;
  const cornerDist = Math.pow(Math.abs(dx), 4) + Math.pow(Math.abs(dy), 4);
  if (cornerDist > 0.85) {
    return [0, 0, 0, 0]; // Transparent outside squircle
  }

  // Border ring
  if (cornerDist > 0.78) {
    return [39, 39, 42, 255]; // Zinc-800 border (#27272a)
  }

  // Background gradient: Dark Zinc-950 (#09090b) with subtle top-center emerald glow
  const glow = Math.max(0, 1 - Math.sqrt(dx * dx + (dy + 0.3) * (dy + 0.3)) * 0.9);
  const rBg = Math.round(9 + glow * 10);
  const gBg = Math.round(9 + glow * 35);
  const bBg = Math.round(11 + glow * 25);

  // Inner Shield / Emblem Geometry
  const nx = (x - cx) / (w * 0.32);
  const ny = (y - cy) / (h * 0.32);

  // Draw Shield outline: Top flat, bottom curve
  const inShield =
    Math.abs(nx) <= 1.0 &&
    ny >= -0.9 &&
    (ny <= 0.2 || (ny - 0.2) * (ny - 0.2) + nx * nx <= 1.0);

  const onShieldBorder =
    inShield &&
    (Math.abs(nx) >= 0.82 ||
      ny <= -0.72 ||
      (ny > 0.1 && (ny - 0.2) * (ny - 0.2) + nx * nx >= 0.68));

  if (onShieldBorder) {
    return [16, 185, 129, 255]; // Emerald-500 (#10b981)
  }

  // Monogram / Central symbol inside shield
  if (inShield) {
    // Left 'F' bar: vertical bar from ny -0.5 to 0.4 at nx -0.45 to -0.25
    const isFVert = nx >= -0.5 && nx <= -0.3 && ny >= -0.5 && ny <= 0.45;
    const isFTop = nx >= -0.5 && nx <= 0.1 && ny >= -0.5 && ny <= -0.32;
    const isFMid = nx >= -0.5 && nx <= -0.05 && ny >= -0.15 && ny <= 0.02;

    // Right 'R' bar: vertical bar at nx 0.05 to 0.25
    const isRVert = nx >= 0.05 && nx <= 0.25 && ny >= -0.5 && ny <= 0.45;
    const isRTop = nx >= 0.05 && nx <= 0.55 && ny >= -0.5 && ny <= -0.32;
    const isRMid = nx >= 0.05 && nx <= 0.55 && ny >= -0.15 && ny <= 0.02;
    const isRLoopRight = nx >= 0.35 && nx <= 0.55 && ny >= -0.5 && ny <= 0.02;
    const isRLeg = nx >= 0.15 && nx <= 0.55 && ny >= 0.0 && ny <= 0.45 && Math.abs(nx - ny * 0.9 - 0.1) < 0.18;

    if (isFVert || isFTop || isFMid || isRVert || isRTop || isRMid || isRLoopRight || isRLeg) {
      return [255, 255, 255, 255]; // Crisp white lettering
    }

    // Inside shield background
    return [24, 24, 27, 255]; // Zinc-900 (#18181b)
  }

  return [rBg, gBg, bBg, 255];
}

// Generate ICO format wrapping PNG
function generateICO(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(1, 4); // Number of images = 1

  const dirEntry = Buffer.alloc(16);
  dirEntry[0] = 48; // Width
  dirEntry[1] = 48; // Height
  dirEntry[2] = 0; // Colors (0 = >=256)
  dirEntry[3] = 0; // Reserved
  dirEntry.writeUInt16LE(1, 4); // Color planes
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel
  dirEntry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
  dirEntry.writeUInt32LE(22, 12); // Offset to image data (6 + 16 = 22)

  return Buffer.concat([header, dirEntry, pngBuffer]);
}

// SVG Vector Icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="128" fill="#09090b"/>
  <rect x="8" y="8" width="496" height="496" rx="120" stroke="#27272a" stroke-width="8"/>
  <path d="M256 96L384 144V272C384 352 256 416 256 416C256 416 128 352 128 272V144L256 96Z" fill="#18181b" stroke="#10b981" stroke-width="12" stroke-linejoin="round"/>
  <path d="M192 192H240M192 240H228M192 192V320" stroke="#ffffff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M284 192H324C335 192 344 201 344 212C344 223 335 232 324 232H284M284 192V320M284 232L340 320" stroke="#ffffff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const publicDir = path.join(process.cwd(), "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192 PNG
const png192 = generatePNG(192, 192, drawIcon);
fs.writeFileSync(path.join(publicDir, "icon-192.png"), png192);
console.log("✓ Generated public/icon-192.png");

// Generate 512x512 PNG
const png512 = generatePNG(512, 512, drawIcon);
fs.writeFileSync(path.join(publicDir, "icon-512.png"), png512);
console.log("✓ Generated public/icon-512.png");

// Generate apple-touch-icon.png (180x180)
const appleIcon = generatePNG(180, 180, drawIcon);
fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), appleIcon);
console.log("✓ Generated public/apple-touch-icon.png");

// Generate 48x48 PNG for favicon.ico
const png48 = generatePNG(48, 48, drawIcon);
const ico = generateICO(png48);
fs.writeFileSync(path.join(publicDir, "favicon.ico"), ico);
console.log("✓ Generated public/favicon.ico");

// Generate icon.svg
fs.writeFileSync(path.join(publicDir, "icon.svg"), svgIcon);
console.log("✓ Generated public/icon.svg");
