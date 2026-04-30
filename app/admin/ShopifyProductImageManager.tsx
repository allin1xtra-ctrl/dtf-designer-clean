
"use client";
import React, { useState } from "react";

export default function ShopifyProductImageManager() {
  const [productId, setProductId] = useState("");
  const [images, setImages] = useState([]);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchImages = async () => {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/shopify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list-product-images", payload: { id: productId } }),
      });
      const data = await res.json();
      setImages(data.images || []);
    } catch (e) {
      setStatus("Error loading images.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setStatus("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("productId", productId);
      const res = await fetch("/api/shopify-admin?upload=image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setStatus(data.message);
      fetchImages();
    } catch (e) {
      setStatus("Error uploading image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 600 }}>
      <h2>Manage Product Images</h2>
      <label>
        Product ID:
        <input
          type="text"
          value={productId}
          onChange={e => setProductId(e.target.value)}
          style={{ width: "100%", marginBottom: 8 }}
        />
      </label>
      <button onClick={fetchImages} disabled={loading || !productId}>
        {loading ? "Loading..." : "Load Images"}
      </button>
      <div style={{ marginTop: 16 }}>
        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
        <button onClick={handleUpload} disabled={loading || !file || !productId}>
          {loading ? "Uploading..." : "Upload Image"}
        </button>
      </div>
      {status && <div style={{ marginTop: 12 }}>{status}</div>}
      <ul style={{ marginTop: 16 }}>
        {images.map((img: any) => (
          <li key={img.id} style={{ marginBottom: 8 }}>
            <img src={img.src} alt="Product" style={{ maxWidth: 100, maxHeight: 100 }} />
            <div>ID: {img.id}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
