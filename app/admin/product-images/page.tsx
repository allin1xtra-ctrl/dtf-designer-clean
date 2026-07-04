"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import AdminNav from "../AdminNav";

type GhostAsset = {
  id: string;
  productId?: string;
  sourceFileName?: string;
  sourceImageUrl?: string;
  originalAssetUrl?: string;
  generatedImageUrl?: string;
  prompt: string;
  mode: "single" | "angle-set" | "ai-360-beta";
  angle?: string;
  frameUrls: string[];
  status: string;
  reviewRequired: boolean;
  errors: string[];
  warnings: string[];
  processingTimeMs?: number;
  createdAt: string;
  updatedAt: string;
};

type PhotoroomStatus = {
  enabled: boolean;
  configured: boolean;
  sandbox?: boolean;
  maxImageBytes: number;
};

type ShopifyPublishStatus = {
  configured: boolean;
  storeDomainConfigured: boolean;
  adminAccessTokenConfigured: boolean;
  apiVersion: string;
};

const DEFAULT_PROMPT =
  "Create a clean premium ecommerce ghost mannequin image of this apparel product. Keep the garment shape, fabric texture, stitching, print/logo placement, color, neckline, sleeves, proportions, and brand details accurate. White or transparent studio background. Realistic apparel photography, not AI-looking.";

const ANGLES = [
  ["front", "Front"],
  ["front-left", "Front-left"],
  ["left", "Left"],
  ["back-left", "Back-left"],
  ["back", "Back"],
  ["back-right", "Back-right"],
  ["right", "Right"],
  ["front-right", "Front-right"],
] as const;

export default function AdminProductImagesPage() {
  const [assets, setAssets] = useState<GhostAsset[]>([]);
  const [photoroom, setPhotoroom] = useState<PhotoroomStatus | null>(null);
  const [shopify, setShopify] = useState<ShopifyPublishStatus | null>(null);
  const [productId, setProductId] = useState("");
  const [productHandle, setProductHandle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [mode, setMode] = useState<"single" | "angle-set" | "ai-360-beta">("single");
  const [file, setFile] = useState<File | null>(null);
  const [angleFiles, setAngleFiles] = useState<Record<string, File | null>>({});
  const [status, setStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [busyAssetId, setBusyAssetId] = useState("");

  const maxUploadMb = useMemo(() => {
    if (!photoroom?.maxImageBytes) return 30;
    return Math.round(photoroom.maxImageBytes / 1024 / 1024);
  }, [photoroom?.maxImageBytes]);

  async function loadAssets() {
    const response = await fetch("/api/admin/product-images/ghost-mannequin", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(Array.isArray(result.errors) ? result.errors.join(" ") : "Unable to load product image jobs.");
      return;
    }
    setAssets(Array.isArray(result.assets) ? result.assets : []);
    setPhotoroom(result.photoroom || null);
    setShopify(result.shopify || null);
  }

  useEffect(() => {
    void loadAssets();
  }, []);

  function updateAngleFile(angle: string, event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] || null;
    setAngleFiles((current) => ({ ...current, [angle]: nextFile }));
  }

  async function generateGhostMannequin() {
    setIsGenerating(true);
    setStatus("");
    const formData = new FormData();
    formData.append("mode", mode);
    formData.append("prompt", prompt);
    formData.append("productId", productId);
    formData.append("productHandle", productHandle);
    formData.append("imageUrl", imageUrl);

    if (mode === "angle-set") {
      for (const [angle] of ANGLES) {
        const angleFile = angleFiles[angle];
        if (angleFile) formData.append(`angle_${angle}`, angleFile, angleFile.name);
      }
    } else if (file) {
      formData.append("file", file, file.name);
    }

    const response = await fetch("/api/admin/product-images/ghost-mannequin", {
      method: "POST",
      body: formData,
    });
    const result = await response.json().catch(() => ({}));
    setIsGenerating(false);

    if (!response.ok) {
      setStatus(Array.isArray(result.errors) ? result.errors.join(" ") : "Ghost mannequin generation failed.");
      return;
    }

    setStatus(result.beta ? "AI 360 beta frames generated. Review each frame before publishing." : "Ghost mannequin image generated. Review before publishing.");
    setFile(null);
    await loadAssets();
  }

  async function updateAsset(id: string, action: string) {
    setBusyAssetId(id);
    setStatus("");
    const response = await fetch("/api/admin/product-images/ghost-mannequin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, productId }),
    });
    const result = await response.json().catch(() => ({}));
    setBusyAssetId("");

    if (!response.ok || result.errors?.length) {
      setStatus(Array.isArray(result.errors) ? result.errors.join(" ") : "Review action failed.");
      return;
    }

    if (action === "add-to-product-gallery") {
      const metafieldWarnings = Array.isArray(result.metafieldWarnings) ? result.metafieldWarnings : [];
      setStatus(
        metafieldWarnings.length
          ? `Image added to Shopify product media, but metafields need attention: ${metafieldWarnings.join(" ")}`
          : "Approved image added to Shopify product media and ghost mannequin metafields were saved."
      );
    } else {
      setStatus("Review state updated.");
    }
    await loadAssets();
  }

  return (
    <main className="min-h-screen bg-[#071015] text-neutral-100">
      <AdminNav />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Product Image AI</p>
        <h1 className="mt-2 text-3xl font-black text-white">Ghost Mannequin Workflow</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-400">
          Generate review-only ghost mannequin images for apparel. Originals stay unchanged, and generated images must be approved before they are added to Shopify product media.
        </p>
        <p className="mt-3 max-w-3xl border border-yellow-400/30 bg-yellow-950/20 px-3 py-2 text-sm font-semibold text-yellow-100">
          AI-generated ghost mannequin images must be reviewed before publishing. Confirm color, logo, print placement, stitching, and garment shape before adding to Shopify.
        </p>
        <a href="/admin/product-images/viewer-test" className="mt-3 inline-block text-sm font-bold text-cyan-200 underline-offset-4 hover:underline">
          Open 360 viewer test
        </a>
        <a href="/admin/product-images/ghost-360" className="ml-4 mt-3 inline-block text-sm font-bold text-cyan-200 underline-offset-4 hover:underline">
          Open Custom Ghost 360 effect
        </a>

        <section className="mt-6 border border-[#243b43] bg-[#0b1519] p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-300">Product ID</label>
              <input value={productId} onChange={(event) => setProductId(event.target.value)} placeholder="gid://shopify/Product/..." className="mt-2 w-full border border-[#2c424a] bg-[#071015] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-300">Product handle</label>
              <input value={productHandle} onChange={(event) => setProductHandle(event.target.value)} placeholder="optional-product-handle" className="mt-2 w-full border border-[#2c424a] bg-[#071015] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(["single", "angle-set", "ai-360-beta"] as const).map((nextMode) => (
              <button
                key={nextMode}
                type="button"
                onClick={() => setMode(nextMode)}
                className={`border px-4 py-2 text-sm font-bold transition ${mode === nextMode ? "border-cyan-300 bg-cyan-300 text-neutral-950" : "border-[#2c424a] bg-[#071015] text-neutral-200 hover:border-cyan-300"}`}
              >
                {nextMode === "single" ? "Generate Ghost Mannequin" : nextMode === "angle-set" ? "Generate Angle Set / 360" : "AI 360 Beta"}
              </button>
            ))}
          </div>

          {mode === "angle-set" ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ANGLES.map(([angle, label]) => (
                <label key={angle} className="border border-[#243b43] bg-[#071015] p-3 text-sm text-neutral-200">
                  <span className="font-bold">{label}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-xs" onChange={(event) => updateAngleFile(angle, event)} />
                  {angleFiles[angle]?.name ? <span className="mt-2 block truncate text-xs text-cyan-200">{angleFiles[angle]?.name}</span> : null}
                </label>
              ))}
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-300">Upload product image</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-sm" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-300">Or source image URL</span>
                <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." className="mt-2 w-full border border-[#2c424a] bg-[#071015] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" />
              </label>
            </div>
          )}

          <label className="mt-5 block">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-300">Prompt</span>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} className="mt-2 w-full border border-[#2c424a] bg-[#071015] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" />
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={generateGhostMannequin} disabled={isGenerating} className="bg-[#4A0F14] px-5 py-3 text-sm font-black text-white transition hover:bg-[#64151c] disabled:cursor-not-allowed disabled:opacity-50">
              {isGenerating ? "Generating..." : mode === "angle-set" ? "Generate Angle Set / 360 Beta" : "Generate Ghost Mannequin"}
            </button>
            <p className="text-xs text-neutral-400">
              Photoroom: {photoroom?.enabled ? "enabled" : "disabled"} / API key {photoroom?.configured ? "configured" : "missing"} {photoroom?.sandbox ? "/ sandbox mock mode" : ""} / max {maxUploadMb}MB
            </p>
            <p className={`text-xs ${shopify?.configured ? "text-emerald-200" : "text-yellow-100"}`}>
              Shopify publishing: {shopify?.configured ? `configured (${shopify.apiVersion})` : "missing store domain or Admin API token"}
            </p>
          </div>
          {status ? <p className="mt-4 border border-cyan-300/30 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-100">{status}</p> : null}
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-black text-white">Review Queue</h2>
          <p className="mt-2 text-sm text-neutral-400">
            AI-generated ghost mannequin images must be reviewed before publishing. Confirm color, logo, print placement, stitching, and garment shape before adding to Shopify.
          </p>
          <div className="mt-4 grid gap-4">
            {assets.map((asset) => (
              <article key={asset.id} className="border border-[#243b43] bg-[#0b1519] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{asset.sourceFileName || asset.sourceImageUrl || asset.id}</p>
                    <p className="mt-1 text-xs text-neutral-400">{asset.mode} {asset.angle ? `/ ${asset.angle}` : ""} / {asset.status} / {asset.processingTimeMs ? `${asset.processingTimeMs}ms` : "not processed"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busyAssetId === asset.id} onClick={() => updateAsset(asset.id, "approve")} className="border border-emerald-300 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-300 hover:text-neutral-950">Approve</button>
                    <button type="button" disabled={busyAssetId === asset.id} onClick={() => updateAsset(asset.id, "reject")} className="border border-red-300 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-300 hover:text-neutral-950">Reject</button>
                    <button type="button" disabled={busyAssetId === asset.id || asset.status !== "approved"} onClick={() => updateAsset(asset.id, "add-to-product-gallery")} title={asset.status === "approved" ? "Add approved image to Shopify product media" : "Approve before adding to Shopify product media"} className="bg-[#4A0F14] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#64151c] disabled:cursor-not-allowed disabled:opacity-50">Add to Shopify product media</button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Original</p>
                    {asset.originalAssetUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.originalAssetUrl} alt="Original product upload" className="max-h-80 w-full object-contain bg-white" />
                    ) : <p className="text-sm text-neutral-500">Original URL unavailable.</p>}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Generated</p>
                    {asset.generatedImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.generatedImageUrl} alt="Generated ghost mannequin product image" className="max-h-80 w-full object-contain bg-white" />
                    ) : <p className="text-sm text-neutral-500">Generated URL unavailable.</p>}
                  </div>
                </div>

                {asset.warnings?.length ? <p className="mt-3 text-xs text-yellow-100">{asset.warnings.join(" ")}</p> : null}
                {asset.errors?.length ? <p className="mt-3 text-xs text-red-100">{asset.errors.join(" ")}</p> : null}
              </article>
            ))}
            {assets.length === 0 ? <p className="border border-[#243b43] bg-[#0b1519] p-4 text-sm text-neutral-400">No ghost mannequin generations yet.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
