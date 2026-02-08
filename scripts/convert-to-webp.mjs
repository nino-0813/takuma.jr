import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const imagesDir = join(__dirname, '..', 'public', 'images');

await mkdir(imagesDir, { recursive: true });
const files = await readdir(imagesDir);
const pngs = files.filter((f) => f.endsWith('.png'));

for (const name of pngs) {
  const base = name.replace(/\.png$/i, '');
  const input = join(imagesDir, name);
  const output = join(imagesDir, `${base}.webp`);
  await sharp(input).webp({ quality: 85 }).toFile(output);
  console.log(`Converted ${name} -> ${base}.webp`);
}
