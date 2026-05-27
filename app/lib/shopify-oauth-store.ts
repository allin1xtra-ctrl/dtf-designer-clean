type TokenRecord = {
  shop: string;
  accessToken: string;
  scope?: string;
  updatedAt: string;
};

function normalizeShop(shop: string) {
  return String(shop || "").trim().toLowerCase();
}

function getKvConfig() {
  const baseUrl = String(process.env.KV_REST_API_URL || "").trim();
  const token = String(process.env.KV_REST_API_TOKEN || "").trim();
  return { baseUrl, token };
}

function keyForShop(shop: string) {
  return `shopify:oauth:${shop}`;
}

async function kvGet<T>(key: string): Promise<T | null> {
  const { baseUrl, token } = getKvConfig();
  if (!baseUrl || !token) {
    throw new Error("Missing KV_REST_API_URL or KV_REST_API_TOKEN.");
  }

  const response = await fetch(`${baseUrl}/get/${encodeURIComponent(key)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`KV GET failed (${response.status}): ${text}`);
  }

  const json = (await response.json().catch(() => ({}))) as { result?: T | null };
  return (json?.result ?? null) as T | null;
}

async function kvSet(key: string, value: unknown) {
  const { baseUrl, token } = getKvConfig();
  if (!baseUrl || !token) {
    throw new Error("Missing KV_REST_API_URL or KV_REST_API_TOKEN.");
  }

  const response = await fetch(`${baseUrl}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`KV SET failed (${response.status}): ${text}`);
  }
}

export async function saveShopToken(input: { shop: string; accessToken: string; scope?: string }) {
  const shop = normalizeShop(input.shop);
  if (!shop || !input.accessToken) return;

  const record: TokenRecord = {
    shop,
    accessToken: input.accessToken,
    scope: input.scope,
    updatedAt: new Date().toISOString(),
  };

  await kvSet(keyForShop(shop), record);
}

export async function getShopToken(shop: string): Promise<string | null> {
  const normalized = normalizeShop(shop);
  if (!normalized) return null;

  const record = await kvGet<TokenRecord>(keyForShop(normalized));
  return record?.accessToken || null;
}
