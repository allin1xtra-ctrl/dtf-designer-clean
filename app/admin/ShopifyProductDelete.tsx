
"use client";
import React, { useState } from "react";

export default function ShopifyProductDelete() {
  const [productId, setProductId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/shopify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-product",
          payload: { id: productId },
        }),
      });
      const data = await res.json();
      setStatus(data.message);
    } catch (e) {
      setStatus("Error deleting product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 400 }}>
      <h2>Delete Shopify Product</h2>
      <label>
        Product ID:
        <input
          type="text"
          value={productId}
          onChange={e => setProductId(e.target.value)}
          style={{ width: "100%", marginBottom: 8 }}
        />
      </label>
      <button onClick={handleDelete} disabled={loading || !productId}>
        {loading ? "Deleting..." : "Delete Product"}
      </button>
      {status && <div style={{ marginTop: 12 }}>{status}</div>}
    </div>
  );
}
