
"use client";
import React, { useState } from "react";

export default function ShopifyOrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/shopify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-orders" }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        setError(data.message || "Failed to fetch orders.");
      }
    } catch (e) {
      setError("Error fetching orders.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 600 }}>
      <h2>Shopify Orders</h2>
      <button onClick={fetchOrders} disabled={loading}>
        {loading ? "Loading..." : "Load Orders"}
      </button>
      {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
      <ul style={{ marginTop: 16 }}>
        {orders.map((o: any) => (
          <li key={o.id} style={{ marginBottom: 8 }}>
            <strong>Order #{o.id}</strong> (Status: {o.status})
          </li>
        ))}
      </ul>
    </div>
  );
}
