import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GARMENT_SIZE_CHARTS, garmentSizes, garmentMeasurementSummary, availableGarmentSize } from "../lib/garment-size-charts.ts";

test("every garment size has numeric measurements", () => {
  for (const garment of Object.keys(GARMENT_SIZE_CHARTS)) {
    for (const size of garmentSizes(garment)) {
      const summary = garmentMeasurementSummary(garment, size);
      assert.match(summary, /\d/, `${garment} ${size}`);
      assert.doesNotMatch(summary, /undefined|NaN/, `${garment} ${size}`);
    }
  }
});

test("switching garments always lands on an offered size", () => {
  for (const from of Object.keys(GARMENT_SIZE_CHARTS)) for (const size of garmentSizes(from)) for (const to of Object.keys(GARMENT_SIZE_CHARTS)) {
    const active = availableGarmentSize(to, size);
    assert.ok(garmentSizes(to).includes(active), `${from} ${size} -> ${to}`);
    if (garmentSizes(to).includes(size)) assert.equal(active, size);
  }
  assert.equal(availableGarmentSize("t-shirts", "XS"), "S");
});

test("browser-shipped size chart code names no supplier", () => {
  const source = readFileSync(new URL("../lib/garment-size-charts.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /made\s?official|madeofficialsite|\bMADE\b/i);
});
