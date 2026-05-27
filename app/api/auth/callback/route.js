import crypto from "crypto";
import { NextResponse } from "next/server";
import { saveShopToken } from "@/app/lib/shopify-oauth-store";

function cleanEnv(value) {
  return String(value || "").trim();
}

function cleanDomain(domain) {
  return cleanEnv(domain).replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
}

function getDebugPayload({ code, hmac, shop, state, cookieState, queryKeys }) {
  return {
    hasCode: Boolean(code),
    hasHmac: Boolean(hmac),
    hasShop: Boolean(shop),
    hasState: Boolean(state),
    storedStateExists: Boolean(cookieState),
    shop,
    queryKeys,
  };
}

export async function GET(request) {
  const url = new URL(request.url);
  const debugMode = cleanEnv(url.searchParams.get("debug")) === "1";

  const shopFromQuery = cleanDomain(url.searchParams.get("shop"));
  const code = cleanEnv(url.searchParams.get("code"));
  const hmac = cleanEnv(url.searchParams.get("hmac"));
  const state = cleanEnv(url.searchParams.get("state"));

  const cookieState = cleanEnv(request.cookies.get("shopify_oauth_state")?.value);
  const cookieShop = cleanDomain(request.cookies.get("shopify_oauth_shop")?.value);
  const shop = shopFromQuery || cookieShop;

  const queryKeys = [...url.searchParams.keys()].sort();

  const stateValid = Boolean(state) && (!cookieState || state === cookieState);
  const callbackValid = Boolean(shop && code && hmac && stateValid);

  if (debugMode || !callbackValid) {
    const debugPayload = getDebugPayload({
      code,
      hmac,
      shop,
      state,
      cookieState,
      queryKeys,
    });

    if (!callbackValid) {
      return NextResponse.json(
        {
          error: "Invalid OAuth callback parameters.",
          ...debugPayload,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        route: "/api/auth/callback",
        ...debugPayload,
      },
      { status: 200 }
    );
  }

  const apiSecret = cleanEnv(process.env.SHOPIFY_API_SECRET);
  const clientId = cleanEnv(process.env.SHOPIFY_API_KEY);
  const appUrl = cleanEnv(process.env.SHOPIFY_APP_URL);

  if (!apiSecret || !clientId || !appUrl) {
    return NextResponse.json(
      { error: "Missing SHOPIFY_API_SECRET, SHOPIFY_API_KEY, or SHOPIFY_APP_URL." },
      { status: 500 }
    );
  }

  const params = new URLSearchParams(url.search);
  params.delete("hmac");
  params.delete("debug");
  params.sort();
  const message = params.toString();
  const digest = crypto.createHmac("sha256", apiSecret).update(message).digest("hex");

  if (digest !== hmac) {
    return NextResponse.json({ error: "Invalid OAuth HMAC." }, { status: 401 });
  }

  const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: apiSecret,
      code,
    }),
  });

  const tokenJson = await tokenResponse.json().catch(() => ({}));

  if (!tokenResponse.ok || !tokenJson?.access_token) {
    return NextResponse.json(
      {
        error: "Failed to exchange OAuth code for token.",
        status: tokenResponse.status,
        details: tokenJson,
      },
      { status: 502 }
    );
  }

  await saveShopToken({
    shop,
    accessToken: tokenJson.access_token,
    scope: tokenJson.scope,
  });

  const successUrl = new URL("/admin/mockups", appUrl.replace(/\/$/, "") + "/");
  successUrl.searchParams.set("installed", "1");

  const response = NextResponse.redirect(successUrl.toString());
  response.cookies.delete("shopify_oauth_state");
  response.cookies.delete("shopify_oauth_shop");
  return response;
}
