import { describe, it, expect, vi, afterEach } from "vitest";
import { POST, OPTIONS } from "../../app/api/checkout/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("OPTIONS /api/checkout", () => {
  it("returns 204 for preflight", async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(204);
  });
});

describe("POST /api/checkout", () => {
  it("returns 400 when variantId is missing", async () => {
    const response = await POST(makeRequest({ quantity: 1 }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/variantId/i);
  });

  it("returns 500 when Shopify env vars are not set", async () => {
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "");
    vi.stubEnv("SHOPIFY_STOREFRONT_TOKEN", "");
    const response = await POST(makeRequest({ variantId: "12345" }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toMatch(/shopify/i);
  });

  it("uses GID as-is when variantId starts with gid://", async () => {
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "myshop.myshopify.com");
    vi.stubEnv("SHOPIFY_STOREFRONT_TOKEN", "token123");

    const mockCheckoutUrl = "https://myshop.myshopify.com/checkouts/xyz";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            cartCreate: {
              cart: { id: "cart1", checkoutUrl: mockCheckoutUrl },
              userErrors: [],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const response = await POST(
      makeRequest({ variantId: "gid://shopify/ProductVariant/99999" })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.checkoutUrl).toBe(mockCheckoutUrl);

    // Verify GID was passed as-is
    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(sentBody.variables.input.lines[0].merchandiseId).toBe(
      "gid://shopify/ProductVariant/99999"
    );
  });

  it("prefixes numeric variantId with GID format", async () => {
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "myshop.myshopify.com");
    vi.stubEnv("SHOPIFY_STOREFRONT_TOKEN", "token123");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            cartCreate: {
              cart: { id: "cart1", checkoutUrl: "https://checkout.example.com" },
              userErrors: [],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await POST(makeRequest({ variantId: "12345", quantity: 2 }));
    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(sentBody.variables.input.lines[0].merchandiseId).toBe(
      "gid://shopify/ProductVariant/12345"
    );
  });

  it("returns 400 when Shopify returns userErrors", async () => {
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "myshop.myshopify.com");
    vi.stubEnv("SHOPIFY_STOREFRONT_TOKEN", "token123");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            cartCreate: {
              cart: null,
              userErrors: [{ field: "merchandiseId", message: "Invalid variant" }],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const response = await POST(makeRequest({ variantId: "bad-id" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/cartCreate error/i);
    expect(body.details).toBeDefined();
  });

  it("returns 500 when Shopify returns no checkoutUrl", async () => {
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "myshop.myshopify.com");
    vi.stubEnv("SHOPIFY_STOREFRONT_TOKEN", "token123");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { cartCreate: { cart: { id: "c1", checkoutUrl: null }, userErrors: [] } },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const response = await POST(makeRequest({ variantId: "12345" }));
    expect(response.status).toBe(500);
  });

  it("returns 500 when fetch throws a network error", async () => {
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "myshop.myshopify.com");
    vi.stubEnv("SHOPIFY_STOREFRONT_TOKEN", "token123");

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network failure"));

    const response = await POST(makeRequest({ variantId: "12345" }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Network failure");
  });

  it("passes customAttributes to the Shopify cart line", async () => {
    vi.stubEnv("SHOPIFY_STORE_DOMAIN", "myshop.myshopify.com");
    vi.stubEnv("SHOPIFY_STOREFRONT_TOKEN", "token123");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            cartCreate: {
              cart: { id: "c1", checkoutUrl: "https://checkout.example.com" },
              userErrors: [],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const attrs = [{ key: "Design", value: "dragon" }];
    await POST(makeRequest({ variantId: "42", customAttributes: attrs }));
    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(sentBody.variables.input.lines[0].attributes).toEqual(attrs);
  });
});
