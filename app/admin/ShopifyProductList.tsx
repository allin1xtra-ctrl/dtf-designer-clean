
"use client";
import React, { useState } from "react";

export default function ShopifyProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/shopify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-products" }),
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      } else {
        setError(data.message || "Failed to fetch products.");
      }
    } catch (e) {
      setError("Error fetching products.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 600 }}>
      <h2>Shopify Products</h2>
      <button onClick={fetchProducts} disabled={loading}>
        {loading ? "Loading..." : "Load Products"}
      </button>
      {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
      <ul style={{ marginTop: 16 }}>
        {products.map((p: any) => (
          <li key={p.id} style={{ marginBottom: 8 }}>
            <strong>{p.title}</strong> (ID: {p.id})
          </li>
        ))}
      </ul>
    </div>
  );
}
