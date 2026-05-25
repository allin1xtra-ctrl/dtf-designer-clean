"use client";

import { useState } from "react";

export default function MockupsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  async function upload() {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/mockups", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setMessage(JSON.stringify(data));
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Mockup Upload Test</h1>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button
        onClick={upload}
        style={{
          display: "block",
          marginTop: 20,
          padding: "10px 20px",
        }}
      >
        Upload Mockup
      </button>

      <pre style={{ marginTop: 20 }}>{message}</pre>
    </div>
  );
}
