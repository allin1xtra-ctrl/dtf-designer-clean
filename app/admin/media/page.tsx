"use client";

import { ChangeEvent, useEffect, useState } from "react";
import AdminNav from "../AdminNav";

type MediaAsset = {
  id: string;
  fileName: string;
  url?: string;
  type: string;
  storage?: string;
  createdAt: string;
};

export default function AdminMediaPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [status, setStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function loadMedia() {
    const response = await fetch("/api/admin/customizer-media", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(result.error || "Unable to load media.");
      return;
    }
    setAssets(Array.isArray(result.mediaAssets) ? result.mediaAssets : []);
  }

  useEffect(() => {
    let isActive = true;
    fetch("/api/admin/customizer-media", { cache: "no-store" })
      .then((response) => response.json().then((result) => ({ response, result })))
      .then(({ response, result }) => {
        if (!isActive) return;
        if (!response.ok) {
          setStatus(result.error || "Unable to load media.");
          return;
        }
        setAssets(Array.isArray(result.mediaAssets) ? result.mediaAssets : []);
      })
      .catch(() => {
        if (isActive) setStatus("Unable to load media.");
      });
    return () => {
      isActive = false;
    };
  }, []);

  async function uploadMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setStatus("");
    const formData = new FormData();
    formData.append("file", file, file.name);
    const response = await fetch("/api/admin/customizer-media", { method: "POST", body: formData });
    const result = await response.json().catch(() => ({}));
    setIsUploading(false);
    event.target.value = "";
    if (!response.ok) {
      setStatus(Array.isArray(result.errors) ? result.errors.join(" ") : "Media upload failed.");
      return;
    }
    setStatus(Array.isArray(result.warnings) ? result.warnings.join(" ") : "Media saved.");
    await loadMedia();
  }

  return (
    <main className="min-h-screen bg-[#071015] text-neutral-100">
      <AdminNav />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Customizer Admin</p>
        <h1 className="mt-2 text-3xl font-black text-white">Media Library</h1>
        <p className="mt-2 text-sm text-neutral-400">Upload template previews and mockup images through the staging storage abstraction. Configure Cloudinary env vars for persistent hosted URLs.</p>
        <label className="mt-6 inline-flex cursor-pointer rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-2 font-black text-neutral-950">
          {isUploading ? "Uploading..." : "Upload Media"}
          <input type="file" accept="image/*,.svg,.pdf" className="sr-only" onChange={uploadMedia} disabled={isUploading} />
        </label>
        {status ? <p className="mt-4 rounded-md border border-cyan-300/30 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-100">{status}</p> : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <article key={asset.id} className="rounded-xl border border-[#243b43] bg-[#0b1519] p-4">
              <p className="font-black text-white">{asset.fileName}</p>
              <p className="text-sm text-neutral-400">{asset.type} / {asset.storage || "metadata"}</p>
              {asset.url ? <p className="mt-2 break-all text-xs text-cyan-200">{asset.url}</p> : <p className="mt-2 text-xs text-yellow-200">No hosted URL. Configure persistent storage.</p>}
            </article>
          ))}
          {assets.length === 0 ? <p className="rounded-xl border border-[#243b43] bg-[#0b1519] p-4 text-sm text-neutral-400">No admin media uploaded yet.</p> : null}
        </div>
      </div>
    </main>
  );
}
