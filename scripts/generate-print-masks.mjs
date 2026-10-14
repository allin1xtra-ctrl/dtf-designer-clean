// Builds one printable-area mask per approved garment image.
// White/opaque = printable fabric. Waistbands, wrist cuffs, neck tape and
// everything off the garment are transparent. Run: node scripts/generate-print-masks.mjs
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const zones = JSON.parse(await readFile("lib/print-zones.json", "utf8"));
const source = await readFile("lib/premium-mockup-assets.ts", "utf8");
const assets = JSON.parse(source.slice(source.indexOf("["), source.lastIndexOf("]") + 1));
const SIZE = 627;

for (const asset of assets) {
  const zone = zones[asset.productId]?.[asset.view];
  if (!zone) throw new Error(`No print zone for ${asset.productId} ${asset.view}`);
  const { data } = await sharp("public" + asset.url).ensureAlpha().resize(SIZE, SIZE).extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const px = (x + 0.5) / SIZE * 100, py = (y + 0.5) / SIZE * 100;
    let printable = data[y * SIZE + x] > 128;
    for (const [x0, y0, x1, y1] of zone.exclude ?? []) if (px >= x0 && px <= x1 && py >= y0 && py <= y1) printable = false;
    if (zone.region) {
      const [cx, cy, rx, ry] = zone.region.ellipse;
      if (py < zone.region.minY || ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 > 1) printable = false;
    }
    const i = (y * SIZE + x) * 4;
    out[i] = out[i + 1] = out[i + 2] = 255; out[i + 3] = printable ? 255 : 0;
  }
  const target = path.join("public/premium-mockups/v1/print-masks", asset.productId, `${asset.colorId}-${asset.view}.png`);
  await mkdir(path.dirname(target), { recursive: true });
  await sharp(out, { raw: { width: SIZE, height: SIZE, channels: 4 } }).blur(0.6).png({ compressionLevel: 9, palette: true }).toFile(target);
}
console.log(`Generated ${assets.length} print masks.`);
