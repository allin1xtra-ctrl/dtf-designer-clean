import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { createClient } from "@supabase/supabase-js";

import type { AdminCustomizerStore, AdminMediaAsset, AdminMockupProduct, AdminMockupVariant, AdminTemplate } from "./types";
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

function now() {
  return new Date().toISOString();
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
    mockupVariants: Array.isArray(input?.mockupVariants) ? input.mockupVariants : fallback.mockupVariants,
    mediaAssets: Array.isArray(input?.mediaAssets) ? input.mediaAssets : fallback.mediaAssets,
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
