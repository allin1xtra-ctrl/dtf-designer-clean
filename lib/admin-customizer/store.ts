import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { createClient } from "@supabase/supabase-js";

import type {
  AdminCustomizerStore,
  AdminMediaAsset,
  AdminMockupProduct,
  AdminMockupVariant,
  AdminTemplate,
  CustomGhost360FrameSet,
  GhostMannequinAsset,
  GhostMannequinStatus,
} from "./types";
import { normalizeMockupProduct, normalizeMockupVariant, normalizeTemplate } from "./validation";

const STORE_PATH = path.join(process.cwd(), "data", "admin-customizer-store.json");
const SUPABASE_STORE_TABLE = "admin_customizer_store";
const SUPABASE_STORE_KEY = "default";

const PRODUCT_TYPE_SEEDS = [
  { name: "T-Shirts", type: "t-shirts", views: ["front", "back", "leftSleeve", "rightSleeve", "neckTag"] },
  { name: "Hoodies", type: "hoodies", views: ["front", "back", "leftSleeve", "rightSleeve", "neckTag"] },
  { name: "Jerseys", type: "jerseys", views: ["front", "back", "leftSleeve", "rightSleeve", "neckTag"] },
  { name: "Shorts", type: "shorts", views: ["front", "back", "leftLeg", "rightLeg"] },
  { name: "Pants", type: "pants", views: ["front", "back", "leftLeg", "rightLeg"] },
  { name: "Jackets", type: "jackets", views: ["front", "back", "leftSleeve", "rightSleeve", "chest", "neckTag"] },
  { name: "Sweaters", type: "sweaters", views: ["front", "back", "leftSleeve", "rightSleeve", "neckTag"] },
] as const;

const CANONICAL_COLOR_NAMES: Record<string, string> = {
  white: "White",
  black: "Black",
  "heather-grey": "Heather Grey",
  red: "Red",
  "off-white": "Off White",
  "dark-grey": "Dark Grey",
  "dark-gray": "Dark Grey",
};

const COLOR_ORDER = ["white", "black", "heather-grey", "red", "off-white", "dark-grey"];

const IMAGE_URL_KEYS = [
  "frontImageUrl",
  "backImageUrl",
  "leftSleeveImageUrl",
  "rightSleeveImageUrl",
  "neckTagImageUrl",
] as const;

function now() {
  return new Date().toISOString();
}

function canonicalColorSlug(colorSlug: string) {
  return colorSlug === "dark-gray" ? "dark-grey" : colorSlug;
}

function canonicalColorName(colorSlug: string, fallback: string) {
  return CANONICAL_COLOR_NAMES[colorSlug] || fallback;
}

function variantCompletenessScore(variant: AdminMockupVariant) {
  const imageCount = IMAGE_URL_KEYS.reduce((total, key) => total + (variant[key] ? 1 : 0), 0);
  const additionalViewCount = Object.values(variant.additionalViews || {}).filter(Boolean).length;
  const printAreaCount = Object.keys(variant.printAreas || {}).length;
  return imageCount * 10 + additionalViewCount * 10 + printAreaCount;
}

function mergeDefinedRecord<T>(primary: Record<string, T> | undefined, secondary: Record<string, T> | undefined) {
  return {
    ...(secondary || {}),
    ...(primary || {}),
  };
}

function mergeMockupVariant(primary: AdminMockupVariant, secondary: AdminMockupVariant): AdminMockupVariant {
  const colorSlug = canonicalColorSlug(primary.colorSlug || secondary.colorSlug);
  const merged: AdminMockupVariant = {
    ...secondary,
    ...primary,
    colorSlug,
    colorName: canonicalColorName(colorSlug, primary.colorName || secondary.colorName),
    additionalViews: mergeDefinedRecord(primary.additionalViews, secondary.additionalViews),
    printAreas: mergeDefinedRecord(primary.printAreas, secondary.printAreas),
    hasBakedPrintGuide: mergeDefinedRecord(primary.hasBakedPrintGuide, secondary.hasBakedPrintGuide),
    editableViews: mergeDefinedRecord(primary.editableViews, secondary.editableViews),
    active: primary.active || secondary.active,
    createdAt: primary.createdAt < secondary.createdAt ? primary.createdAt : secondary.createdAt,
    updatedAt: primary.updatedAt > secondary.updatedAt ? primary.updatedAt : secondary.updatedAt,
  };

  for (const key of IMAGE_URL_KEYS) {
    merged[key] = primary[key] || secondary[key];
  }

  return merged;
}

function sortMockupVariants(variants: AdminMockupVariant[]) {
  return [...variants].sort((left, right) => {
    if (left.productId !== right.productId) return left.productId.localeCompare(right.productId);
    const leftOrder = COLOR_ORDER.indexOf(left.colorSlug);
    const rightOrder = COLOR_ORDER.indexOf(right.colorSlug);
    const leftRank = leftOrder === -1 ? Number.MAX_SAFE_INTEGER : leftOrder;
    const rightRank = rightOrder === -1 ? Number.MAX_SAFE_INTEGER : rightOrder;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.colorName.localeCompare(right.colorName);
  });
}

function dedupeMockupVariants(variants: AdminMockupVariant[]) {
  const byColor = new Map<string, AdminMockupVariant>();

  for (const variant of variants) {
    const colorSlug = canonicalColorSlug(variant.colorSlug);
    const normalizedVariant = {
      ...variant,
      colorSlug,
      colorName: canonicalColorName(colorSlug, variant.colorName),
    };
    const key = `${normalizedVariant.productId}:${colorSlug}`;
    const existing = byColor.get(key);
    if (!existing) {
      byColor.set(key, normalizedVariant);
      continue;
    }

    const primary = variantCompletenessScore(normalizedVariant) > variantCompletenessScore(existing) ? normalizedVariant : existing;
    const secondary = primary.id === normalizedVariant.id ? existing : normalizedVariant;
    byColor.set(key, mergeMockupVariant(primary, secondary));
  }

  return sortMockupVariants([...byColor.values()]);
}

function createEmptyStore(): AdminCustomizerStore {
  const timestamp = now();
  return {
    templates: [],
    mockupProducts: PRODUCT_TYPE_SEEDS.map(({ name, type, views }) => ({
      id: type,
      name,
      slug: type,
      type,
      views: [...views],
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    mockupVariants: [],
    mediaAssets: [],
    ghostMannequinAssets: [],
    customGhost360FrameSets: [],
    updatedAt: timestamp,
  };
}

function mergeSeedProducts(products: AdminMockupProduct[], fallbackProducts: AdminMockupProduct[]) {
  const nowTimestamp = now();
  const byType = new Map(products.map((product) => [product.type || product.slug || product.id, product]));

  const seeded = fallbackProducts.map((seed) => {
    const existing = byType.get(seed.type) || byType.get(seed.slug) || byType.get(seed.id);
    return {
      ...seed,
      ...existing,
      id: existing?.id || seed.id,
      slug: existing?.slug || seed.slug,
      type: existing?.type || seed.type,
      views: Array.isArray(existing?.views) && existing.views.length ? existing.views : seed.views,
      active: existing?.active ?? seed.active,
      createdAt: existing?.createdAt || seed.createdAt || nowTimestamp,
      updatedAt: existing?.updatedAt || seed.updatedAt || nowTimestamp,
    };
  });

  const seedTypes = new Set(fallbackProducts.map((product) => product.type));
  const legacySeedTypes = new Set(["sweatpants", "hats", "cups"]);
  const customProducts = products.filter((product) => !seedTypes.has(product.type) && !legacySeedTypes.has(product.type));
  return [...seeded, ...customProducts];
}

function normalizeStore(input: Partial<AdminCustomizerStore> | null | undefined) {
  const fallback = createEmptyStore();
  const inputProducts = Array.isArray(input?.mockupProducts) && input.mockupProducts.length ? input.mockupProducts : fallback.mockupProducts;
  return {
    templates: Array.isArray(input?.templates) ? input.templates : fallback.templates,
    mockupProducts: mergeSeedProducts(inputProducts, fallback.mockupProducts),
    mockupVariants: dedupeMockupVariants(Array.isArray(input?.mockupVariants) ? input.mockupVariants : fallback.mockupVariants),
    mediaAssets: Array.isArray(input?.mediaAssets) ? input.mediaAssets : fallback.mediaAssets,
    ghostMannequinAssets: Array.isArray(input?.ghostMannequinAssets) ? input.ghostMannequinAssets : fallback.ghostMannequinAssets,
    customGhost360FrameSets: Array.isArray(input?.customGhost360FrameSets) ? input.customGhost360FrameSets : fallback.customGhost360FrameSets,
    updatedAt: typeof input?.updatedAt === "string" ? input.updatedAt : fallback.updatedAt,
  };
}

function getSupabaseStoreConfig() {
  const url = String(process.env.ADMIN_CUSTOMIZER_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceRoleKey = String(process.env.ADMIN_CUSTOMIZER_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

function createSupabaseStoreClient() {
  const config = getSupabaseStoreConfig();
  if (!config) return null;
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function readSupabaseStore(): Promise<AdminCustomizerStore | null> {
  const supabase = createSupabaseStoreClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(SUPABASE_STORE_TABLE)
    .select("data")
    .eq("store_key", SUPABASE_STORE_KEY)
    .maybeSingle();

  if (error) throw new Error(`Admin customizer store read failed: ${error.message}`);
  return normalizeStore(data?.data as Partial<AdminCustomizerStore> | undefined);
}

async function writeSupabaseStore(store: AdminCustomizerStore) {
  const supabase = createSupabaseStoreClient();
  if (!supabase) return false;
  const nextStore = { ...store, updatedAt: now() };
  const { error } = await supabase
    .from(SUPABASE_STORE_TABLE)
    .upsert(
      {
        store_key: SUPABASE_STORE_KEY,
        data: nextStore,
        updated_at: nextStore.updatedAt,
      },
      { onConflict: "store_key" }
    );

  if (error) throw new Error(`Admin customizer store write failed: ${error.message}`);
  return true;
}

async function ensureStoreDirectory() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
}

export async function readAdminCustomizerStore(): Promise<AdminCustomizerStore> {
  const supabaseStore = await readSupabaseStore();
  if (supabaseStore) return supabaseStore;

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<AdminCustomizerStore>;
    return normalizeStore(parsed);
  } catch {
    return createEmptyStore();
  }
}

async function writeAdminCustomizerStore(store: AdminCustomizerStore) {
  if (await writeSupabaseStore(store)) return;
  await ensureStoreDirectory();
  await writeFile(STORE_PATH, `${JSON.stringify({ ...store, updatedAt: now() }, null, 2)}\n`, "utf8");
}

export async function listPublicTemplates() {
  const store = await readAdminCustomizerStore();
  return store.templates.filter((template) => template.active);
}

export async function listPublicMockups() {
  const store = await readAdminCustomizerStore();
  const activeProductIds = new Set(store.mockupProducts.filter((product) => product.active).map((product) => product.id));
  return {
    products: store.mockupProducts.filter((product) => product.active),
    variants: store.mockupVariants.filter((variant) => variant.active && activeProductIds.has(variant.productId)),
  };
}

export async function upsertTemplate(input: unknown) {
  const store = await readAdminCustomizerStore();
  const id = input && typeof input === "object" && "id" in input ? String((input as { id?: unknown }).id || "") : "";
  const existing = id ? store.templates.find((template) => template.id === id) : undefined;
  const normalized = normalizeTemplate(input, existing);
  if (!normalized.value) return normalized;
  const nextTemplates = existing
    ? store.templates.map((template) => (template.id === existing.id ? normalized.value as AdminTemplate : template))
    : [normalized.value, ...store.templates];
  await writeAdminCustomizerStore({ ...store, templates: nextTemplates });
  return { errors: [], value: normalized.value };
}

export async function deleteTemplate(id: string) {
  const store = await readAdminCustomizerStore();
  const existing = store.templates.find((template) => template.id === id);
  if (!existing) return { errors: ["Template not found."] };
  await writeAdminCustomizerStore({ ...store, templates: store.templates.filter((template) => template.id !== id) });
  return { errors: [] };
}

export async function upsertMockupProduct(input: unknown) {
  const store = await readAdminCustomizerStore();
  const id = input && typeof input === "object" && "id" in input ? String((input as { id?: unknown }).id || "") : "";
  const existing = id ? store.mockupProducts.find((product) => product.id === id) : undefined;
  const normalized = normalizeMockupProduct(input, existing);
  if (!normalized.value) return normalized;
  const nextProducts = existing
    ? store.mockupProducts.map((product) => (product.id === existing.id ? normalized.value as AdminMockupProduct : product))
    : [normalized.value, ...store.mockupProducts];
  await writeAdminCustomizerStore({ ...store, mockupProducts: nextProducts });
  return { errors: [], value: normalized.value };
}

export async function upsertMockupVariant(input: unknown) {
  const store = await readAdminCustomizerStore();
  const id = input && typeof input === "object" && "id" in input ? String((input as { id?: unknown }).id || "") : "";
  const existing = id ? store.mockupVariants.find((variant) => variant.id === id) : undefined;
  const normalized = normalizeMockupVariant(input, existing);
  if (!normalized.value) return normalized;
  const normalizedVariant = normalized.value as AdminMockupVariant;
  const existingColor = store.mockupVariants.find((variant) => (
    variant.id !== normalizedVariant.id &&
    variant.productId === normalizedVariant.productId &&
    canonicalColorSlug(variant.colorSlug) === canonicalColorSlug(normalizedVariant.colorSlug)
  ));
  const mergedVariant = existingColor ? mergeMockupVariant(normalizedVariant, existingColor) : normalizedVariant;
  const nextVariants = existing
    ? store.mockupVariants.map((variant) => (variant.id === existing.id ? mergedVariant : variant))
    : [mergedVariant, ...store.mockupVariants];
  await writeAdminCustomizerStore({ ...store, mockupVariants: dedupeMockupVariants(nextVariants) });
  return { errors: [], value: mergedVariant };
}

export async function addMediaAsset(asset: AdminMediaAsset) {
  const store = await readAdminCustomizerStore();
  await writeAdminCustomizerStore({ ...store, mediaAssets: [asset, ...store.mediaAssets] });
  return asset;
}

export async function addGhostMannequinAsset(asset: GhostMannequinAsset) {
  const store = await readAdminCustomizerStore();
  await writeAdminCustomizerStore({ ...store, ghostMannequinAssets: [asset, ...store.ghostMannequinAssets] });
  return asset;
}

export async function updateGhostMannequinAsset(
  id: string,
  updates: Partial<Omit<GhostMannequinAsset, "id" | "createdAt">> & { status?: GhostMannequinStatus }
) {
  const store = await readAdminCustomizerStore();
  const existing = store.ghostMannequinAssets.find((asset) => asset.id === id);
  if (!existing) return { errors: ["Ghost mannequin asset not found."] };
  const updated: GhostMannequinAsset = {
    ...existing,
    ...updates,
    updatedAt: now(),
  };
  await writeAdminCustomizerStore({
    ...store,
    ghostMannequinAssets: store.ghostMannequinAssets.map((asset) => (asset.id === id ? updated : asset)),
  });
  return { errors: [], value: updated };
}

export async function addCustomGhost360FrameSet(frameSet: CustomGhost360FrameSet) {
  const store = await readAdminCustomizerStore();
  await writeAdminCustomizerStore({ ...store, customGhost360FrameSets: [frameSet, ...store.customGhost360FrameSets] });
  return frameSet;
}

export async function updateCustomGhost360FrameSet(
  id: string,
  updates: Partial<Omit<CustomGhost360FrameSet, "id" | "createdAt">>
) {
  const store = await readAdminCustomizerStore();
  const existing = store.customGhost360FrameSets.find((frameSet) => frameSet.id === id);
  if (!existing) return { errors: ["Custom Ghost 360 frame set not found."] };
  const updated: CustomGhost360FrameSet = {
    ...existing,
    ...updates,
    updatedAt: now(),
  };
  await writeAdminCustomizerStore({
    ...store,
    customGhost360FrameSets: store.customGhost360FrameSets.map((frameSet) => (frameSet.id === id ? updated : frameSet)),
  });
  return { errors: [], value: updated };
}

export async function repairAdminMockupVariants() {
  const store = await readAdminCustomizerStore();
  const nextVariants = dedupeMockupVariants(store.mockupVariants);
  await writeAdminCustomizerStore({ ...store, mockupVariants: nextVariants });
  return {
    variantsBefore: store.mockupVariants.length,
    variantsAfter: nextVariants.length,
    variants: nextVariants,
  };
}
