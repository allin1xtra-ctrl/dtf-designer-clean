
"use client";
import React, { useState } from "react";

export default function ShopifyProductCreate() {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/shopify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-product",
          payload: { title },
        }),
      });
      const data = await res.json();
      setStatus(data.message);
    } catch (e) {
      setStatus("Error creating product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 400 }}>
      <h2>Create Shopify Product</h2>
      <label>
        Title:
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ width: "100%", marginBottom: 8 }}
        />
      </label>
      <button onClick={handleCreate} disabled={loading || !title}>
        {loading ? "Creating..." : "Create Product"}
      </button>
      {status && <div style={{ marginTop: 12 }}>{status}</div>}
    </div>
  );
}
