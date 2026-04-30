
"use client";
import React, { useState } from "react";

export default function ShopifyProductEditor() {
  const [productId, setProductId] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/shopify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-product",
          payload: { id: productId, title },
        }),
      });
      const data = await res.json();
      setStatus(data.message);
    } catch (e) {
      setStatus("Error updating product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 400 }}>
      <h2>Edit Shopify Product</h2>
      <label>
        Product ID:
        <input
          type="text"
          value={productId}
          onChange={e => setProductId(e.target.value)}
          style={{ width: "100%", marginBottom: 8 }}
        />
      </label>
      <label>
        New Title:
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ width: "100%", marginBottom: 8 }}
        />
      </label>
      <button onClick={handleUpdate} disabled={loading || !productId || !title}>
        {loading ? "Updating..." : "Update Product"}
      </button>
      {status && <div style={{ marginTop: 12 }}>{status}</div>}
    </div>
  );
}
