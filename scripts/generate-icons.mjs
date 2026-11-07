import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const START = { r: 209, g: 127, b: 247 };
const END = { r: 157, g: 214, b: 252 };

function iconSvg(size) {
  const radius = Math.round(size * 0.22);
  const pad = Math.round(size * 0.22);
  const cardWidth = size - pad * 2;
  const cardHeight = Math.round(cardWidth * 1.05);
  const cardX = pad;
  const cardY = Math.round((size - cardHeight) / 2);
  const line = Math.max(2, Math.round(size * 0.06));
  const lineX = cardX + Math.round(cardWidth * 0.18);
  const lineW = Math.round(cardWidth * 0.64);
  const shortW = Math.round(cardWidth * 0.42);
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgb(${START.r},${START.g},${START.b})"/>
          <stop offset="100%" stop-color="rgb(${END.r},${END.g},${END.b})"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${radius}" fill="url(#grad)"/>
      <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="${Math.round(size * 0.08)}" fill="white"/>
      <rect x="${lineX}" y="${cardY + Math.round(cardHeight * 0.28)}" width="${lineW}" height="${line}" rx="${line}" fill="rgb(202,160,250)"/>
      <rect x="${lineX}" y="${cardY + Math.round(cardHeight * 0.48)}" width="${shortW}" height="${line}" rx="${line}" fill="rgb(157,214,252)"/>
      <rect x="${lineX}" y="${cardY + Math.round(cardHeight * 0.68)}" width="${Math.round(lineW * 0.8)}" height="${line}" rx="${line}" fill="rgb(202,160,250)"/>
    </svg>
  `;
}

const targets = [
  path.join(root, 'public', 'icons'),
  path.join(root, 'branding'),
  path.join(root, 'store-assets'),
];

for (const dir of targets) fs.mkdirSync(dir, { recursive: true });

for (const size of [16, 32, 48, 128, 512]) {
  const png = await sharp(Buffer.from(iconSvg(size))).png().toBuffer();
  await sharp(png).toFile(path.join(root, 'public', 'icons', `icon${size}.png`));
  await sharp(png).toFile(path.join(root, 'branding', `icon${size}.png`));
  if (size === 128 || size === 512) {
    await sharp(png).toFile(path.join(root, 'store-assets', `icon-${size}.png`));
  }
  console.log(`icon ${size}`);
}

console.log('Icons written to public/icons, branding, and store-assets.');
