"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import AdminNav from "../../AdminNav";
import CustomGhost360Viewer, { CustomGhost360EffectStyle } from "@/components/product/CustomGhost360Viewer";

type CustomGhost360Frame = {
  id: string;
  label: string;
  imageUrl: string;
  fileName?: string;
  order: number;
  width?: number;
  height?: number;
};

type CustomGhost360FrameSet = {
  id: string;
  name: string;
  productId?: string;
  productHandle?: string;
  enabled: boolean;
  frameCount?: number;
  fallbackImageUrl?: string;
  effectStyle: CustomGhost360EffectStyle;
  frames: CustomGhost360Frame[];
  warnings: string[];
  createdAt: string;
  updatedAt: string;
  assignedAt?: string;
  metafieldsSyncedAt?: string;
};

type ShopifyStatus = {
  configured: boolean;
  storeDomainConfigured: boolean;
  adminAccessTokenConfigured: boolean;
  apiVersion: string;
};

type DraftFrame = {
  file: File;
  url: string;
};

const FRAME_COUNTS = [1, 2, 4, 8, 12, 16, 24, 36] as const;
const EFFECT_STYLES: Array<[CustomGhost360EffectStyle, string]> = [
  ["studio", "Studio"],
  ["ghost-fade", "Ghost fade"],
  ["floor-shadow", "Floor shadow"],
  ["reflection", "Reflection"],
];

const EIGHT_FRAME_LABELS = [
  "Front",
  "Front angled",
  "Side",
  "Back angled",
  "Back",
  "Back angled opposite",
  "Side opposite",
  "Front angled opposite",
];

function frameLabel(index: number, frameCount: number) {
  if (frameCount === 1) return "Front";
  if (frameCount === 2) return index === 0 ? "Front" : "Back";
  if (frameCount === 4) return ["Front", "Side", "Back", "Side opposite"][index] || `Frame ${index + 1}`;
  if (frameCount === 8) return EIGHT_FRAME_LABELS[index] || `Frame ${index + 1}`;
  const degrees = Math.round((index / frameCount) * 360);
  return EIGHT_FRAME_LABELS[index] || `Frame ${index + 1} (${degrees} deg)`;
}

function emptyDraft(count: number) {
  return Array.from({ length: count }, () => null as DraftFrame | null);
}

export default function CustomGhost360AdminPage() {
  const [frameSets, setFrameSets] = useState<CustomGhost360FrameSet[]>([]);
  const [shopify, setShopify] = useState<ShopifyStatus | null>(null);
  const [name, setName] = useState("Custom Ghost 360 frame set");
  const [productId, setProductId] = useState("");
  const [productHandle, setProductHandle] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [frameCount, setFrameCount] = useState<number>(8);
  const [effectStyle, setEffectStyle] = useState<CustomGhost360EffectStyle>("studio");
  const [draftFrames, setDraftFrames] = useState<Array<DraftFrame | null>>(() => emptyDraft(8));
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const draftFramesRef = useRef<Array<DraftFrame | null>>([]);

  useEffect(() => {
    draftFramesRef.current = draftFrames;
  }, [draftFrames]);

  useEffect(() => {
    return () => {
      draftFramesRef.current.forEach((frame) => {
        if (frame?.url) URL.revokeObjectURL(frame.url);
      });
    };
  }, []);

  async function loadFrameSets() {
    const response = await fetch("/api/admin/product-images/ghost-360", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(Array.isArray(result.errors) ? result.errors.join(" ") : "Unable to load Custom Ghost 360 frame sets.");
      return;
    }
    setFrameSets(Array.isArray(result.frameSets) ? result.frameSets : []);
    setShopify(result.shopify || null);
  }

  useEffect(() => {
    void loadFrameSets();
  }, []);

  const activePreviewUrls = useMemo(() => draftFrames.map((frame) => frame?.url || "").filter(Boolean), [draftFrames]);
  const draftWarnings = useMemo(() => {
    const warnings = [];
    if (activePreviewUrls.length === 0) warnings.push("Add at least one frame before saving.");
    if (activePreviewUrls.length > 0 && activePreviewUrls.length < frameCount) warnings.push(`Frame order is incomplete: ${activePreviewUrls.length} of ${frameCount} slots are filled.`);
    return warnings;
  }, [activePreviewUrls.length, frameCount]);

  function changeFrameCount(nextCount: number) {
    setFrameCount(nextCount);
    setDraftFrames((current) => {
      const next = current.slice(0, nextCount);
      while (next.length < nextCount) next.push(null);
      return next;
    });
  }

  function setDraftFrame(index: number, file: File | null) {
    setDraftFrames((current) => current.map((frame, itemIndex) => {
      if (itemIndex !== index) return frame;
      if (frame?.url) URL.revokeObjectURL(frame.url);
      return file ? { file, url: URL.createObjectURL(file) } : null;
    }));
  }

  function updateFrame(index: number, event: ChangeEvent<HTMLInputElement>) {
    setDraftFrame(index, event.target.files?.[0] || null);
  }

  function addMultipleFrames(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setDraftFrames((current) => {
      const next = [...current];
      let fileIndex = 0;
      for (let index = 0; index < next.length && fileIndex < files.length; index += 1) {
        if (next[index]) continue;
        next[index] = { file: files[fileIndex], url: URL.createObjectURL(files[fileIndex]) };
        fileIndex += 1;
      }
      return next;
    });
    event.target.value = "";
  }

  function moveDraftFrame(index: number, direction: -1 | 1) {
    setDraftFrames((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const currentFrame = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = currentFrame;
      return next;
    });
  }

  async function saveFrameSet(saveAsDraft: boolean) {
    setIsSaving(true);
    setStatus("");
    const formData = new FormData();
    formData.append("name", name);
    formData.append("productId", productId);
    formData.append("productHandle", productHandle);
    formData.append("enabled", saveAsDraft ? "false" : enabled ? "true" : "false");
    formData.append("frameCount", String(frameCount));
    formData.append("effectStyle", effectStyle);
    draftFrames.forEach((frame, index) => {
      formData.append(`label_${index}`, frameLabel(index, frameCount));
      if (frame?.file) formData.append(`frame_${index}`, frame.file, frame.file.name);
    });

    const response = await fetch("/api/admin/product-images/ghost-360", {
      method: "POST",
      body: formData,
    });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (!response.ok) {
      setStatus(Array.isArray(result.errors) ? result.errors.join(" ") : "Unable to save Custom Ghost 360 frame set.");
      return;
    }
    setStatus(saveAsDraft ? "Draft saved locally. Nothing was published to Shopify." : "Frame set saved locally. Shopify sync still requires the manual sync button.");
    draftFrames.forEach((frame) => {
      if (frame?.url) URL.revokeObjectURL(frame.url);
    });
    setDraftFrames(emptyDraft(frameCount));
    await loadFrameSets();
  }

  async function updateFrameSet(id: string, action: string, extra: Record<string, unknown> = {}) {
    setBusyId(id);
    setStatus("");
    const response = await fetch("/api/admin/product-images/ghost-360", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, productId, productHandle, enabled, frameCount, effectStyle, ...extra }),
    });
    const result = await response.json().catch(() => ({}));
    setBusyId("");
    if (!response.ok || result.errors?.length) {
      setStatus(Array.isArray(result.errors) ? result.errors.join(" ") : "Custom Ghost 360 action failed.");
      return;
    }
    setStatus(action === "sync-shopify-metafields" ? "Ghost 360 metafields synced to Shopify by manual request." : "Custom Ghost 360 frame set updated locally.");
    await loadFrameSets();
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#071015] text-neutral-100">
      <AdminNav />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Product Image Effects</p>
        <h1 className="mt-2 text-3xl font-black text-white">Custom Ghost 360 Product Effect</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-400">
          Build a premium 360 product presentation from uploaded photos. This stays separate from Photoroom, stores drafts locally, and only syncs Shopify metafields when you request it.
        </p>
        <p className="mt-3 max-w-3xl border border-yellow-400/30 bg-yellow-950/20 px-3 py-2 text-sm font-semibold text-yellow-100">
          No auto-publish: confirm logos, print placement, garment color, stitching, labels, fabric texture, and shape before syncing Shopify metafields.
        </p>
        <a href="/admin/product-images/ghost-360/viewer-test" className="mt-3 inline-block text-sm font-bold text-cyan-200 underline-offset-4 hover:underline">
          Open Custom Ghost 360 viewer test
        </a>

        <section className="mt-6 border border-[#243b43] bg-[#0b1519] p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-300">Frame set name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full border border-[#2c424a] bg-[#071015] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-300">Effect style</span>
              <select value={effectStyle} onChange={(event) => setEffectStyle(event.target.value as CustomGhost360EffectStyle)} className="mt-2 w-full border border-[#2c424a] bg-[#071015] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300">
                {EFFECT_STYLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-300">Product ID</span>
              <input value={productId} onChange={(event) => setProductId(event.target.value)} placeholder="gid://shopify/Product/..." className="mt-2 w-full border border-[#2c424a] bg-[#071015] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-300">Product handle</span>
              <input value={productHandle} onChange={(event) => setProductHandle(event.target.value)} placeholder="optional-product-handle" className="mt-2 w-full border border-[#2c424a] bg-[#071015] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300" />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-300">Frame count</span>
              <select value={frameCount} onChange={(event) => changeFrameCount(Number(event.target.value))} className="mt-2 border border-[#2c424a] bg-[#071015] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300">
                {FRAME_COUNTS.map((count) => <option key={count} value={count}>{count} frame{count === 1 ? "" : "s"}</option>)}
              </select>
            </label>
            <label className="mt-6 flex items-center gap-3 text-sm font-bold text-neutral-200">
              <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
              Enable on storefront after assignment
            </label>
            <label className="mt-6 cursor-pointer border border-cyan-300 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300 hover:text-neutral-950">
              Upload multiple frames
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={addMultipleFrames} />
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {draftFrames.map((frame, index) => (
              <div key={index} className="border border-[#243b43] bg-[#071015] p-3 text-sm text-neutral-200">
                <label>
                  <span className="font-bold">{index + 1}. {frameLabel(index, frameCount)}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-xs" onChange={(event) => updateFrame(index, event)} />
                </label>
                {frame?.file.name ? <span className="mt-2 block truncate text-xs text-cyan-200">{frame.file.name}</span> : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" disabled={index === 0} onClick={() => moveDraftFrame(index, -1)} className="border border-[#2c424a] px-2 py-1 text-xs font-bold disabled:opacity-40">Up</button>
                  <button type="button" disabled={index === draftFrames.length - 1} onClick={() => moveDraftFrame(index, 1)} className="border border-[#2c424a] px-2 py-1 text-xs font-bold disabled:opacity-40">Down</button>
                  <button type="button" disabled={!frame} onClick={() => setDraftFrame(index, null)} className="border border-red-400/50 px-2 py-1 text-xs font-bold text-red-100 disabled:opacity-40">Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(260px,420px)_1fr]">
            <CustomGhost360Viewer frameUrls={activePreviewUrls} fallbackImageUrl={activePreviewUrls[0]} effectStyle={effectStyle} className="border border-[#243b43]" />
            <div className="flex flex-col justify-between gap-4">
              <div className="text-sm text-neutral-300">
                <p>Upload order is the rotation order. The 8-frame guide is Front, Front angled, Side, Back angled, Back, Back angled opposite, Side opposite, Front angled opposite.</p>
                <p className={`mt-3 text-xs ${shopify?.configured ? "text-emerald-200" : "text-yellow-100"}`}>
                  Shopify sync: {shopify?.configured ? `ready (${shopify.apiVersion})` : "blocked until SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN are configured"}
                </p>
                {draftWarnings.length ? <p className="mt-3 text-xs text-yellow-100">{draftWarnings.join(" ")}</p> : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => saveFrameSet(true)} disabled={isSaving || activePreviewUrls.length === 0} className="border border-cyan-300 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-50">
                  {isSaving ? "Saving..." : "Save Draft"}
                </button>
                <button type="button" onClick={() => saveFrameSet(false)} disabled={isSaving || activePreviewUrls.length === 0} className="bg-[#4A0F14] px-5 py-3 text-sm font-black text-white transition hover:bg-[#64151c] disabled:cursor-not-allowed disabled:opacity-50">
                  {isSaving ? "Saving..." : "Save Frame Set"}
                </button>
              </div>
            </div>
          </div>
          {status ? <p className="mt-4 border border-cyan-300/30 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-100">{status}</p> : null}
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-black text-white">Saved Frame Sets</h2>
          <div className="mt-4 grid gap-4">
            {frameSets.map((frameSet) => {
              const frames = [...frameSet.frames].sort((left, right) => left.order - right.order);
              return (
                <article key={frameSet.id} className="border border-[#243b43] bg-[#0b1519] p-4">
                  <div className="grid gap-5 lg:grid-cols-[minmax(240px,360px)_1fr]">
                    <CustomGhost360Viewer frameUrls={frames.map((frame) => frame.imageUrl)} fallbackImageUrl={frameSet.fallbackImageUrl} effectStyle={frameSet.effectStyle} className="border border-[#243b43]" />
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-white">{frameSet.name}</p>
                          <p className="mt-1 text-xs text-neutral-400">{frames.length} of {frameSet.frameCount || frames.length} frames / {frameSet.effectStyle} / {frameSet.enabled ? "enabled" : "draft"}</p>
                          <p className="mt-1 break-all text-xs text-neutral-500">{frameSet.productId || frameSet.productHandle || "No product assigned"}</p>
                          <p className="mt-1 text-xs text-neutral-500">Shopify sync: {frameSet.metafieldsSyncedAt || "not synced"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={busyId === frameSet.id} onClick={() => updateFrameSet(frameSet.id, "assign-product", { frameCount: frameSet.frameCount || frames.length })} className="border border-cyan-300 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300 hover:text-neutral-950">Assign to product</button>
                          <button type="button" disabled={busyId === frameSet.id} onClick={() => updateFrameSet(frameSet.id, "update-settings", { enabled: false, frameCount: frameSet.frameCount || frames.length, effectStyle: frameSet.effectStyle })} className="border border-[#2c424a] px-3 py-2 text-xs font-bold text-neutral-200 transition hover:border-cyan-300">Save draft</button>
                          <button type="button" disabled={busyId === frameSet.id || !shopify?.configured || frames.length === 0} title={shopify?.configured ? "Manually sync Ghost 360 metafields to Shopify" : "Missing Shopify Admin API environment variables"} onClick={() => updateFrameSet(frameSet.id, "sync-shopify-metafields", { productId: frameSet.productId || productId })} className="bg-[#4A0F14] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#64151c] disabled:cursor-not-allowed disabled:opacity-50">Sync Shopify metafields</button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2">
                        {frames.map((frame, index) => (
                          <div key={frame.id} className="flex flex-wrap items-center justify-between gap-3 border border-[#243b43] bg-[#071015] px-3 py-2 text-xs text-neutral-300">
                            <span className="min-w-0 flex-1 truncate">{index + 1}. {frame.label} / {frame.width && frame.height ? `${frame.width}x${frame.height} / ` : ""}{frame.fileName || frame.imageUrl}</span>
                            <span className="flex gap-2">
                              <button type="button" disabled={busyId === frameSet.id || index === 0} onClick={() => updateFrameSet(frameSet.id, "move-frame", { frameIndex: index, direction: "up" })} className="border border-[#2c424a] px-2 py-1 font-bold text-neutral-200 disabled:opacity-40">Up</button>
                              <button type="button" disabled={busyId === frameSet.id || index === frames.length - 1} onClick={() => updateFrameSet(frameSet.id, "move-frame", { frameIndex: index, direction: "down" })} className="border border-[#2c424a] px-2 py-1 font-bold text-neutral-200 disabled:opacity-40">Down</button>
                              <button type="button" disabled={busyId === frameSet.id || frames.length === 0} onClick={() => updateFrameSet(frameSet.id, "delete-frame", { frameId: frame.id })} className="border border-red-400/50 px-2 py-1 font-bold text-red-100 disabled:opacity-40">Delete</button>
                            </span>
                          </div>
                        ))}
                      </div>

                      {frameSet.warnings?.length ? <p className="mt-3 text-xs text-yellow-100">{frameSet.warnings.join(" ")}</p> : null}
                    </div>
                  </div>
                </article>
              );
            })}
            {frameSets.length === 0 ? <p className="border border-[#243b43] bg-[#0b1519] p-4 text-sm text-neutral-400">No Custom Ghost 360 frame sets yet.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
