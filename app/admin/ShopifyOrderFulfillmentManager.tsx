
"use client";
import React, { useState } from "react";

export default function ShopifyOrderFulfillmentManager() {
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const fulfillOrder = async () => {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/shopify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fulfill-order", payload: { id: orderId } }),
      });
      const data = await res.json();
      setStatus(data.message);
    } catch (e) {
      setStatus("Error fulfilling order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 400 }}>
      <h2>Order Fulfillment</h2>
      <label>
        Order ID:
        <input
          type="text"
          value={orderId}
          onChange={e => setOrderId(e.target.value)}
          style={{ width: "100%", marginBottom: 8 }}
        />
      </label>
      <button onClick={fulfillOrder} disabled={loading || !orderId}>
        {loading ? "Fulfilling..." : "Fulfill Order"}
      </button>
      {status && <div style={{ marginTop: 12 }}>{status}</div>}
    </div>
  );
}
