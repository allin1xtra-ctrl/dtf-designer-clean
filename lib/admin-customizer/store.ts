import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { AdminCustomizerStore, AdminMediaAsset, AdminMockupProduct, AdminMockupVariant, AdminTemplate } from "./types";
import { normalizeMockupProduct, normalizeMockupVariant, normalizeTemplate } from "./validation";

const STORE_PATH = path.join(process.cwd(), "data", "admin-customizer-store.json");

const PRODUCT_TYPE_SEEDS = [
  ["T-Shirts", "t-shirts"],
  ["Hoodies", "hoodies"],
  ["Jackets", "jackets"],
  ["Sweaters", "sweaters"],
  ["Shorts", "shorts"],
  ["Sweatpants", "sweatpants"],
  ["Jerseys", "jerseys"],
  ["Hats", "hats"],
  ["Cups", "cups"],
] as const;

function now() {
  return new Date().toISOString();
}

function createEmptyStore(): AdminCustomizerStore {
  const timestamp = now();
  return {
    templates: [],
    mockupProducts: PRODUCT_TYPE_SEEDS.map(([name, type]) => ({
      id: type,
      name,
      slug: type,
      type,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    mockupVariants: [],
    mediaAssets: [],
    updatedAt: timestamp,
  };
}

async function ensureStoreDirectory() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
}

export async function readAdminCustomizerStore(): Promise<AdminCustomizerStore> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<AdminCustomizerStore>;
    const fallback = createEmptyStore();
    return {
      templates: Array.isArray(parsed.templates) ? parsed.templates : fallback.templates,
      mockupProducts: Array.isArray(parsed.mockupProducts) && parsed.mockupProducts.length ? parsed.mockupProducts : fallback.mockupProducts,
      mockupVariants: Array.isArray(parsed.mockupVariants) ? parsed.mockupVariants : fallback.mockupVariants,
      mediaAssets: Array.isArray(parsed.mediaAssets) ? parsed.mediaAssets : fallback.mediaAssets,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : fallback.updatedAt,
    };
  } catch {
    return createEmptyStore();
  }
}

async function writeAdminCustomizerStore(store: AdminCustomizerStore) {
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
  const nextVariants = existing
    ? store.mockupVariants.map((variant) => (variant.id === existing.id ? normalized.value as AdminMockupVariant : variant))
    : [normalized.value, ...store.mockupVariants];
  await writeAdminCustomizerStore({ ...store, mockupVariants: nextVariants });
  return { errors: [], value: normalized.value };
}

export async function addMediaAsset(asset: AdminMediaAsset) {
  const store = await readAdminCustomizerStore();
  await writeAdminCustomizerStore({ ...store, mediaAssets: [asset, ...store.mediaAssets] });
  return asset;
}
