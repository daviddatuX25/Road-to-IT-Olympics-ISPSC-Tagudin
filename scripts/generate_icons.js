/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require('sharp');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const logoPath = path.join(publicDir, 'logo.svg');

async function generate() {
  try {
    // 192x192
    await sharp(logoPath)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));
    console.log('Generated icon-192.png');

    // 512x512
    await sharp(logoPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));
    console.log('Generated icon-512.png');

    // 512x512 maskable with dark theme background #0f0f0f
    await sharp(logoPath)
      .resize(384, 384) // pad slightly for safe maskable area
      .extend({
        top: 64,
        bottom: 64,
        left: 64,
        right: 64,
        background: { r: 15, g: 15, b: 15, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, 'icon-512-maskable.png'));
    console.log('Generated icon-512-maskable.png');
  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

generate();
