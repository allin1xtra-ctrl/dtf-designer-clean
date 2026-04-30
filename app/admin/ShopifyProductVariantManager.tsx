
"use client";
import React, { useState } from "react";

export default function ShopifyProductVariantManager() {
  const [productId, setProductId] = useState("");
  const [variants, setVariants] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchVariants = async () => {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/shopify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-product-variants", payload: { id: productId } }),
      });
      const data = await res.json();
      setVariants(data.variants || []);
    } catch (e) {
      setStatus("Error loading variants.");
    } finally {
      setLoading(false);
    }
  };

  // Add, edit, and delete variant logic can be added here

  return (
    <div style={{ marginTop: 32, maxWidth: 600 }}>
      <h2>Manage Product Variants</h2>
      <label>
        Product ID:
        <input
          type="text"
          value={productId}
          onChange={e => setProductId(e.target.value)}
          style={{ width: "100%", marginBottom: 8 }}
        />
      </label>
      <button onClick={fetchVariants} disabled={loading || !productId}>
        {loading ? "Loading..." : "Load Variants"}
      </button>
      {status && <div style={{ marginTop: 12 }}>{status}</div>}
      <ul style={{ marginTop: 16 }}>
        {variants.map((v: any) => (
          <li key={v.id} style={{ marginBottom: 8 }}>
            <div>ID: {v.id}</div>
            <div>Title: {v.title}</div>
            <div>Price: {v.price}</div>
            <div>SKU: {v.sku}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
