"use client";
import { useState } from "react";

export default function CartIntegration({ loading, product }) {
  const [status, setStatus] = useState("");
  const [artworkUrl, setArtworkUrl] = useState(""); // Replace with actual artwork URL from state/props
  const [variantId, setVariantId] = useState(""); // Replace with actual variant ID from product/selection

  async function handleAddToCart() {
    setStatus("Adding to cart...");
    try {
      const res = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              id: variantId || "", // Shopify variant ID
              quantity: 1,
              properties: {
                "Artwork URL": artworkUrl || "https://your-art-url.com/art.png", // Replace with actual artwork URL
              },
            },
          ],
        }),
      });
      if (!res.ok) throw new Error("Failed to add to cart");
      setStatus("Added to cart!");
    } catch (e) {
      setStatus("Error: " + e.message);
    }
  }

  return (
    <div className="mt-6 p-4 border rounded" style={{ minHeight: 80 }}>
      <h2 className="text-lg font-semibold mb-2">Shopify Cart Integration</h2>
      {loading ? (
        <div className="skeleton shimmer" style={{ height: 24, width: 200 }} />
      ) : (
        <>
          <div className="mb-2">
            <input
              type="text"
              className="border px-2 py-1 rounded mr-2"
              placeholder="Artwork URL"
              value={artworkUrl}
              onChange={e => setArtworkUrl(e.target.value)}
              style={{ width: 260 }}
            />
            <input
              type="text"
              className="border px-2 py-1 rounded mr-2"
              placeholder="Variant ID"
              value={variantId}
              onChange={e => setVariantId(e.target.value)}
              style={{ width: 120 }}
            />
            <button
              className="bg-black text-white px-4 py-2 rounded"
              onClick={handleAddToCart}
              disabled={!artworkUrl || !variantId}
            >
              Add to Cart
            </button>
          </div>
          {status && <div className="text-sm mt-2">{status}</div>}
        </>
      )}
    </div>
  );
}
