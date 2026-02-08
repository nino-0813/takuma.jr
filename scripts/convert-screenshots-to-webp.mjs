import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const imagesDir = join(__dirname, '..', 'public', 'images');

// 練習 = 14.22.58 → 1.webp / 試合 = 14.22.47 → 2.webp
const mapping = [
  { in: 'スクリーンショット 2026-02-08 14.22.58.png', out: '1.webp' }, // 練習
  { in: 'スクリーンショット 2026-02-08 14.22.47.png', out: '2.webp' }, // 試合
];

for (const { in: inputName, out: outputName } of mapping) {
  const input = join(imagesDir, inputName);
  const output = join(imagesDir, outputName);
  await sharp(input).webp({ quality: 88 }).toFile(output);
  console.log(`${inputName} → ${outputName}`);
}
