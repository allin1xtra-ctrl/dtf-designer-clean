import { getProducts } from "../../lib/shopify";

export async function GET() {
  try {
    const products = await getProducts();
    return Response.json(products);
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message });
  }
}
