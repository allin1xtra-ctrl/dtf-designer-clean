import crypto from "crypto";
import { NextResponse } from "next/server";

const REQUIRED_SCOPES = ["read_products", "read_product_listings", "read_files"];

function cleanEnv(value) {
  return String(value || "").trim();
}

function cleanDomain(domain) {
  return cleanEnv(domain).replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
}

export async function GET(request) {
  const url = new URL(request.url);
  const debugMode = cleanEnv(url.searchParams.get("debug")) === "1";
  const requestedShop = cleanDomain(
    url.searchParams.get("shop") || process.env.SHOPIFY_STORE_DOMAIN || "yourdtfplug.myshopify.com"
  );

  const clientId = cleanEnv(process.env.SHOPIFY_API_KEY);
  const appUrl = cleanEnv(process.env.SHOPIFY_APP_URL);
  const redirectUri = appUrl ? `${appUrl.replace(/\/$/, "")}/api/auth/callback` : "";
  const state = crypto.randomUUID();

  if (debugMode) {
    return NextResponse.json(
      {
        ok: Boolean(clientId && appUrl && requestedShop),
        route: "/api/auth",
        mode: "install-debug",
        shop: requestedShop,
        hasClientId: Boolean(clientId),
        hasAppUrl: Boolean(appUrl),
        redirectUri: redirectUri || null,
        requiredScopes: REQUIRED_SCOPES,
      },
      { status: clientId && appUrl ? 200 : 500 }
    );
  }

  if (!clientId || !appUrl) {
    return NextResponse.json(
      { error: "Missing SHOPIFY_API_KEY or SHOPIFY_APP_URL configuration." },
      { status: 500 }
    );
  }

  const authUrl = new URL(`https://${requestedShop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", REQUIRED_SCOPES.join(","));
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  response.cookies.set("shopify_oauth_shop", requestedShop, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
