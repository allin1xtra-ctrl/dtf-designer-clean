export async function GET() {
  const shopifyStoreDomainExists = Boolean(process.env.SHOPIFY_STORE_DOMAIN);
  const shopifyStorefrontAccessTokenExists = Boolean(
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
  );
  const nextPublicShopifyStoreDomainExists = Boolean(
    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
  );
  const nextPublicShopifyStorefrontAccessTokenExists = Boolean(
    process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN
  );

  return Response.json({
    SHOPIFY_STORE_DOMAIN_EXISTS: shopifyStoreDomainExists,
    SHOPIFY_STOREFRONT_ACCESS_TOKEN_EXISTS: shopifyStorefrontAccessTokenExists,
    NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN_EXISTS: nextPublicShopifyStoreDomainExists,
    NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN_EXISTS:
      nextPublicShopifyStorefrontAccessTokenExists,
    SHOPIFY_STOREFRONT_TOKEN_EXISTS: shopifyStorefrontAccessTokenExists,
    SHOPIFY_CONFIGURED:
      (shopifyStoreDomainExists || nextPublicShopifyStoreDomainExists) &&
      (shopifyStorefrontAccessTokenExists ||
        nextPublicShopifyStorefrontAccessTokenExists),
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
}
