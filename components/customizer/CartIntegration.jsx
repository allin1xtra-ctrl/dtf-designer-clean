"use client";

import { useState, useEffect } from "react";

export default function CartIntegration({ loading, product }) {
  const [status, setStatus] = useState("");
  const [artworkUrl, setArtworkUrl] = useState("");
  const [variantId, setVariantId] = useState("");
  const [selectedSize, setSelectedSize] = useState("Custom");
  const [customText, setCustomText] = useState("");
  const [variantIdManuallyEditable, setVariantIdManuallyEditable] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlVariant = params.get("variant");
    if (urlVariant) {
      setVariantId(urlVariant);
      setVariantIdManuallyEditable(false);
      return;
    }
    // Fallback if your product prop has variant data
    const fallbackVariant =
      product?.variantId ||
      product?.selectedVariantId ||
      product?.variants?.[0]?.id ||
      "";
    if (fallbackVariant) {
      setVariantId(String(fallbackVariant).replace("gid://shopify/ProductVariant/", ""));
      setVariantIdManuallyEditable(false);
    } else {
      setVariantIdManuallyEditable(true);
    }
  }, [product]);

  function handleAddToCart() {
    const cleanVariantId = String(variantId).replace("gid://shopify/ProductVariant/", "");
    if (!cleanVariantId) {
      setStatus("Missing Shopify variant ID.");
      return;
    }
    const designId = `DTF-${Date.now()}`;
    setStatus("Adding your custom design to cart...");
    try {
      window.parent.postMessage(
        {
          type: "DTF_ADD_TO_CART",
          data: {
            id: Number(cleanVariantId),
            quantity: 1,
            properties: {
              "Design ID": designId,
              "Artwork URL": artworkUrl || "No artwork uploaded yet",
              "Size": selectedSize || "Custom",
              "Custom Text": customText || ""
            }
          }
        },
        "https://yourdtfplug.com"
      );
      setStatus("Custom design sent to cart. Redirecting...");
    } catch (e) {
      setStatus("Error: " + e.message);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4" style={{ minHeight: 80 }}>
      <h2 className="mb-2 text-lg font-semibold">Finalize Your Custom Order</h2>
      <p className="mb-4 text-sm text-gray-300">
        Review your design details, then add your custom DTF order to cart.
      </p>
      {loading ? (
        <div className="skeleton shimmer" style={{ height: 24, width: 200 }} />
      ) : (
        <>
          <div className="mb-3 grid gap-2 md:grid-cols-2">
            <input
              id="artwork-url"
              name="artworkUrl"
              type="text"
              className="rounded border px-3 py-2 text-black"
              placeholder="Artwork file or preview URL"
              value={artworkUrl}
              onChange={(e) => setArtworkUrl(e.target.value)}
            />
            {/* Hide Variant ID from customers, but keep as hidden input for debugging or form completeness */}
            <input
              id="shopify-variant-id"
              name="variantId"
              type="hidden"
              value={variantId}
              readOnly
            />
            <input
              id="selected-size"
              name="selectedSize"
              type="text"
              className="rounded border px-3 py-2 text-black"
              placeholder="Size, e.g. 12x12"
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
            />
            <input
              id="custom-text"
              name="customText"
              type="text"
              className="rounded border px-3 py-2 text-black"
              placeholder="Custom Text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
            />
          </div>
          <button
            className="rounded bg-white px-5 py-3 font-bold text-black transition hover:scale-105"
            onClick={handleAddToCart}
            disabled={!variantId}
          >
            Add Custom Design to Cart
          </button>
          {status && <div className="mt-2 text-sm">{status}</div>}
        </>
      )}
    </div>
  );
}
