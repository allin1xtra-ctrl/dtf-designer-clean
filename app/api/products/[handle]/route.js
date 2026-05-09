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
  let handle;

  try {
    handle = decodeURIComponent(rawHandle || "").trim();

    if (!storefrontDomain || !storefrontToken) {
      return NextResponse.json(
        { error: "Missing Shopify Storefront API configuration" },
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
    console.error("Product API failed for handle:", handle || rawHandle, error);
    return Response.json(
      { error: "Failed to fetch product." },
      { status: 500 }
    );
  }
}
