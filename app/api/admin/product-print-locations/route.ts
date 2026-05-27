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
  const adminAccessToken = cleanEnv(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
  const panelToken = cleanEnv(process.env.ADMIN_PANEL_TOKEN);

  return { storeDomain, apiVersion, adminAccessToken, panelToken };
}

type MetafieldsSetResponse = {
  data?: {
    metafieldsSet?: {
      metafields?: Array<{ id: string }>;
      userErrors?: Array<{
        field?: string[];
        message?: string;
        code?: string;
      }>;
    };
  };
  errors?: Array<{ message?: string }>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function POST(req: NextRequest) {
  const { storeDomain, apiVersion, adminAccessToken, panelToken } = getAdminConfig();

  if (!panelToken) {
    return NextResponse.json(
      { error: "Missing ADMIN_PANEL_TOKEN configuration." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const body = isPlainObject(payload) ? payload : {};
  const token = String(body.token || "").trim();
  const productId = String(body.productId || "").trim();
  const printLocations = body.printLocations;

  if (!token || token !== panelToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  if (!productId) {
    return NextResponse.json({ error: "Missing productId." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (!isPlainObject(printLocations)) {
    return NextResponse.json(
      { error: "printLocations must be an object." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (!storeDomain) {
    return NextResponse.json(
      { error: "Missing Shopify Admin API configuration." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  if (!adminAccessToken) {
    return NextResponse.json(
      { error: "SHOPIFY_ADMIN_ACCESS_TOKEN is not configured" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  const mutation = `
    mutation SetProductPrintLocations($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          type
          value
        }
        userErrors {
          field
          message
          code
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
        "X-Shopify-Access-Token": adminAccessToken,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          metafields: [
            {
              ownerId: productId,
              namespace: "dtf",
              key: "print_locations",
              type: "json",
              value: JSON.stringify(printLocations),
            },
          ],
        },
      }),
    });

    const json = (await response.json().catch(() => ({}))) as MetafieldsSetResponse;

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

    const userErrors = json.data?.metafieldsSet?.userErrors || [];
    if (userErrors.length) {
      return NextResponse.json(
        { error: "Failed to save print locations.", details: userErrors },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        metafields: json.data?.metafieldsSet?.metafields || [],
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to save print locations to Shopify.",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
