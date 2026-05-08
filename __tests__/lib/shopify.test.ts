import { describe, it, expect, vi, afterEach } from "vitest";

// Both shopify.ts and shopify.js exist; import from the TypeScript file explicitly
// to test the typed module with its fallback domain constant.
import { normalizeVariantId, getShopifyCartAddUrl, SHOPIFY_STORE_DOMAIN } from "../../app/lib/shopify.ts";

describe("normalizeVariantId (shopify.ts)", () => {
  it("returns empty string for null", () => {
    expect(normalizeVariantId(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(normalizeVariantId(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(normalizeVariantId("")).toBe("");
  });

  it("strips GID prefix and returns numeric id", () => {
    expect(normalizeVariantId("gid://shopify/ProductVariant/12345")).toBe("12345");
  });

  it("returns plain numeric id as-is", () => {
    expect(normalizeVariantId("47766570074286")).toBe("47766570074286");
  });

  it("returns arbitrary string as-is when not a GID", () => {
    expect(normalizeVariantId("Custom")).toBe("Custom");
  });
});

describe("getShopifyCartAddUrl (shopify.ts)", () => {
  it("returns a URL containing /cart/add", () => {
    const url = getShopifyCartAddUrl();
    expect(url).toContain("/cart/add");
  });

  it("returns a URL containing the default fallback domain", () => {
    // Without env vars set, the module uses "yourdtfplug.com" as fallback
    const url = getShopifyCartAddUrl();
    expect(url).toContain("yourdtfplug.com");
  });

  it("always starts with https://", () => {
    // shopify.ts unconditionally prefixes https:// (unlike shopify.js)
    const url = getShopifyCartAddUrl();
    expect(url.startsWith("https://")).toBe(true);
  });

  it("strips http:// or https:// from the store domain before building URL", () => {
    // The returned URL should not have double protocol like https://https://
    const url = getShopifyCartAddUrl();
    expect(url).not.toContain("https://https://");
    expect(url).not.toContain("https://http://");
  });
});

describe("SHOPIFY_STORE_DOMAIN constant (shopify.ts)", () => {
  it("defaults to yourdtfplug.com when no env vars are set", () => {
    // shopify.ts uses env vars at module load time; without them it falls back
    expect(SHOPIFY_STORE_DOMAIN).toBeTruthy();
    // The default fallback is 'yourdtfplug.com'
    expect(SHOPIFY_STORE_DOMAIN).toBe("yourdtfplug.com");
  });
});
