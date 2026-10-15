/**
 * Background detection and removal for uploaded artwork.
 *
 * Works only on the outer background: it starts from the image edges and clears pixels
 * that match the background color and are connected to an edge. Matching colors inside
 * the design (white lettering, enclosed shapes) are left untouched. Everything runs on
 * raw RGBA pixels, so it is free, deterministic and never redraws the artwork.
 */

export type BackgroundColor = { r: number; g: number; b: number; white: boolean };
export type BackgroundDetection =
  | { kind: "transparent" }
  | { kind: "none" }
  | { kind: "solid"; color: BackgroundColor; edgeShare: number };
export type RemovalResult = { removedShare: number; softenedPixels: number };

/** Colors closer than this (RGB distance, 0–441) count as background. Tolerates JPEG noise. */
export const BACKGROUND_TOLERANCE = 40;
/** Pixels just past the tolerance on the background edge get a soft, anti-aliased edge. */
export const EDGE_SOFTNESS = 32;
/** Largest image cleaned in the browser (about 5000 × 5000 pixels). */
export const MAX_CLEAN_PIXELS = 25_000_000;

const distance = (data: ArrayLike<number>, index: number, color: BackgroundColor) => {
  const dr = data[index] - color.r, dg = data[index + 1] - color.g, db = data[index + 2] - color.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

function edgeIndices(width: number, height: number, limit = 4000): number[] {
  const perimeter = 2 * (width + height);
  const step = Math.max(1, Math.floor(perimeter / limit));
  const indices: number[] = [];
  for (let x = 0; x < width; x += step) { indices.push(x); indices.push((height - 1) * width + x); }
  for (let y = 0; y < height; y += step) { indices.push(y * width); indices.push(y * width + width - 1); }
  return indices;
}

/**
 * Looks at the image edges. Reports "transparent" when the edges already have transparency,
 * "solid" when most of the edge is one color, otherwise "none".
 */
export function detectBackground(data: ArrayLike<number>, width: number, height: number): BackgroundDetection {
  if (width < 3 || height < 3) return { kind: "none" };
  const edges = edgeIndices(width, height);
  let transparent = 0;
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  for (const pixel of edges) {
    const i = pixel * 4;
    if (data[i + 3] < 250) { transparent++; continue; }
    const key = (data[i] >> 4) << 8 | (data[i + 1] >> 4) << 4 | (data[i + 2] >> 4);
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count++; bucket.r += data[i]; bucket.g += data[i + 1]; bucket.b += data[i + 2];
    buckets.set(key, bucket);
  }
  if (transparent / edges.length > 0.05) return { kind: "transparent" };
  let top: { count: number; r: number; g: number; b: number } | undefined;
  for (const bucket of buckets.values()) if (!top || bucket.count > top.count) top = bucket;
  if (!top) return { kind: "none" };
  const r = Math.round(top.r / top.count), g = Math.round(top.g / top.count), b = Math.round(top.b / top.count);
  const color: BackgroundColor = { r, g, b, white: r > 230 && g > 230 && b > 230 };
  let matching = 0;
  for (const pixel of edges) if (data[pixel * 4 + 3] >= 250 && distance(data, pixel * 4, color) <= BACKGROUND_TOLERANCE) matching++;
  const edgeShare = matching / edges.length;
  return edgeShare >= 0.6 ? { kind: "solid", color, edgeShare } : { kind: "none" };
}

/**
 * Clears the background connected to the image edges, in place.
 * Pixels inside the design are never changed; only a one-pixel ring next to the cleared
 * area is softened so edges do not show a halo of the old background color.
 */
export function removeBackground(data: Uint8ClampedArray, width: number, height: number, color: BackgroundColor,
  tolerance = BACKGROUND_TOLERANCE, softness = EDGE_SOFTNESS): RemovalResult {
  const total = width * height;
  if (total > MAX_CLEAN_PIXELS) throw new Error("This image is too large to clean here. Please upload a transparent PNG instead.");
  const removed = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0, tail = 0;
  const visit = (pixel: number) => {
    if (removed[pixel]) return;
    const i = pixel * 4;
    if (data[i + 3] === 0 || distance(data, i, color) <= tolerance) { removed[pixel] = 1; queue[tail++] = pixel; }
  };
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  while (head < tail) {
    const pixel = queue[head++], x = pixel % width;
    if (x > 0) visit(pixel - 1);
    if (x < width - 1) visit(pixel + 1);
    if (pixel >= width) visit(pixel - width);
    if (pixel < total - width) visit(pixel + width);
  }
  let softened = 0;
  for (let pixel = 0; pixel < total; pixel++) {
    if (removed[pixel]) continue;
    const x = pixel % width;
    const touches = (x > 0 && removed[pixel - 1] === 1) || (x < width - 1 && removed[pixel + 1] === 1) ||
      (pixel >= width && removed[pixel - width] === 1) || (pixel < total - width && removed[pixel + width] === 1);
    if (!touches) continue;
    const i = pixel * 4, d = distance(data, i, color);
    if (d >= tolerance + softness) continue;
    const keep = Math.max(0.05, (d - tolerance) / softness);
    // Un-mix the old background color from the edge pixel, then fade it.
    data[i] = (data[i] - color.r * (1 - keep)) / keep;
    data[i + 1] = (data[i + 1] - color.g * (1 - keep)) / keep;
    data[i + 2] = (data[i + 2] - color.b * (1 - keep)) / keep;
    data[i + 3] = data[i + 3] * keep;
    removed[pixel] = 2; softened++;
  }
  let cleared = 0;
  for (let pixel = 0; pixel < total; pixel++) if (removed[pixel] === 1) { data[pixel * 4 + 3] = 0; cleared++; }
  return { removedShare: cleared / total, softenedPixels: softened };
}

/** True when the cleanup removed a believable background: not nothing, and not the whole image. */
export function removalLooksUseful(result: RemovalResult) {
  return result.removedShare >= 0.01 && result.removedShare <= 0.97;
}
