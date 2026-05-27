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

  const apiVersion =
    cleanEnv(process.env.SHOPIFY_ADMIN_API_VERSION) || "2024-10";

  const adminAccessToken = cleanEnv(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
  const panelToken = cleanEnv(process.env.ADMIN_PANEL_TOKEN);

  return {
    storeDomain,
    apiVersion,
    adminAccessToken,
    panelToken,
  };
}

function getSafeDiagnostics({
  storeDomain,
  adminAccessToken,
  shopifyStatus,
  shopifyStatusText,
  errorType,
}: {
  storeDomain: string;
  adminAccessToken: string;
  shopifyStatus?: number;
  shopifyStatusText?: string;
  errorType: string;
}) {
  return {
    shopifyAdminAccessTokenExists: Boolean(adminAccessToken),
    shopDomain: storeDomain || null,
    shopifyStatus: shopifyStatus ?? null,
    shopifyStatusText: shopifyStatusText || null,
    errorType,
  };
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
  const { storeDomain, apiVersion, adminAccessToken, panelToken } = getAdminConfig();

  const token = String(
    req.headers.get("x-admin-token")
      || req.headers.get("authorization")?.replace("Bearer ", "")
      || req.nextUrl.searchParams.get("token")
      || ""
  ).trim();

  if (!panelToken) {
    return NextResponse.json(
      {
        error: "Missing ADMIN_PANEL_TOKEN configuration.",
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      }
    );
  }

  if (!token || token !== panelToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: NO_STORE_HEADERS,
      }
    );
  }

  if (!storeDomain) {
    return NextResponse.json(
      {
        error: "Missing SHOPIFY_STORE_DOMAIN configuration.",
        diagnostics: getSafeDiagnostics({
          storeDomain,
          adminAccessToken,
          errorType: "missing_shop_domain",
        }),
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      }
    );
  }

  if (!adminAccessToken) {
    return NextResponse.json(
      {
        error: "SHOPIFY_ADMIN_ACCESS_TOKEN is not configured",
        diagnostics: getSafeDiagnostics({
          storeDomain,
          adminAccessToken,
          errorType: "missing_shopify_admin_access_token",
        }),
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      }
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
    const response = await fetch(
      `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": adminAccessToken,
        },
        body: JSON.stringify({
          query,
          variables: {
            first: 100,
          },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Shopify Admin API request failed.",
          shopifyStatus: response.status,
          shopifyStatusText: response.statusText,
          diagnostics: getSafeDiagnostics({
            storeDomain,
            adminAccessToken,
            shopifyStatus: response.status,
            shopifyStatusText: response.statusText,
            errorType: "shopify_admin_api_http_error",
          }),
        },
        {
          status: 502,
          headers: NO_STORE_HEADERS,
        }
      );
    }

    const json = (await response.json().catch(() => ({}))) as ShopifyAdminProductsResponse;

    if (json.errors?.length) {
      return NextResponse.json(
        {
          error: "Shopify Admin GraphQL returned errors.",
          details: json.errors,
          diagnostics: getSafeDiagnostics({
            storeDomain,
            adminAccessToken,
            shopifyStatus: response.status,
            shopifyStatusText: response.statusText,
            errorType: "shopify_admin_graphql_error",
          }),
        },
        {
          status: 502,
          headers: NO_STORE_HEADERS,
        }
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

    return NextResponse.json(
      { products },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch products from Shopify Admin API.",
        diagnostics: getSafeDiagnostics({
          storeDomain,
          adminAccessToken,
          errorType:
            error instanceof Error
              ? error.name || "Error"
              : typeof error,
        }),
      },
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      }
    );
  }
}
