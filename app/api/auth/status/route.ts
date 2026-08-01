import { NextResponse } from "next/server";

function cleanEnv(value: unknown) {
  return String(value || "").trim();
}

export async function GET() {
  const clientId = cleanEnv(process.env.SHOPIFY_API_KEY);
  const appUrl = cleanEnv(process.env.SHOPIFY_APP_URL);
  const apiSecret = cleanEnv(process.env.SHOPIFY_API_SECRET);
  const adminToken = cleanEnv(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
  const storeDomain = cleanEnv(process.env.SHOPIFY_STORE_DOMAIN);
  const kvUrl = cleanEnv(process.env.KV_REST_API_URL);
  const kvToken = cleanEnv(process.env.KV_REST_API_TOKEN);
  const openaiKey = cleanEnv(process.env.OPENAI_API_KEY);

  const oauthConfigured = Boolean(clientId && appUrl && apiSecret);
  const adminConfigured = Boolean(adminToken && storeDomain);
  const kvConfigured = Boolean(kvUrl && kvToken);
  const openaiConfigured = Boolean(openaiKey);

  return NextResponse.json({
    shopify: {
      oauthConfigured,
      adminConfigured,
      hasClientId: Boolean(clientId),
      hasAppUrl: Boolean(appUrl),
      hasApiSecret: Boolean(apiSecret),
      hasAdminToken: Boolean(adminToken),
      hasStoreDomain: Boolean(storeDomain),
      connectUrl: "/api/auth",
    },
    kv: {
      configured: kvConfigured,
    },
    openai: {
      configured: openaiConfigured,
    },
  });
}
