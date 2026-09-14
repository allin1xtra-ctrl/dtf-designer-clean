import { Design, MAX_PROJECT_BYTES, parseDesign } from "./design-model";
import type { AdminMockupProduct, AdminMockupVariant } from "../../lib/admin-customizer/types";

export const VIEWS = ["front", "back", "leftSleeve", "rightSleeve", "neckTag"] as const;
export type View = typeof VIEWS[number];
export const VIEW_LABELS: Record<View, string> = { front: "Front", back: "Back", leftSleeve: "Left sleeve", rightSleeve: "Right sleeve", neckTag: "Neck" };
export type ApparelProject = { version: 2; productId: string; variantId: string; views: Record<View, Design> };
export type Catalog = { products: AdminMockupProduct[]; variants: AdminMockupVariant[] };
const IMAGE_FIELDS = { front: "frontImageUrl", back: "backImageUrl", leftSleeve: "leftSleeveImageUrl", rightSleeve: "rightSleeveImageUrl", neckTag: "neckTagImageUrl" } as const;
const AREAS = {
  front: { x: 50, y: 50.5, width: 38, height: 61, widthInches: 12, heightInches: 16 },
  back: { x: 49, y: 48.5, width: 48, height: 59, widthInches: 12, heightInches: 16 },
  leftSleeve: { x: 51, y: 50, width: 30, height: 42, widthInches: 3.5, heightInches: 12 },
  rightSleeve: { x: 49, y: 50, width: 30, height: 42, widthInches: 3.5, heightInches: 12 },
  neckTag: { x: 50, y: 43, width: 28, height: 17, widthInches: 4, heightInches: 2.5 },
};
export const FALLBACK_CATALOG: Catalog = {
  products: [{ id: "t-shirts", name: "T-Shirts", slug: "t-shirts", type: "t-shirts", views: [...VIEWS], active: true, createdAt: "", updatedAt: "" }],
  variants: ["black", "white", "heather-grey", "royal-blue", "red"].map(color => ({
    id: `builtin-${color}`, productId: "t-shirts", colorName: color.replaceAll("-", " "), colorSlug: color,
    frontImageUrl: `/customizer-preview/mockups/${color}-front.png`, backImageUrl: `/customizer-preview/mockups/${color}-back.png`,
    leftSleeveImageUrl: `/customizer-preview/mockups/${color}-left-sleeve.png`, rightSleeveImageUrl: `/customizer-preview/mockups/${color}-right-sleeve.png`,
    neckTagImageUrl: `/customizer-preview/mockups/${color}-neck-tag.png`, additionalViews: {}, printAreas: AREAS,
    hasBakedPrintGuide: {}, editableViews: {}, active: true, createdAt: "", updatedAt: "",
  })),
};
export function apparelCatalog(value: Catalog): Catalog {
  const products = value.products.filter(p => p.active && /shirt|hood|jersey|jacket|sweater|apparel/i.test(`${p.type} ${p.name}`));
  const ids = new Set(products.map(p => p.id));
  const variants = value.variants.filter(v => v.active && ids.has(v.productId));
  // Only expose garments that have an actual configured mockup set.
  return variants.length ? { products: products.filter(p => variants.some(v => v.productId === p.id)), variants } : FALLBACK_CATALOG;
}
export function printArea(variant: AdminMockupVariant | undefined, view: View) {
  const area = { ...AREAS[view] };
  const configured = variant?.printAreas?.[view];
  for (const key of Object.keys(area) as (keyof typeof area)[]) {
    const value = configured?.[key];
    const physical = key === "widthInches" || key === "heightInches";
    const min = physical ? 2 : key === "x" || key === "y" ? 0 : 1;
    if (typeof value === "number" && Number.isFinite(value) && value >= min && value <= (physical ? 20 : 100)) area[key] = value;
  }
  return area;
}
export function mockupUrl(variant: AdminMockupVariant | undefined, view: View) {
  const url = variant?.[IMAGE_FIELDS[view]] || variant?.additionalViews?.[view];
  return url && (url.startsWith("/customizer-preview/") || /^https:\/\//i.test(url)) ? url : undefined;
}
export function emptyProject(variant = FALLBACK_CATALOG.variants[0]): ApparelProject {
  const createView = (view: View): Design => {
    const area = printArea(variant, view);
    return { version: 1, width: area.widthInches, height: area.heightInches, layers: [] };
  };
  return { version: 2, productId: variant.productId, variantId: variant.id, views: { front: createView("front"), back: createView("back"), leftSleeve: createView("leftSleeve"), rightSleeve: createView("rightSleeve"), neckTag: createView("neckTag") } };
}
export function changeGarment(project: ApparelProject, variant: AdminMockupVariant): ApparelProject {
  const views = { ...project.views };
  for (const view of VIEWS) {
    const previous = views[view];
    const area = printArea(variant, view);
    const width = area.widthInches, height = area.heightInches;
    // Keep each layer's physical proportions when the garment's print area changes.
    views[view] = { ...previous, width, height, layers: previous.layers.map(layer => {
      const nextWidth = layer.width * previous.width / width;
      const nextHeight = layer.height * previous.height / height;
      const scale = Math.min(1, 100 / nextWidth, 100 / nextHeight);
      return { ...layer, width: nextWidth * scale, height: nextHeight * scale };
    }) };
  }
  return { ...project, productId: variant.productId, variantId: variant.id, views };
}
export function parseProject(raw: string): ApparelProject {
  if (raw.length > MAX_PROJECT_BYTES) throw new Error("Project exceeds the 25 MB limit.");
  const value = JSON.parse(raw);
  if (value?.version === 1) return { ...emptyProject(), views: { ...emptyProject().views, front: parseDesign(raw) } };
  if (value?.version !== 2 || typeof value.productId !== "string" || typeof value.variantId !== "string" || !value.views)
    throw new Error("This is not a supported apparel project.");
  const views = Object.fromEntries(VIEWS.map(view => [view, parseDesign(JSON.stringify(value.views[view]))])) as Record<View, Design>;
  return { version: 2, productId: value.productId, variantId: value.variantId, views };
}
