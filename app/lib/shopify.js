function sanitizeEnvValue(value) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized === "undefined" || normalized === "null") {
    return "";
  }
  return normalized;
}

const SHOPIFY_STORE_DOMAIN = sanitizeEnvValue(
  process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
);
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = sanitizeEnvValue(
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN
);
const SHOPIFY_ADMIN_ACCESS_TOKEN =
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ||
  process.env.SHOPIFY_ACCESS_TOKEN ||
  "";
const SHOPIFY_API_VERSION =
  process.env.SHOPIFY_ADMIN_API_VERSION || "2024-10";

function cleanDomain(domain) {
  const normalized = String(domain || "").trim();
  if (!normalized) return "";

  try {
    const parsed = normalized.startsWith("http")
      ? new URL(normalized)
      : new URL(`https://${normalized}`);
    return parsed.host.trim();
  } catch {
    return normalized
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .trim();
  }
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

function getStorefrontErrorDetails(json, responseText) {
  if (Array.isArray(json?.errors)) return json.errors;
  if (json && typeof json === "object" && Object.keys(json).length > 0) return json;
  return responseText || "Unknown Shopify response";
}

export async function shopifyStorefrontFetch(query, variables = {}) {
  const domain = getShopifyDomain();
  if (!domain || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    throw new Error("Missing Shopify Storefront API environment variables.");
  }
  let response;
  try {
    response = await fetch(`https://${domain}/api/2024-10/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error) {
    const networkError = new Error("Shopify Storefront network request failed.");
    networkError.name = "ShopifyStorefrontError";
    networkError.cause = error;
    throw networkError;
  }

  const responseText = await response.text();
  let json = null;
  try {
    json = JSON.parse(responseText);
  } catch {
    json = null;
  }

  if (!response.ok || json?.errors) {
    const details = getStorefrontErrorDetails(json, responseText);
    const requestError = new Error(
      `Shopify Storefront API request failed (${response.status} ${response.statusText}): ${JSON.stringify(details)}`
    );
    requestError.name = "ShopifyStorefrontError";
    requestError.status = response.status;
    throw requestError;
  }

  if (!json || typeof json !== "object") {
    const parseError = new Error("Shopify Storefront API returned a non-JSON response.");
    parseError.name = "ShopifyStorefrontError";
    parseError.status = response.status;
    throw parseError;
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

export async function getProductByHandle(handle) {
  const query = `
    query ProductByHandle($handle: String!) {
      product(handle: $handle) {
        id
        title
        handle
        featuredImage {
          url
          altText
        }
        metafield(namespace: "dtf", key: "print_locations") {
          value
        }
        variants(first: 50) {
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
  `;

  const data = await shopifyStorefrontFetch(query, { handle });
  const product = data?.product;

  if (!product) {
    return null;
  }

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    featuredImage: product.featuredImage
      ? {
          url: product.featuredImage.url,
          altText: product.featuredImage.altText,
        }
      : null,
    metafield: product.metafield
      ? {
          value: product.metafield.value,
        }
      : null,
    variants:
      product.variants?.edges?.map(({ node: v }) => ({
        id: v.id,
        title: v.title,
        availableForSale: v.availableForSale,
        price: v.price.amount,
        currencyCode: v.price.currencyCode,
      })) || [],
  };
}
