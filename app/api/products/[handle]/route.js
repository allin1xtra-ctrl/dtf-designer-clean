import { getProductByHandle } from "../../../lib/shopify.js";
import { NextResponse } from "next/server";

export async function GET(_req, context) {
  const params = await context.params;
  const rawHandle = params?.handle;
  const storefrontDomain =
    process.env.SHOPIFY_STORE_DOMAIN ||
    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const storefrontToken =
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  const tokenSource = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
    ? "SHOPIFY_STOREFRONT_ACCESS_TOKEN"
    : process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN
      ? "NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN"
      : "missing";
  console.error("[DEBUG] Shopify Storefront env:", {
    tokenSource,
    hasToken: Boolean(storefrontToken),
    tokenLength: storefrontToken?.length || 0,
    domain: storefrontDomain || "missing",
  });
  let handle = rawHandle || "";

  try {
    handle = decodeURIComponent(rawHandle || "").trim();

    if (!storefrontDomain || !storefrontToken) {
      return NextResponse.json(
        { error: "Missing Shopify Storefront API configuration" },
        { status: 500 }
      );
    }

    if (!handle) {
      return NextResponse.json({ error: "Missing product handle." }, { status: 400 });
    }

    const product = await getProductByHandle(handle);

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Product API failed for handle:", handle, error);

    return NextResponse.json(
      {
        error: "Product API request failed",
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
