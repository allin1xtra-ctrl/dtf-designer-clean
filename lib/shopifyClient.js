import { shopify } from "@/lib/shopify";

export async function getClient(request) {
  const session = await shopify.auth.getSession(request);
  return new shopify.api.clients.Rest({
    session,
  });
}
