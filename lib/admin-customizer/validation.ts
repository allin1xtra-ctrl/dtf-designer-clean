import type { AdminMockupProduct, AdminMockupVariant, AdminTemplate, AdminTemplateLayer } from "./types";

const ALLOWED_LAYER_TYPES = ["text", "image", "shape", "placeholder", "image-placeholder"];
const ALLOWED_TEMPLATE_MODES = ["apparel", "transfer", "both"];

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "item";
}

export function sanitizeText(value: unknown, fallback = "") {
  return String(value ?? fallback).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 500);
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(min, Math.min(max, numberValue));
}

export function normalizeTemplateLayer(input: unknown, index: number): AdminTemplateLayer | null {
  if (!input || typeof input !== "object") return null;
  const layer = input as Partial<AdminTemplateLayer>;
  if (!ALLOWED_LAYER_TYPES.includes(String(layer.type))) return null;

  return {
    id: sanitizeText(layer.id, `layer-${index}`) || `layer-${index}`,
    type: layer.type as AdminTemplateLayer["type"],
    name: sanitizeText(layer.name, `Layer ${index + 1}`) || `Layer ${index + 1}`,
    text: typeof layer.text === "string" ? sanitizeText(layer.text) : undefined,
    sourceUrl: typeof layer.sourceUrl === "string" && layer.sourceUrl.startsWith("http") ? layer.sourceUrl : undefined,
    sourceName: typeof layer.sourceName === "string" ? sanitizeText(layer.sourceName) : undefined,
    x: finiteNumber(layer.x, 50, 0, 100),
    y: finiteNumber(layer.y, 50, 0, 100),
    width: finiteNumber(layer.width, 45, 1, 100),
    height: finiteNumber(layer.height, 18, 1, 100),
    rotation: finiteNumber(layer.rotation, 0, -180, 180),
    opacity: finiteNumber(layer.opacity, 1, 0, 1),
    color: /^#[0-9a-f]{6}$/i.test(String(layer.color || "")) ? String(layer.color) : "#67e8f9",
    fontId: typeof layer.fontId === "string" ? sanitizeText(layer.fontId) : undefined,
    fontFamily: sanitizeText(layer.fontFamily, "Inter, Arial, sans-serif") || "Inter, Arial, sans-serif",
    fontSize: finiteNumber(layer.fontSize, 28, 6, 180),
    textAlign: layer.textAlign === "left" || layer.textAlign === "right" ? layer.textAlign : "center",
    locked: Boolean(layer.locked),
    hidden: Boolean(layer.hidden),
    zIndex: Math.round(finiteNumber(layer.zIndex, index, -100, 100)),
    canDelete: layer.canDelete !== false,
    canMove: layer.canMove !== false,
    canResize: layer.canResize !== false,
  };
}

export function normalizeTemplate(input: unknown, existing?: AdminTemplate): { value?: AdminTemplate; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== "object") return { errors: ["Template payload must be an object."] };
  const body = input as Partial<AdminTemplate>;
  const now = new Date().toISOString();
  const name = sanitizeText(body.name, existing?.name || "");
  const category = sanitizeText(body.category, existing?.category || "Logos");
  const productType = sanitizeText(body.productType, existing?.productType || "t-shirt");
  const mode = ALLOWED_TEMPLATE_MODES.includes(String(body.mode)) ? body.mode as AdminTemplate["mode"] : existing?.mode || "apparel";
  const layers = Array.isArray(body.layers)
    ? body.layers.map(normalizeTemplateLayer).filter((layer): layer is AdminTemplateLayer => Boolean(layer))
    : existing?.layers || [];

  if (!name) errors.push("Template name is required.");
  if (!category) errors.push("Template category is required.");
  if (!productType) errors.push("Product type is required.");
  if (layers.length === 0) errors.push("At least one editable layer is required.");

  if (errors.length) return { errors };

  const id = sanitizeText(body.id, existing?.id || crypto.randomUUID());
  const slug = slugify(body.slug || name);
  return {
    errors,
    value: {
      id,
      name,
      slug,
      category,
      productType,
      mode,
      targetView: typeof body.targetView === "string" ? sanitizeText(body.targetView) : existing?.targetView,
      description: sanitizeText(body.description, existing?.description || ""),
      previewImageUrl: typeof body.previewImageUrl === "string" && body.previewImageUrl.startsWith("http") ? body.previewImageUrl : existing?.previewImageUrl,
      thumbnailUrl: typeof body.thumbnailUrl === "string" && body.thumbnailUrl.startsWith("http") ? body.thumbnailUrl : existing?.thumbnailUrl,
      tags: Array.isArray(body.tags) ? body.tags.map((tag) => sanitizeText(tag)).filter(Boolean).slice(0, 20) : existing?.tags || [],
      layers,
      active: body.active ?? existing?.active ?? true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    },
  };
}

export function normalizeMockupProduct(input: unknown, existing?: AdminMockupProduct) {
  const errors: string[] = [];
  if (!input || typeof input !== "object") return { errors: ["Product payload must be an object."] };
  const body = input as Partial<AdminMockupProduct>;
  const now = new Date().toISOString();
  const name = sanitizeText(body.name, existing?.name || "");
  const type = sanitizeText(body.type, existing?.type || "t-shirt");
  if (!name) errors.push("Product type name is required.");
  if (!type) errors.push("Product type is required.");
  if (errors.length) return { errors };
  return {
    errors,
    value: {
      id: sanitizeText(body.id, existing?.id || crypto.randomUUID()),
      name,
      slug: slugify(body.slug || name),
      type,
      active: body.active ?? existing?.active ?? true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    },
  };
}

export function normalizeMockupVariant(input: unknown, existing?: AdminMockupVariant) {
  const errors: string[] = [];
  if (!input || typeof input !== "object") return { errors: ["Variant payload must be an object."] };
  const body = input as Partial<AdminMockupVariant>;
  const now = new Date().toISOString();
  const productId = sanitizeText(body.productId, existing?.productId || "");
  const colorName = sanitizeText(body.colorName, existing?.colorName || "");
  if (!productId) errors.push("Variant productId is required.");
  if (!colorName) errors.push("Color name is required.");
  if (errors.length) return { errors };
  return {
    errors,
    value: {
      id: sanitizeText(body.id, existing?.id || crypto.randomUUID()),
      productId,
      colorName,
      colorSlug: slugify(body.colorSlug || colorName),
      frontImageUrl: typeof body.frontImageUrl === "string" ? sanitizeText(body.frontImageUrl) : existing?.frontImageUrl,
      backImageUrl: typeof body.backImageUrl === "string" ? sanitizeText(body.backImageUrl) : existing?.backImageUrl,
      leftSleeveImageUrl: typeof body.leftSleeveImageUrl === "string" ? sanitizeText(body.leftSleeveImageUrl) : existing?.leftSleeveImageUrl,
      rightSleeveImageUrl: typeof body.rightSleeveImageUrl === "string" ? sanitizeText(body.rightSleeveImageUrl) : existing?.rightSleeveImageUrl,
      neckTagImageUrl: typeof body.neckTagImageUrl === "string" ? sanitizeText(body.neckTagImageUrl) : existing?.neckTagImageUrl,
      additionalViews: body.additionalViews && typeof body.additionalViews === "object" ? body.additionalViews : existing?.additionalViews || {},
      printAreas: body.printAreas && typeof body.printAreas === "object" ? body.printAreas : existing?.printAreas || {},
      hasBakedPrintGuide: body.hasBakedPrintGuide && typeof body.hasBakedPrintGuide === "object" ? body.hasBakedPrintGuide : existing?.hasBakedPrintGuide || {},
      editableViews: body.editableViews && typeof body.editableViews === "object" ? body.editableViews : existing?.editableViews || {},
      active: body.active ?? existing?.active ?? true,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    },
  };
}
