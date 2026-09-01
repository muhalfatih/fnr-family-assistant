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

// Draw Executive Family Vault & Ledger Emblem (No initials - Pure App Identity)
function drawVaultIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = (x - cx) / (w / 2);
  const dy = (y - cy) / (h / 2);

  // Rounded squircle mask
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
  const rBg = Math.round(9 + glow * 12);
  const gBg = Math.round(9 + glow * 40);
  const bBg = Math.round(11 + glow * 25);

  // Normalize coordinates for Shield & Vault Dial
  const sx = (x - cx) / (w * 0.36);
  const sy = (y - (cy + h * 0.02)) / (h * 0.36);

  // Shield Geometry: Top point at (0, -0.85), corners at (+-0.75, -0.55), sides down to (+-0.75, 0.05), converging to (0, 0.85)
  let inShield = false;
  let onShieldBorder = false;

  const topSlope = 0.4;
  const inTop = sy >= -0.85 + Math.abs(sx) * topSlope && sy <= -0.55 && Math.abs(sx) <= 0.75;
  const inMid = sy > -0.55 && sy <= 0.1 && Math.abs(sx) <= 0.75;
  const bottomCurve = 0.1 + Math.pow(Math.abs(sx) / 0.75, 1.35) * 0.75;
  const inBottom = sy > 0.1 && sy <= bottomCurve && Math.abs(sx) <= 0.75;

  if (inTop || inMid || inBottom) {
    inShield = true;
    // Check border edge
    const nearTop = Math.abs(sy - (-0.85 + Math.abs(sx) * topSlope)) < 0.08;
    const nearSide = Math.abs(Math.abs(sx) - 0.75) < 0.08 && sy >= -0.55 && sy <= 0.1;
    const nearBottom = Math.abs(sy - bottomCurve) < 0.09 && Math.abs(sx) <= 0.75;
    if (nearTop || nearSide || nearBottom) {
      onShieldBorder = true;
    }
  }

  if (onShieldBorder) {
    return [16, 185, 129, 255]; // Emerald-500 (#10b981)
  }

  if (inShield) {
    // Vault Dial Geometry centered at (0, 0) inside the shield
    const vx = sx;
    const vy = sy - 0.02;
    const vDist = Math.sqrt(vx * vx + vy * vy);

    // 1. Center Core Glowing Node (Family Hearth / AI Core)
    if (vDist <= 0.12) {
      return [52, 211, 153, 255]; // Emerald-400 (#34d399)
    }

    // 2. Inner Ring Dial (Financial Vault Safe)
    if (vDist >= 0.24 && vDist <= 0.32) {
      return [255, 255, 255, 255]; // Crisp Platinum White (#ffffff)
    }

    // 3. Cardinal Vault Pins (Top, Bottom, Left, Right)
    const isTopPin = Math.abs(vx) <= 0.05 && vy >= -0.56 && vy <= -0.32;
    const isBottomPin = Math.abs(vx) <= 0.05 && vy >= 0.32 && vy <= 0.56;
    const isLeftPin = Math.abs(vy) <= 0.05 && vx >= -0.56 && vx <= -0.32;
    const isRightPin = Math.abs(vy) <= 0.05 && vx >= 0.32 && vx <= 0.56;

    if (isTopPin || isBottomPin || isLeftPin || isRightPin) {
      return [16, 185, 129, 255]; // Emerald-500 (#10b981)
    }

    // 4. Diagonal Node Accents
    const diagDist1 = Math.abs(vx - vy) / Math.SQRT2;
    const diagDist2 = Math.abs(vx + vy) / Math.SQRT2;
    const isDiag1 = diagDist1 <= 0.04 && vDist >= 0.33 && vDist <= 0.48;
    const isDiag2 = diagDist2 <= 0.04 && vDist >= 0.33 && vDist <= 0.48;

    if (isDiag1 || isDiag2) {
      return [228, 228, 231, 255]; // Zinc-200 Silver (#e4e4e7)
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

// SVG Vector Icon for Family Vault & Ledger
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="120" fill="#09090b"/>
  <rect x="8" y="8" width="496" height="496" rx="112" stroke="#27272a" stroke-width="6"/>
  
  <!-- Outer Executive Shield Geometry -->
  <path d="M256 72L408 128V264C408 360 256 440 256 440C256 440 104 360 104 264V128L256 72Z" fill="#18181b" stroke="#10b981" stroke-width="12" stroke-linejoin="round"/>
  
  <!-- Inner Vault Lock & Family Vault Ring -->
  <circle cx="256" cy="248" r="68" stroke="#ffffff" stroke-width="12"/>
  <circle cx="256" cy="248" r="28" fill="#10b981"/>
  
  <!-- Upward Wealth & Vault Nodes -->
  <path d="M256 140V180" stroke="#10b981" stroke-width="10" stroke-linecap="round"/>
  <path d="M256 316V356" stroke="#10b981" stroke-width="10" stroke-linecap="round"/>
  <path d="M148 248H188" stroke="#10b981" stroke-width="10" stroke-linecap="round"/>
  <path d="M324 248H364" stroke="#10b981" stroke-width="10" stroke-linecap="round"/>
  
  <!-- Diagonal Vault Spokes -->
  <path d="M180 172L208 200" stroke="#e4e4e7" stroke-width="8" stroke-linecap="round"/>
  <path d="M332 324L304 296" stroke="#e4e4e7" stroke-width="8" stroke-linecap="round"/>
  <path d="M332 172L304 200" stroke="#e4e4e7" stroke-width="8" stroke-linecap="round"/>
  <path d="M180 324L208 296" stroke="#e4e4e7" stroke-width="8" stroke-linecap="round"/>
</svg>`;

const publicDir = path.join(process.cwd(), "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192 PNG
const png192 = generatePNG(192, 192, drawVaultIcon);
fs.writeFileSync(path.join(publicDir, "icon-192.png"), png192);
console.log("✓ Generated public/icon-192.png (Family Vault Emblem)");

// Generate 512x512 PNG
const png512 = generatePNG(512, 512, drawVaultIcon);
fs.writeFileSync(path.join(publicDir, "icon-512.png"), png512);
console.log("✓ Generated public/icon-512.png (Family Vault Emblem)");

// Generate apple-touch-icon.png (180x180)
const appleIcon = generatePNG(180, 180, drawVaultIcon);
fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), appleIcon);
console.log("✓ Generated public/apple-touch-icon.png (Family Vault Emblem)");

// Generate 48x48 PNG for favicon.ico
const png48 = generatePNG(48, 48, drawVaultIcon);
const ico = generateICO(png48);
fs.writeFileSync(path.join(publicDir, "favicon.ico"), ico);
console.log("✓ Generated public/favicon.ico (Family Vault Emblem)");

// Generate icon.svg
fs.writeFileSync(path.join(publicDir, "icon.svg"), svgIcon);
console.log("✓ Generated public/icon.svg (Family Vault Emblem)");
