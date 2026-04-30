import { NextRequest, NextResponse } from "next/server";

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_API_KEY = process.env.SHOPIFY_ADMIN_API_KEY;
const SHOPIFY_ADMIN_API_PASSWORD = process.env.SHOPIFY_ADMIN_API_PASSWORD;
const SHOPIFY_ADMIN_API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || "2023-01";

const getAuthHeader = () => {
  const token = Buffer.from(`${SHOPIFY_ADMIN_API_KEY}:${SHOPIFY_ADMIN_API_PASSWORD}`).toString("base64");
  return `Basic ${token}`;
};

const shopifyFetch = async (endpoint: string, options: any = {}) => {
  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_ADMIN_API_VERSION}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: getAuthHeader(),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  return res.json();
};

export async function POST(req: NextRequest) {
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
