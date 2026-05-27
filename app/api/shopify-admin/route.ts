import { NextRequest, NextResponse } from "next/server";

const cleanEnv = (value: unknown) => String(value || "").trim();
const cleanDomain = (value: unknown) =>
  cleanEnv(value).replace(/^https?:\/\//, "").replace(/\/$/, "");

const SHOPIFY_STORE_DOMAIN = cleanDomain(process.env.SHOPIFY_STORE_DOMAIN);
const SHOPIFY_ADMIN_ACCESS_TOKEN = cleanEnv(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
const SHOPIFY_ADMIN_API_VERSION = cleanEnv(process.env.SHOPIFY_ADMIN_API_VERSION) || "2024-10";
const ADMIN_PANEL_TOKEN = cleanEnv(process.env.ADMIN_PANEL_TOKEN);

const shopifyFetch = async (endpoint: string, options: any = {}) => {
  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_ADMIN_API_VERSION}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  return res.json();
};

export async function POST(req: NextRequest) {
  const adminToken = req.headers.get("x-admin-token")
    || req.headers.get("authorization")?.replace("Bearer ", "");

  if (!ADMIN_PANEL_TOKEN) {
    return NextResponse.json({ error: "Missing ADMIN_PANEL_TOKEN configuration." }, { status: 500 });
  }

  if (adminToken !== ADMIN_PANEL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!SHOPIFY_STORE_DOMAIN) {
    return NextResponse.json({ error: "Missing Shopify Admin API configuration." }, { status: 500 });
  }

  if (!SHOPIFY_ADMIN_ACCESS_TOKEN) {
    return NextResponse.json({ error: "SHOPIFY_ADMIN_ACCESS_TOKEN is not configured" }, { status: 500 });
  }

  const { action, payload } = await req.json();

  // List products
  if (action === "list-products") {
    const data = await shopifyFetch("/products.json?limit=20", { method: "GET" });
    return NextResponse.json({ success: true, products: data.products });
  }

  // Create product
  if (action === "create-product") {
    const data = await shopifyFetch("/products.json", {
      method: "POST",
      body: JSON.stringify({ product: { title: payload.title } }),
    });
    return NextResponse.json({ success: true, message: "Product created.", product: data.product });
  }

  // Update product
  if (action === "update-product") {
    const data = await shopifyFetch(`/products/${payload.id}.json`, {
      method: "PUT",
      body: JSON.stringify({ product: { id: payload.id, title: payload.title } }),
    });
    return NextResponse.json({ success: true, message: "Product updated.", product: data.product });
  }

  // Delete product
  if (action === "delete-product") {
    await shopifyFetch(`/products/${payload.id}.json`, { method: "DELETE" });
    return NextResponse.json({ success: true, message: "Product deleted." });
  }

  // List orders
  if (action === "list-orders") {
    const data = await shopifyFetch("/orders.json?limit=20", { method: "GET" });
    return NextResponse.json({ success: true, orders: data.orders });
  }

  // List collections
  if (action === "list-collections") {
    const data = await shopifyFetch("/custom_collections.json?limit=20", { method: "GET" });
    return NextResponse.json({ success: true, collections: data.custom_collections });
  }

  // Fulfill order
  if (action === "fulfill-order") {
    const data = await shopifyFetch(`/orders/${payload.id}/fulfillments.json`, {
      method: "POST",
      body: JSON.stringify({ fulfillment: { location_id: null } }), // You may want to specify location_id
    });
    return NextResponse.json({ success: true, message: "Order fulfilled.", fulfillment: data.fulfillment });
  }

  // List customers
  if (action === "list-customers") {
    const data = await shopifyFetch("/customers.json?limit=20", { method: "GET" });
    return NextResponse.json({ success: true, customers: data.customers });
  }

  // Add more actions as needed
  return NextResponse.json({ success: false, message: "Unknown action." });
}

// ...existing code...
