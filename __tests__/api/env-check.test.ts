import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/env-check", () => {
  it("reflects missing env vars as false", async () => {
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "");
    vi.stubEnv("SHOPIFY_STOREFRONT_TOKEN", "");
    const { GET } = await import("../../app/api/env-check/route");
    const response = await GET();
    const body = await response.json();
    expect(body.SHOPIFY_STORE_DOMAIN_EXISTS).toBe(false);
    expect(body.SHOPIFY_STOREFRONT_TOKEN_EXISTS).toBe(false);
  });

  it("reflects present env vars as true", async () => {
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "myshop.myshopify.com");
    vi.stubEnv("SHOPIFY_STOREFRONT_TOKEN", "abc123");
    const { GET } = await import("../../app/api/env-check/route");
    const response = await GET();
    const body = await response.json();
    expect(body.SHOPIFY_STORE_DOMAIN_EXISTS).toBe(true);
    expect(body.SHOPIFY_STOREFRONT_TOKEN_EXISTS).toBe(true);
  });

  it("includes NODE_ENV in the response", async () => {
    const { GET } = await import("../../app/api/env-check/route");
    const response = await GET();
    const body = await response.json();
    expect("NODE_ENV" in body).toBe(true);
  });

  it("includes VERCEL_ENV in the response when set", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const { GET } = await import("../../app/api/env-check/route");
    const response = await GET();
    const body = await response.json();
    expect(body.VERCEL_ENV).toBe("preview");
  });
});
