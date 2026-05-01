export async function GET() {
  return Response.json({
    SHOPIFY_STORE_DOMAIN_EXISTS: Boolean(process.env.SHOPIFY_STORE_DOMAIN),
    SHOPIFY_STOREFRONT_TOKEN_EXISTS: Boolean(process.env.SHOPIFY_STOREFRONT_TOKEN),
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
}
