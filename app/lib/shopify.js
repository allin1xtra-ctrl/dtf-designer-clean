const SHOPIFY_STORE_DOMAIN =
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
  "";
const SHOPIFY_STOREFRONT_ACCESS_TOKEN =
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
  "";
const SHOPIFY_ADMIN_ACCESS_TOKEN =
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ||
  process.env.SHOPIFY_ACCESS_TOKEN ||
  "";
const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_ADMIN_API_VERSION || "2024-10";

function cleanDomain(domain) {
  return String(domain || "")
    .replace("https://", "")
    .replace("http://", "")
    .replace(/\/$/, "");
}

export function getShopifyDomain() {
  return cleanDomain(SHOPIFY_STORE_DOMAIN);
}

export function normalizeVariantId(variantId) {
  if (!variantId) return "";
  if (String(variantId).startsWith("gid://shopify/ProductVariant/")) {
    return String(variantId).split("/").pop();
  }
  return String(variantId);
}

export function getShopifyCartAddUrl() {
  const domain = getShopifyDomain();
  return domain ? `https://${domain}/cart/add` : "/cart/add";
}

export async function shopifyStorefrontFetch(query, variables = {}) {
  const domain = getShopifyDomain();
  if (!domain || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    throw new Error("Missing Shopify Storefront API environment variables.");
  }
  const response = await fetch(`https://${domain}/api/2024-10/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (!response.ok || json.errors) {
    throw new Error(JSON.stringify(json.errors || json));
  }
  return json.data;
}

export async function shopifyAdminFetch(endpoint, options = {}) {
  const domain = getShopifyDomain();
  if (!domain || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
    throw new Error("Missing Shopify Admin API environment variables.");
  }
  const response = await fetch(
    `https://${domain}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
        ...(options.headers || {}),
      },
    }
  );
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(JSON.stringify(json));
  }
  return json;
}

export async function getProducts() {
  const query = `
    query {
      products(first: 20) {
        edges {
          node {
            id
            title
            handle
            featuredImage {
              url
              altText
            }
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  const data = await shopifyStorefrontFetch(query);
  return (
    data?.products?.edges?.map(({ node }) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      featuredImage: node.featuredImage
        ? {
            url: node.featuredImage.url,
            altText: node.featuredImage.altText,
          }
        : null,
      variants: node.variants.edges.map(({ node: v }) => ({
        id: v.id,
        title: v.title,
        availableForSale: v.availableForSale,
        price: v.price.amount,
        currencyCode: v.price.currencyCode,
      })),
    })) || []
  );
}
