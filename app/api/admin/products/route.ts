import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function cleanDomain(domain: string) {
  return String(domain || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

function cleanEnv(value: unknown) {
  return String(value || "").trim();
}

function getAdminConfig() {
  const storeDomain = cleanDomain(process.env.SHOPIFY_STORE_DOMAIN || "");
  const apiVersion = cleanEnv(process.env.SHOPIFY_ADMIN_API_VERSION) || "2024-10";
  const adminApiAccessToken = cleanEnv(process.env.ADMIN_API_ACCESS_TOKEN);
  const panelToken = cleanEnv(process.env.ADMIN_PANEL_TOKEN);

  return { storeDomain, apiVersion, adminApiAccessToken, panelToken };
}

type ShopifyProductNode = {
  id: string;
  title: string;
  handle: string;
  featuredImage: {
    url: string;
    altText?: string | null;
  } | null;
  variants: {
    nodes: Array<{
      id: string;
      title: string;
    }>;
  };
  metafield: {
    value: string;
    type: string;
  } | null;
};

type ShopifyAdminProductsResponse = {
  data?: {
    products?: {
      nodes?: ShopifyProductNode[];
    };
  };
  errors?: Array<{ message?: string }>;
};

export async function GET(req: NextRequest) {
  const { storeDomain, apiVersion, adminApiAccessToken, panelToken } = getAdminConfig();
  const token = String(req.nextUrl.searchParams.get("token") || "").trim();

  if (!panelToken) {
    return NextResponse.json(
      { error: "Missing ADMIN_PANEL_TOKEN configuration." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  if (!token || token !== panelToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  if (!adminApiAccessToken) {
    return NextResponse.json(
      { error: "Missing ADMIN_API_ACCESS_TOKEN configuration." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  const query = `
    query AdminMockupProducts($first: Int!) {
      products(first: $first) {
        nodes {
          id
          title
          handle
          featuredImage {
            url
            altText
          }
          variants(first: 50) {
            nodes {
              id
              title
            }
          }
          metafield(namespace: "dtf", key: "print_locations") {
            value
            type
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://${storeDomain}/admin/api/${apiVersion}/graphql.json`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminApiAccessToken,
      },
      body: JSON.stringify({
        query,
        variables: { first: 100 },
      }),
    });

    const json = (await response.json().catch(() => ({}))) as ShopifyAdminProductsResponse;

    if (!response.ok) {
      return NextResponse.json(
        { error: "Shopify Admin API request failed.", details: json.errors || json },
        { status: 502, headers: NO_STORE_HEADERS }
      );
    }

    if (json.errors?.length) {
      return NextResponse.json(
        { error: "Shopify Admin GraphQL returned errors.", details: json.errors },
        { status: 502, headers: NO_STORE_HEADERS }
      );
    }

    const products = (json.data?.products?.nodes || []).map((product) => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      featuredImage: product.featuredImage
        ? {
            url: product.featuredImage.url,
            altText: product.featuredImage.altText || null,
          }
        : null,
      variants: (product.variants?.nodes || []).map((variant) => ({
        id: variant.id,
        title: variant.title,
      })),
      metafield: product.metafield
        ? {
            value: product.metafield.value,
            type: product.metafield.type,
          }
        : null,
    }));

    return NextResponse.json({ products }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch products from Shopify Admin API.",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
