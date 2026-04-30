// Shopify Admin API helpers are not available in this environment.
// This route must be implemented with a valid Shopify library or API handler.

export async function GET(request) {
  return new Response(
    JSON.stringify({ error: "Shopify Admin API handler not implemented. See app/lib/shopify.js for helpers." }),
    { status: 501, headers: { "Content-Type": "application/json" } }
  );
}
