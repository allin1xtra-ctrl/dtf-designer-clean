import { getProductByHandle } from "../../../lib/shopify.js";

export async function GET(_req, { params }) {
  try {
    const rawHandle = params?.handle;
    const handle = decodeURIComponent(rawHandle || "").trim();

    if (!handle) {
      return Response.json({ error: "Missing product handle." }, { status: 400 });
    }

    const product = await getProductByHandle(handle);

    if (!product) {
      return Response.json({ error: "Product not found." }, { status: 404 });
    }

    return Response.json(product);
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Failed to fetch product." },
      { status: 500 }
    );
  }
}
