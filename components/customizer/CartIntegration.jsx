"use client";

import { useState, useEffect, useRef } from "react";

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [artworkUrl, setArtworkUrl] = useState("");
  const [variantId, setVariantId] = useState("");
  const [selectedSize, setSelectedSize] = useState("Custom");
  const [customText, setCustomText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const statusRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlVariant = params.get("variant");
    if (urlVariant) {
      setVariantId(urlVariant);
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
    }
  }, [product]);


  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setStatus("");
    setSubmitting(true);
    const cleanVariantId = String(variantId).replace("gid://shopify/ProductVariant/", "");
    if (!cleanVariantId) {
      setError("Missing Shopify variant ID.");
      setSubmitting(false);
      return;
    }
    const designId = `DTF-${Date.now()}`;
    setStatus("Adding your custom design to cart...");
    // Determine endpoint
    let endpoint = "/api/checkout";
    if (typeof window !== "undefined" && window.location.hostname.endsWith("vercel.app")) {
      endpoint = "/api/checkout";
    } else if (typeof window !== "undefined" && window.location.hostname.endsWith("yourdtfplug.com")) {
      endpoint = "https://dtf-designer-clean.vercel.app/api/checkout";
    }
    // Prepare payload
    const payload = {
      id: Number(cleanVariantId),
      quantity: 1,
      properties: {
        "Size": selectedSize,
        "Artwork URL": artworkUrl,
        "Design ID": designId
      }
    };
    try {
      // Send to parent if in iframe (Shopify), else call endpoint directly
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: "DTF_ADD_TO_CART",
            data: payload
          },
          "https://yourdtfplug.com"
        );
        setStatus("Custom design sent to cart. Redirecting...");
      } else {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setStatus("Custom design sent to cart. Redirecting...");
        } else {
          setError("Failed to add to cart. Please try again.");
        }
      }
    } catch (e) {
      setError("Error: " + e.message);
    } finally {
      setSubmitting(false);
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
        <form onSubmit={handleSubmit} autoComplete="on" aria-describedby={error ? "cart-error" : undefined}>
          <div className="mb-3 grid gap-2 md:grid-cols-2">
            <div>
              <label htmlFor="artwork-url" className="block text-sm font-medium text-gray-200 mb-1">
                Artwork URL
              </label>
              <input
                id="artwork-url"
                name="artworkUrl"
                type="text"
                autoComplete="off"
                className="rounded border px-3 py-2 text-black w-full"
                placeholder="Artwork file or preview URL"
                value={artworkUrl}
                onChange={(e) => setArtworkUrl(e.target.value)}
                aria-describedby={error ? "cart-error" : undefined}
              />
            </div>
            {/* Hide Variant ID from customers, but keep as hidden input for debugging or form completeness */}
            <input
              id="shopify-variant-id"
              name="variantId"
              type="hidden"
              value={variantId}
              readOnly
            />
            <div>
              <label htmlFor="selected-size" className="block text-sm font-medium text-gray-200 mb-1">
                Size
              </label>
              <input
                id="selected-size"
                name="selectedSize"
                type="text"
                autoComplete="off"
                className="rounded border px-3 py-2 text-black w-full"
                placeholder="Size, e.g. 12x12"
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                aria-describedby={error ? "cart-error" : undefined}
              />
            </div>
            <div>
              <label htmlFor="custom-text" className="block text-sm font-medium text-gray-200 mb-1">
                Custom Text
              </label>
              <input
                id="custom-text"
                name="customText"
                type="text"
                autoComplete="off"
                className="rounded border px-3 py-2 text-black w-full"
                placeholder="Custom Text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                aria-describedby={error ? "cart-error" : undefined}
              />
            </div>
          </div>
          <div className="mt-2">
            {status && (
              <div id="cart-status" role="status" aria-live="polite" ref={statusRef} className="text-sm text-green-400">
                {status}
              </div>
            )}
            {error && (
              <div id="cart-error" role="alert" className="text-sm text-red-400">
                {error}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="rounded bg-white px-5 py-3 font-bold text-black transition hover:scale-105 mt-2"
            disabled={!variantId || submitting}
            aria-busy={submitting ? "true" : undefined}
          >
            {submitting ? "Adding..." : "Add Custom Design to Cart"}
          </button>
        </form>
      )}
    </div>
  );
}
