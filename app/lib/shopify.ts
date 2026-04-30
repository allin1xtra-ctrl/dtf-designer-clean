export const SHOPIFY_STORE_DOMAIN =
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
  process.env.SHOPIFY_STORE_DOMAIN ||
  "yourdtfplug.com";

export function getShopifyCartAddUrl() {
  return `https://${SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, "")}/cart/add`;
}

export function normalizeVariantId(variant?: string | null) {
  if (!variant) return "";

  if (variant.startsWith("gid://shopify/ProductVariant/")) {
    return variant.split("/").pop() || "";
  }

  return variant;
}

// TEMP: Stub for getProducts to unblock build, replace with real logic
export async function getProducts() {
  return [];
}
