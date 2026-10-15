import test from "node:test";
import assert from "node:assert/strict";
import { detectBackground, removeBackground, removalLooksUseful } from "../components/true-authentic/background-removal.ts";

/** Builds an RGBA image filled with `fill`, then lets `paint` color individual pixels. */
function image(width, height, fill, paint = () => null) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const [r, g, b, a = 255] = paint(x, y) ?? fill; const i = (y * width + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
  }
  return data;
}
const alphaAt = (data, width, x, y) => data[(y * width + x) * 4 + 3];
const WHITE = [255, 255, 255], BLACK = [17, 17, 17], RED = [160, 20, 30];

// A white square background with a black ring; inside the ring is white "lettering".
const ring = (x, y) => {
  const d = Math.max(Math.abs(x - 50), Math.abs(y - 50));
  if (d >= 20 && d <= 30) return BLACK;
  return null;
};

test("detects a solid white background", () => {
  const result = detectBackground(image(100, 100, WHITE, ring), 100, 100);
  assert.equal(result.kind, "solid"); assert.equal(result.color.white, true);
});
test("detects a solid colored background", () => {
  const result = detectBackground(image(100, 100, RED, ring), 100, 100);
  assert.equal(result.kind, "solid"); assert.equal(result.color.white, false);
});
test("transparent PNGs are not offered background removal", () => {
  const data = image(100, 100, [0, 0, 0, 0], (x, y) => ring(x, y) ? [...BLACK, 255] : null);
  assert.equal(detectBackground(data, 100, 100).kind, "transparent");
});
test("busy photo edges are not treated as a solid background", () => {
  const data = image(100, 100, WHITE, (x, y) => [(x * 37) % 256, (y * 59) % 256, ((x + y) * 23) % 256]);
  assert.equal(detectBackground(data, 100, 100).kind, "none");
});
test("removes only the outer background and keeps white inside the design", () => {
  const data = image(100, 100, WHITE, ring);
  const detection = detectBackground(data, 100, 100);
  const result = removeBackground(data, 100, 100, detection.color);
  assert.equal(alphaAt(data, 100, 0, 0), 0);          // outer corner cleared
  assert.equal(alphaAt(data, 100, 10, 50), 0);        // outer white cleared
  assert.equal(alphaAt(data, 100, 50, 50), 255);      // enclosed white kept
  assert.equal(alphaAt(data, 100, 25, 50), 255);      // black ring kept
  assert.ok(removalLooksUseful(result));
});
test("design pixels are kept exactly as uploaded", () => {
  const data = image(100, 100, WHITE, ring), original = data.slice();
  removeBackground(data, 100, 100, detectBackground(data, 100, 100).color);
  for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) if (ring(x, y) || Math.max(Math.abs(x - 50), Math.abs(y - 50)) < 20) {
    const i = (y * 100 + x) * 4;
    assert.deepEqual([...data.slice(i, i + 4)], [...original.slice(i, i + 4)]);
  }
});
test("tolerates JPEG-style noise in the background", () => {
  const data = image(80, 80, WHITE, (x, y) => ring(x + 10, y + 10) ?? [250 - ((x * 7 + y * 3) % 12), 252 - ((x + y) % 9), 248 + ((x * y) % 7)]);
  const detection = detectBackground(data, 80, 80);
  assert.equal(detection.kind, "solid");
  removeBackground(data, 80, 80, detection.color);
  assert.equal(alphaAt(data, 80, 2, 2), 0); assert.equal(alphaAt(data, 80, 40, 40), 255);
});
test("softens a mixed edge pixel instead of leaving a white halo", () => {
  const data = image(30, 30, WHITE, (x, y) => (x >= 10 && x < 20 && y >= 10 && y < 20) ? BLACK : (x === 9 && y >= 10 && y < 20) ? [225, 225, 225] : null);
  removeBackground(data, 30, 30, { r: 255, g: 255, b: 255, white: true });
  const a = alphaAt(data, 30, 9, 15);
  assert.ok(a > 0 && a < 255, `edge alpha ${a}`);
  assert.equal(alphaAt(data, 30, 15, 15), 255);
});
test("an image that is all background is not reported as a useful cleanup", () => {
  const data = image(40, 40, WHITE);
  assert.equal(removalLooksUseful(removeBackground(data, 40, 40, { r: 255, g: 255, b: 255, white: true })), false);
});
