import { getProductByHandle } from "../../../lib/shopify.js";

export async function GET(_req, context) {
  const params = await context.params;
  const rawHandle = params?.handle;
  const storefrontDomain =
    process.env.SHOPIFY_STORE_DOMAIN ||
    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const storefrontToken =
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  let handle = rawHandle || "";

  try {
    handle = decodeURIComponent(rawHandle || "").trim();

    if (!storefrontDomain || !storefrontToken) {
      return Response.json(
        {
          error: "Missing Shopify Storefront API configuration",
          missing: {
            SHOPIFY_STORE_DOMAIN: !process.env.SHOPIFY_STORE_DOMAIN,
            SHOPIFY_STOREFRONT_ACCESS_TOKEN:
              !process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
            NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN:
              !process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN,
            NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN:
              !process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN,
          },
        },
        { status: 500 }
      );
    }

    if (!handle) {
      return Response.json({ error: "Missing product handle." }, { status: 400 });
    }

    const product = await getProductByHandle(handle);

    if (!product) {
      return Response.json({ error: "Product not found." }, { status: 404 });
    }

    return Response.json(product);
  } catch (error) {
    const handleForLog = handle || rawHandle || "<missing-handle>";
    console.error("Product API failed for handle:", handleForLog, error);
    const details = error instanceof Error ? error.message : String(error);
    return Response.json(
      {
        error: "Failed to fetch product.",
        handle: handleForLog,
        details,
      },
      { status: 500 }
    );
  }
}
