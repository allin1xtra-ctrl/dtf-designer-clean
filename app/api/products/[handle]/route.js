import { getProductByHandle } from "../../../lib/shopify.js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req, context) {
  const params = await context.params;
  const rawHandle = params?.handle;
  const storefrontDomain =
    process.env.SHOPIFY_STORE_DOMAIN ||
    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const storefrontToken =
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  const shouldDebug =
    req.nextUrl.searchParams.get("debugAI") === "1" ||
    req.nextUrl.searchParams.get("debugAI") === "true" ||
    req.nextUrl.searchParams.get("debugProduct") === "1" ||
    req.nextUrl.searchParams.get("debugProduct") === "true";
  let handle = rawHandle || "";

  try {
    handle = decodeURIComponent(rawHandle || "").trim();

    if (!storefrontDomain || !storefrontToken) {
      return NextResponse.json(
        { error: "Missing Shopify Storefront API configuration" },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    if (!handle) {
      return NextResponse.json(
        { error: "Missing product handle." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const product = await getProductByHandle(handle);

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404, headers: NO_STORE_HEADERS });
    }

    if (shouldDebug) {
      console.log("[PRODUCT DEBUG] Product by handle route", {
        requestedHandle: handle,
        returnedProductHandle: product.handle,
        returnedProductTitle: product.title,
        rawPrintLocations: product.metafield?.value || "",
      });
    }

    return NextResponse.json(product, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Product API failed for handle:", handle, error);

    return NextResponse.json(
      {
        error: "Product API request failed",
        message: error?.message || String(error),
        debug: {
          tokenSet: Boolean(storefrontToken),
          tokenSource: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
            ? "SHOPIFY_STOREFRONT_ACCESS_TOKEN"
            : process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN
              ? "NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN"
              : "missing",
          domain: storefrontDomain || "missing",
        },
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
