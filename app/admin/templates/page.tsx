"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AdminNav from "../AdminNav";

const DEFAULT_LAYER = {
  id: "headline",
  type: "text",
  name: "Headline",
  text: "Edit Text",
  x: 50,
  y: 45,
  width: 70,
  height: 16,
  rotation: 0,
  opacity: 1,
  color: "#67e8f9",
  fontId: "inter",
  fontFamily: "Inter, Arial, sans-serif",
  fontSize: 32,
  textAlign: "center",
  locked: false,
  hidden: false,
  zIndex: 0,
  canDelete: true,
  canMove: true,
  canResize: true,
};

type TemplateRecord = {
  id: string;
  name: string;
  slug: string;
  category: string;
  productType: string;
  mode: "apparel" | "transfer" | "both";
  targetView?: string;
  description: string;
  previewImageUrl?: string;
  thumbnailUrl?: string;
  tags: string[];
  layers: unknown[];
  active: boolean;
};

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<TemplateRecord | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Logos");
  const [productType, setProductType] = useState("t-shirt");
  const [mode, setMode] = useState<"apparel" | "transfer" | "both">("apparel");
  const [targetView, setTargetView] = useState("front");
  const [description, setDescription] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [active, setActive] = useState(true);
  const [layersJson, setLayersJson] = useState(JSON.stringify([DEFAULT_LAYER], null, 2));

  const sortedTemplates = useMemo(() => [...templates].sort((a, b) => a.name.localeCompare(b.name)), [templates]);

  async function loadTemplates() {
    const response = await fetch("/api/admin/customizer-templates", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(result.message || result.error || "Unable to load templates.");
      return;
    }
    setTemplates(Array.isArray(result.templates) ? result.templates : []);
  }

  useEffect(() => {
    let isActive = true;
    fetch("/api/admin/customizer-templates", { cache: "no-store" })
      .then((response) => response.json().then((result) => ({ response, result })))
      .then(({ response, result }) => {
        if (!isActive) return;
        if (!response.ok) {
          setStatus(result.message || result.error || "Unable to load templates.");
          return;
        }
        setTemplates(Array.isArray(result.templates) ? result.templates : []);
      })
      .catch(() => {
        if (isActive) setStatus("Unable to load templates.");
      });
    return () => {
      isActive = false;
    };
  }, []);

  function startEdit(template: TemplateRecord) {
    setEditing(template);
    setName(template.name);
    setCategory(template.category);
    setProductType(template.productType);
    setMode(template.mode);
    setTargetView(template.targetView || "front");
    setDescription(template.description);
    setPreviewImageUrl(template.previewImageUrl || template.thumbnailUrl || "");
    setActive(template.active);
    setLayersJson(JSON.stringify(template.layers, null, 2));
  }

  function resetForm() {
    setEditing(null);
    setName("");
    setCategory("Logos");
    setProductType("t-shirt");
    setMode("apparel");
    setTargetView("front");
    setDescription("");
    setPreviewImageUrl("");
    setActive(true);
    setLayersJson(JSON.stringify([DEFAULT_LAYER], null, 2));
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    let layers: unknown[];
    try {
      const parsed = JSON.parse(layersJson);
      layers = Array.isArray(parsed) ? parsed : [];
    } catch {
      setStatus("Layer JSON is invalid.");
      return;
    }
    const response = await fetch("/api/admin/customizer-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: {
          id: editing?.id,
          name,
          category,
          productType,
          mode,
          targetView: mode === "transfer" ? undefined : targetView,
          description,
          previewImageUrl,
          thumbnailUrl: previewImageUrl,
          active,
          tags: [category, productType, mode],
          layers,
        },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(Array.isArray(result.errors) ? result.errors.join(" ") : "Template save failed.");
      return;
    }
    setStatus("Template saved. Active templates are available to the preview library.");
    resetForm();
    await loadTemplates();
  }

  async function deleteTemplate(id: string) {
    const response = await fetch(`/api/admin/customizer-templates?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(Array.isArray(result.errors) ? result.errors.join(" ") : "Template delete failed.");
      return;
    }
    setStatus("Template deleted.");
    await loadTemplates();
  }

  return (
    <main className="min-h-screen bg-[#071015] text-neutral-100">
      <AdminNav />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Customizer Admin</p>
          <h1 className="mt-2 text-3xl font-black text-white">Editable Templates</h1>
          <p className="mt-2 text-sm text-neutral-400">Active templates load into the customer preview. Hardcoded templates remain as fallback when this store is empty.</p>
          <div className="mt-6 grid gap-3">
            {sortedTemplates.map((template) => (
              <article key={template.id} className="rounded-xl border border-[#243b43] bg-[#0b1519] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-white">{template.name}</h2>
                    <p className="text-sm text-neutral-400">{template.category} / {template.productType} / {template.mode}</p>
                    <p className="mt-1 text-xs text-neutral-500">{template.layers.length} layers / {template.active ? "Active" : "Inactive"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(template)} className="rounded-md border border-cyan-300/60 px-3 py-1.5 text-sm font-semibold text-cyan-100">Edit</button>
                    <button type="button" onClick={() => deleteTemplate(template.id)} className="rounded-md border border-red-400/50 px-3 py-1.5 text-sm font-semibold text-red-100">Delete</button>
                  </div>
                </div>
              </article>
            ))}
            {sortedTemplates.length === 0 ? <p className="rounded-xl border border-[#243b43] bg-[#0b1519] p-4 text-sm text-neutral-400">No admin templates yet.</p> : null}
          </div>
        </section>

        <form onSubmit={saveTemplate} className="rounded-xl border border-[#243b43] bg-[#0b1519] p-4">
          <h2 className="text-xl font-black text-white">{editing ? "Edit Template" : "Create Template"}</h2>
          {status ? <p className="mt-3 rounded-md border border-cyan-300/30 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-100">{status}</p> : null}
          <div className="mt-4 grid gap-3">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Template name" className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2" />
            <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category" className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2" />
            <input value={productType} onChange={(event) => setProductType(event.target.value)} placeholder="Product type" className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2" />
            <select value={mode} onChange={(event) => setMode(event.target.value as "apparel" | "transfer" | "both")} className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2">
              <option value="apparel">Apparel</option>
              <option value="transfer">Transfer</option>
              <option value="both">Both</option>
            </select>
            <select value={targetView} onChange={(event) => setTargetView(event.target.value)} className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2">
              <option value="front">Front</option>
              <option value="back">Back</option>
              <option value="leftSleeve">Left Sleeve</option>
              <option value="rightSleeve">Right Sleeve</option>
              <option value="neckTag">Neck Tag</option>
            </select>
            <input value={previewImageUrl} onChange={(event) => setPreviewImageUrl(event.target.value)} placeholder="Preview image URL" className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2" />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" className="h-20 rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2" />
            <label className="flex items-center gap-2 text-sm text-neutral-300">
              <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
              Active
            </label>
            <textarea value={layersJson} onChange={(event) => setLayersJson(event.target.value)} className="h-72 rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2 font-mono text-xs" />
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-2 font-black text-neutral-950">Save Template</button>
              <button type="button" onClick={resetForm} className="rounded-lg border border-[#2c424a] px-4 py-2 font-semibold text-neutral-200">Reset</button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
