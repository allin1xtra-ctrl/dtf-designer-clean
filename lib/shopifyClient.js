function cleanEnv(value) {
  return String(value || "").trim();
}

function cleanDomain(value) {
  return cleanEnv(value)
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

export async function shopifyAdminRestFetch(endpoint, options = {}) {
  const shop = cleanDomain(process.env.SHOPIFY_STORE_DOMAIN);
  const token = cleanEnv(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
  const version = cleanEnv(process.env.SHOPIFY_ADMIN_API_VERSION) || "2024-10";

  if (!shop) {
    throw new Error("SHOPIFY_STORE_DOMAIN is not configured");
  }

  if (!token) {
    throw new Error("SHOPIFY_ADMIN_ACCESS_TOKEN is not configured");
  }

  const path = String(endpoint || "").startsWith("/") ? endpoint : `/${endpoint}`;

  const response = await fetch(`https://${shop}/admin/api/${version}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Shopify Admin REST request failed with status ${response.status}`);
  }

  return data;
}
