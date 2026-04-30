
"use client";
import React, { useState } from "react";

export default function ShopifyCollectionList() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCollections = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/shopify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-collections" }),
      });
      const data = await res.json();
      if (data.success) {
        setCollections(data.collections || []);
      } else {
        setError(data.message || "Failed to fetch collections.");
      }
    } catch (e) {
      setError("Error fetching collections.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 600 }}>
      <h2>Shopify Collections</h2>
      <button onClick={fetchCollections} disabled={loading}>
        {loading ? "Loading..." : "Load Collections"}
      </button>
      {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
      <ul style={{ marginTop: 16 }}>
        {collections.map((c: any) => (
          <li key={c.id} style={{ marginBottom: 8 }}>
            <strong>{c.title}</strong> (ID: {c.id})
          </li>
        ))}
      </ul>
    </div>
  );
}
