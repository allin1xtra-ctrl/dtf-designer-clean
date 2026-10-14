/**
 * Reference garment size charts transcribed from the blank supplier's public
 * charts. Source pages are recorded in docs/garment-size-chart-sources.md and
 * are deliberately kept out of this file because it ships to customers' browsers.
 * Use as customer-facing fit guidance only. Do not use for artwork DPI,
 * print masks or manufacturing tolerances without measuring physical stock.
 * Customer-facing product names must not identify the supplier.
 * All dimensions are inches. "chest" is published flat garment width,
 * while pant/short "waist" is the published waist measurement.
 */
export const GARMENT_SIZE_CHARTS = {
  "t-shirts": {
    measurements: ["chest", "length", "sleeve"],
    sizes: {
      S: { chest: 17.5, length: 27, sleeve: 8 },
      M: { chest: 19.5, length: 29, sleeve: 8.25 },
      L: { chest: 21.5, length: 31, sleeve: 8.5 },
      XL: { chest: 23.5, length: 33, sleeve: 8.75 },
      "2XL": { chest: 25.5, length: 35, sleeve: 9 },
    },
  },
  hoodies: {
    measurements: ["chest", "length", "sleeve"],
    sizes: {
      XS: { chest: 20, length: 27, sleeve: 25 },
      S: { chest: 21.5, length: 28, sleeve: 25.5 },
      M: { chest: 23, length: 29, sleeve: 26 },
      L: { chest: 25, length: 30, sleeve: 26.5 },
      XL: { chest: 27, length: 31, sleeve: 27 },
      "2XL": { chest: 29, length: 32, sleeve: 29 },
    },
  },
  pants: {
    measurements: ["waist", "length", "inseam"],
    sizes: {
      XS: { waist: 26.5, length: 38.5, inseam: 28.25 },
      S: { waist: 28.5, length: 40, inseam: 29.25 },
      M: { waist: 30.5, length: 41.5, inseam: 30.25 },
      L: { waist: 32.5, length: 43, inseam: 31.25 },
      XL: { waist: 34.5, length: 44.5, inseam: 32.25 },
      "2XL": { waist: 36.5, length: 46, inseam: 33.25 },
    },
  },
  shorts: {
    measurements: ["waist", "length", "inseam"],
    sizes: {
      XS: { waist: 27, length: 10.5, inseam: 8 },
      S: { waist: 29, length: 11.125, inseam: 8 },
      M: { waist: 31, length: 11.75, inseam: 8 },
      L: { waist: 33, length: 12.375, inseam: 8 },
      XL: { waist: 35, length: 13, inseam: 8 },
      "2XL": { waist: 37, length: 13.625, inseam: 8 },
    },
  },
} as const;
export type SizeGarment = keyof typeof GARMENT_SIZE_CHARTS;
export function garmentSizes(garment: SizeGarment): string[] {
  return Object.keys(GARMENT_SIZE_CHARTS[garment].sizes);
}
/** Returns the size if the garment offers it, otherwise the closest offered size. */
export function availableGarmentSize(garment: SizeGarment, size: string): string {
  const sizes = garmentSizes(garment);
  if (sizes.includes(size)) return size;
  const order = ["XS", "S", "M", "L", "XL", "2XL"];
  const wanted = order.indexOf(size);
  return [...sizes].sort((a, b) => Math.abs(order.indexOf(a) - wanted) - Math.abs(order.indexOf(b) - wanted))[0];
}
export function garmentMeasurementSummary(garment: SizeGarment, size: string): string {
  const chart = GARMENT_SIZE_CHARTS[garment];
  const values = (chart.sizes as Record<string, Record<string, number>>)[size];
  if (!values) return "";
  return chart.measurements.map(key => `${key}: ${values[key]} in`).join(" · ");
}
