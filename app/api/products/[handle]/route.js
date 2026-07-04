import { cleanEnv, getProductByHandle } from "../../../lib/shopify.js";
import { readAdminCustomizerStore } from "../../../../lib/admin-customizer/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function normalizeProductId(productId) {
  const trimmed = String(productId || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("gid://shopify/Product/")) return trimmed;
  if (/^\d+$/.test(trimmed)) return `gid://shopify/Product/${trimmed}`;
  return trimmed;
}

function productIdAliases(productId) {
  const normalized = normalizeProductId(productId);
  const numeric = normalized.startsWith("gid://shopify/Product/") ? normalized.split("/").pop() : "";
  return new Set([String(productId || ""), normalized, numeric].filter(Boolean));
}

async function getCustomGhost360FrameSets(product) {
  const store = await readAdminCustomizerStore();
  const aliases = productIdAliases(product?.id);
  return (store.customGhost360FrameSets || [])
    .filter((frameSet) => {
      const frameSetProductId = normalizeProductId(frameSet.productId || "");
      return (
        frameSet.enabled &&
        frameSet.frames?.length > 0 &&
        (
          aliases.has(frameSetProductId) ||
          aliases.has(String(frameSet.productId || "")) ||
          (frameSet.productHandle && frameSet.productHandle === product.handle)
        )
      );
    })
    .map((frameSet) => ({
      id: frameSet.id,
      name: frameSet.name,
      productId: frameSet.productId,
      productHandle: frameSet.productHandle,
      enabled: frameSet.enabled,
      frameCount: frameSet.frameCount || frameSet.frames.length,
      fallbackImageUrl: frameSet.fallbackImageUrl,
      effectStyle: frameSet.effectStyle,
      frames: [...frameSet.frames]
        .sort((left, right) => left.order - right.order)
        .map((frame) => ({
          id: frame.id,
          label: frame.label,
          imageUrl: frame.imageUrl,
          order: frame.order,
          width: frame.width,
          height: frame.height,
        })),
    }));
}

export async function GET(req, context) {
  const params = await context.params;
  const rawHandle = params?.handle;
  const storefrontDomain = cleanEnv(
    process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  )
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const privateStorefrontToken = cleanEnv(process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN);
  const publicStorefrontToken = cleanEnv(process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN);
  const storefrontToken = privateStorefrontToken || publicStorefrontToken;
  const tokenSource = privateStorefrontToken
    ? "SHOPIFY_STOREFRONT_ACCESS_TOKEN"
    : publicStorefrontToken
      ? "NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN"
      : "missing";
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

    const normalizedProduct = {
      ...product,
      customGhost360FrameSets: await getCustomGhost360FrameSets(product),
      variants: Array.isArray(product.variants)
        ? product.variants.map((variant) => ({
            ...variant,
            selectedOptions: Array.isArray(variant.selectedOptions)
              ? variant.selectedOptions.map((option) => ({
                  name: String(option?.name || ""),
                  value: String(option?.value || ""),
                }))
              : [],
          }))
        : [],
    };

    return NextResponse.json(normalizedProduct, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Product API failed for handle:", handle, error);

    return NextResponse.json(
      {
        error: "Product API request failed",
        message: error?.message || String(error),
        debug: {
          tokenSet: Boolean(storefrontToken),
          tokenSource,
          domain: storefrontDomain || "missing",
        },
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
