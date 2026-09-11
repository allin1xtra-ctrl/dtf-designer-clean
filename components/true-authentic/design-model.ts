export type Layer = {
  id: string; type: "image" | "text"; name: string; x: number; y: number;
  width: number; height: number; rotation: number; text?: string; color?: string;
  font?: string; source?: string; pixelsWide?: number;
};
export type Design = { version: 1; width: number; height: number; layers: Layer[] };
export const FONTS = ["Arial", "Georgia", "Impact", "Courier New"];
export const EMPTY_DESIGN: Design = { version: 1, width: 12, height: 12, layers: [] };
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PROJECT_BYTES = 25 * 1024 * 1024;
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const finite = (n: unknown, min: number, max: number): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;

export function parseDesign(raw: string): Design {
  if (raw.length > MAX_PROJECT_BYTES) throw new Error("Project is too large. Maximum size is 25 MB.");
  const design = JSON.parse(raw) as Design;
  if (!design || design.version !== 1 || !finite(design.width, 2, 20) || !finite(design.height, 2, 20) ||
      !Array.isArray(design.layers) || design.layers.length > 20) throw new Error("This is not a supported True Authentic project.");
  const ids = new Set<string>();
  for (const layer of design.layers) {
    if (!layer || typeof layer.id !== "string" || ids.has(layer.id) || typeof layer.name !== "string" || layer.name.length > 200 ||
        !finite(layer.x, 0, 100) || !finite(layer.y, 0, 100) || !finite(layer.width, 1, 100) || !finite(layer.height, 1, 100) ||
        !finite(layer.rotation, -180, 180)) throw new Error("The project contains an invalid layer.");
    ids.add(layer.id);
    if (layer.type === "image") {
      if (typeof layer.source !== "string" || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(layer.source) ||
          !finite(layer.pixelsWide, 1, 12000)) throw new Error("The project contains an unsupported image.");
    } else if (layer.type === "text") {
      if (typeof layer.text !== "string" || layer.text.length > 80 || !/^#[0-9a-f]{6}$/i.test(layer.color || "") ||
          !FONTS.includes(layer.font || "")) throw new Error("The project contains invalid text settings.");
    } else throw new Error("Unsupported layer type.");
  }
  return design;
}

export function layerWarnings(design: Design): string[] {
  const warnings: string[] = [];
  for (const layer of design.layers) {
    const radians = layer.rotation * Math.PI / 180;
    const w = layer.width / 100 * design.width;
    const h = layer.height / 100 * design.height;
    const halfW = (Math.abs(Math.cos(radians) * w) + Math.abs(Math.sin(radians) * h)) / 2;
    const halfH = (Math.abs(Math.sin(radians) * w) + Math.abs(Math.cos(radians) * h)) / 2;
    const x = layer.x / 100 * design.width, y = layer.y / 100 * design.height;
    if (x - halfW < -0.001 || x + halfW > design.width + 0.001 || y - halfH < -0.001 || y + halfH > design.height + 0.001)
      warnings.push(`${layer.name}: part of this layer is outside the print area and will be cropped.`);
    if (layer.type === "image" && layer.pixelsWide && layer.pixelsWide / w < 150)
      warnings.push(`${layer.name}: low image resolution at this size (${Math.round(layer.pixelsWide / w)} pixels per inch). Use a larger original or reduce its size.`);
  }
  return warnings;
}
