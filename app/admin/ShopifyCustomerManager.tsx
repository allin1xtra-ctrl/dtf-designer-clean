
"use client";
import React, { useState } from "react";

export default function ShopifyCustomerManager() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/shopify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-customers" }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      } else {
        setError(data.message || "Failed to fetch customers.");
      }
    } catch (e) {
      setError("Error fetching customers.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 600 }}>
      <h2>Shopify Customers</h2>
      <button onClick={fetchCustomers} disabled={loading}>
        {loading ? "Loading..." : "Load Customers"}
      </button>
      {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
      <ul style={{ marginTop: 16 }}>
        {customers.map((c: any) => (
          <li key={c.id} style={{ marginBottom: 8 }}>
            <strong>{c.first_name} {c.last_name}</strong> (ID: {c.id}, Email: {c.email})
          </li>
        ))}
      </ul>
    </div>
  );
}
