"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return alert("Upload a file first");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      alert("Uploaded: " + data.url);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }
  };

  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h1>DTF Designer Pro</h1>

      <input
        type="file"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
          }
        }}
      />

      {preview && (
        <div style={{ marginTop: 20 }}>
          <img src={preview} style={{ maxWidth: 300 }} />
        </div>
      )}

      <button
        onClick={handleUpload}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          background: "black",
          color: "white",
          borderRadius: 8,
        }}
      >
        Upload Design
      </button>
    </div>
  );
}