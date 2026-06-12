"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import AdminNav from "../AdminNav";

const VIEW_OPTIONS = [
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "leftSleeve", label: "Left Sleeve" },
  { id: "rightSleeve", label: "Right Sleeve" },
  { id: "neckTag", label: "Neck Tag" },
  { id: "leftLeg", label: "Left Leg" },
  { id: "rightLeg", label: "Right Leg" },
  { id: "chest", label: "Chest" },
] as const;

const DEFAULT_APPAREL_PRODUCTS = [
  { name: "T-Shirts", type: "t-shirts", views: ["front", "back", "leftSleeve", "rightSleeve", "neckTag"] },
  { name: "Hoodies", type: "hoodies", views: ["front", "back", "leftSleeve", "rightSleeve", "neckTag"] },
  { name: "Jerseys", type: "jerseys", views: ["front", "back", "leftSleeve", "rightSleeve", "neckTag"] },
  { name: "Shorts", type: "shorts", views: ["front", "back", "leftLeg", "rightLeg"] },
  { name: "Pants", type: "pants", views: ["front", "back", "leftLeg", "rightLeg"] },
  { name: "Jackets", type: "jackets", views: ["front", "back", "leftSleeve", "rightSleeve", "chest", "neckTag"] },
  { name: "Sweaters", type: "sweaters", views: ["front", "back", "leftSleeve", "rightSleeve", "neckTag"] },
] as const;

type ProductRecord = {
  id: string;
  name: string;
  slug: string;
  type: string;
  views?: string[];
  active: boolean;
};

type PrintAreaRecord = {
  x: number;
  y: number;
  width: number;
  height: number;
  widthInches?: number;
  heightInches?: number;
};

type VariantRecord = {
  id: string;
  productId: string;
  colorName: string;
  colorSlug: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  leftSleeveImageUrl?: string;
  rightSleeveImageUrl?: string;
  neckTagImageUrl?: string;
  additionalViews?: Record<string, string>;
  printAreas?: Record<string, PrintAreaRecord>;
  hasBakedPrintGuide?: Record<string, boolean>;
  editableViews?: Record<string, boolean>;
  active: boolean;
};

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "apparel-product";
}

function getViewLabel(viewId: string) {
  return VIEW_OPTIONS.find((view) => view.id === viewId)?.label || viewId;
}

function getViewImageField(viewId: string) {
  if (viewId === "front") return "frontImageUrl";
  if (viewId === "back") return "backImageUrl";
  if (viewId === "leftSleeve") return "leftSleeveImageUrl";
  if (viewId === "rightSleeve") return "rightSleeveImageUrl";
  if (viewId === "neckTag") return "neckTagImageUrl";
  return "";
}

function defaultPrintAreaForView(viewId: string): PrintAreaRecord {
  if (viewId === "neckTag") return { x: 50, y: 43, width: 28, height: 17, widthInches: 4, heightInches: 2.5 };
  if (viewId.includes("Sleeve")) return { x: 50, y: 50, width: 30, height: 42, widthInches: 3.5, heightInches: 12 };
  if (viewId.includes("Leg")) return { x: 50, y: 52, width: 32, height: 52, widthInches: 4, heightInches: 12 };
  if (viewId === "chest") return { x: 42, y: 39, width: 24, height: 22, widthInches: 4, heightInches: 4 };
  if (viewId === "back") return { x: 49, y: 48.5, width: 48, height: 59, widthInches: 12, heightInches: 16 };
  return { x: 50, y: 50.5, width: 38, height: 61, widthInches: 12, heightInches: 16 };
}

export default function AdminProductTypesPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [variants, setVariants] = useState<VariantRecord[]>([]);
  const [status, setStatus] = useState("");
  const [productName, setProductName] = useState("");
  const [productHandle, setProductHandle] = useState("");
  const [productViews, setProductViews] = useState<string[]>(["front", "back"]);
  const [productActive, setProductActive] = useState(true);
  const [variantProductId, setVariantProductId] = useState("");
  const [editingVariantId, setEditingVariantId] = useState("");
  const [mockupViewId, setMockupViewId] = useState("front");
  const [colorName, setColorName] = useState("");
  const [activeVariant, setActiveVariant] = useState(true);
  const [viewImageUrls, setViewImageUrls] = useState<Record<string, string>>({});
  const [printAreas, setPrintAreas] = useState<Record<string, PrintAreaRecord>>({});
  const [uploadingViewId, setUploadingViewId] = useState("");

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === variantProductId) || products[0],
    [products, variantProductId]
  );
  const selectedViews = selectedProduct?.views?.length ? selectedProduct.views : ["front", "back"];

  async function loadMockups() {
    const response = await fetch("/api/admin/customizer-mockups", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(result.error || "Unable to load mockup products.");
      return;
    }
    const nextProducts = Array.isArray(result.products) ? result.products : [];
    setProducts(nextProducts);
    setVariants(Array.isArray(result.variants) ? result.variants : []);
    setVariantProductId((current) => current || nextProducts[0]?.id || "");
  }

  useEffect(() => {
    let isActive = true;
    loadMockups().catch(() => {
      if (isActive) setStatus("Unable to load mockup products.");
    });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setPrintAreas((current) => {
      const next = { ...current };
      selectedViews.forEach((viewId) => {
        next[viewId] = next[viewId] || defaultPrintAreaForView(viewId);
      });
      return next;
    });
    setMockupViewId((current) => selectedViews.includes(current) ? current : selectedViews[0] || "front");
  }, [selectedViews.join("|")]);

  function toggleProductView(viewId: string) {
    setProductViews((current) =>
      current.includes(viewId) ? current.filter((id) => id !== viewId) : [...current, viewId]
    );
  }

  function updatePrintArea(viewId: string, key: keyof PrintAreaRecord, value: string) {
    setPrintAreas((current) => ({
      ...current,
      [viewId]: {
        ...(current[viewId] || defaultPrintAreaForView(viewId)),
        [key]: Number(value),
      },
    }));
  }

  function getVariantImageUrl(variant: VariantRecord, viewId: string) {
    const field = getViewImageField(viewId);
    if (field && field in variant) return String(variant[field as keyof VariantRecord] || "");
    return variant.additionalViews?.[viewId] || "";
  }

  function editVariant(variant: VariantRecord) {
    const product = products.find((item) => item.id === variant.productId);
    const views = product?.views?.length ? product.views : selectedViews;
    setVariantProductId(variant.productId);
    setEditingVariantId(variant.id);
    setColorName(variant.colorName);
    setActiveVariant(variant.active);
    setViewImageUrls(views.reduce<Record<string, string>>((urls, viewId) => {
      urls[viewId] = getVariantImageUrl(variant, viewId);
      return urls;
    }, {}));
    setPrintAreas(views.reduce<Record<string, PrintAreaRecord>>((areas, viewId) => {
      areas[viewId] = variant.printAreas?.[viewId] || defaultPrintAreaForView(viewId);
      return areas;
    }, {}));
    setMockupViewId(views[0] || "front");
    setStatus(`${variant.colorName} mockup set loaded for editing.`);
  }

  function resetVariantForm() {
    setEditingVariantId("");
    setColorName("");
    setViewImageUrls({});
    setActiveVariant(true);
    setPrintAreas(selectedViews.reduce<Record<string, PrintAreaRecord>>((areas, viewId) => {
      areas[viewId] = defaultPrintAreaForView(viewId);
      return areas;
    }, {}));
  }

  async function uploadMockupImage(viewId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingViewId(viewId);
    setStatus(`Uploading ${getViewLabel(viewId)} mockup image...`);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/admin/customizer-media", { method: "POST", body: formData });
    const result = await response.json().catch(() => ({}));
    setUploadingViewId("");
    if (!response.ok || !result.mediaAsset?.url) {
      const message = Array.isArray(result.errors)
        ? result.errors.join(" ")
        : Array.isArray(result.warnings)
          ? result.warnings.join(" ")
          : "Upload did not return a hosted mockup URL.";
      setStatus(message);
      return;
    }
    setViewImageUrls((current) => ({ ...current, [viewId]: result.mediaAsset.url }));
    const warnings = Array.isArray(result.warnings) ? ` ${result.warnings.join(" ")}` : "";
    setStatus(`${getViewLabel(viewId)} mockup uploaded and ready to save.${warnings}`);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = productName.trim();
    const type = slugify(productHandle || productName);
    const response = await fetch("/api/admin/customizer-mockups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "product", product: { id: type, name, slug: type, type, views: productViews, active: productActive } }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(Array.isArray(result.errors) ? result.errors.join(" ") : "Product type save failed.");
      return;
    }
    setProductName("");
    setProductHandle("");
    setProductViews(["front", "back"]);
    setProductActive(true);
    setStatus("Product type saved.");
    await loadMockups();
  }

  async function saveVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const additionalViews: Record<string, string> = {};
    const baseFields: Record<string, string> = {};
    selectedViews.forEach((viewId) => {
      const value = viewImageUrls[viewId]?.trim();
      if (!value) return;
      const field = getViewImageField(viewId);
      if (field) baseFields[field] = value;
      else additionalViews[viewId] = value;
    });

    const response = await fetch("/api/admin/customizer-mockups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "variant",
        variant: {
          productId: variantProductId,
          id: editingVariantId || undefined,
          colorName,
          ...baseFields,
          additionalViews,
          printAreas: selectedViews.reduce<Record<string, PrintAreaRecord>>((areas, viewId) => {
            areas[viewId] = printAreas[viewId] || defaultPrintAreaForView(viewId);
            return areas;
          }, {}),
          hasBakedPrintGuide: {},
          editableViews: selectedViews.reduce<Record<string, boolean>>((views, viewId) => {
            views[viewId] = true;
            return views;
          }, {}),
          active: activeVariant,
        },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(Array.isArray(result.errors) ? result.errors.join(" ") : "Mockup variant save failed.");
      return;
    }
    setColorName("");
    setEditingVariantId("");
    setViewImageUrls({});
    setActiveVariant(true);
    setStatus("Mockup color set saved.");
    await loadMockups();
  }

  function seedProductForm(seed: typeof DEFAULT_APPAREL_PRODUCTS[number]) {
    setProductName(seed.name);
    setProductHandle(seed.type);
    setProductViews([...seed.views]);
    setProductActive(true);
  }

  return (
    <main className="min-h-screen bg-[#071015] text-neutral-100">
      <AdminNav />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Customizer Admin</p>
          <h1 className="mt-2 text-3xl font-black text-white">Mockup Product Manager</h1>
          <p className="mt-2 text-sm text-neutral-400">Manage apparel product types, color mockup sets, print locations, and placement boxes for the upgraded Custom Design Studio.</p>
          {status ? <p className="mt-4 rounded-md border border-cyan-300/30 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-100">{status}</p> : null}

          <div className="mt-6 grid gap-3">
            {products.map((product) => {
              const productVariants = variants.filter((variant) => variant.productId === product.id);
              return (
                <article key={product.id} className="rounded-lg border border-[#243b43] bg-[#0b1519] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-black text-white">{product.name}</h2>
                      <p className="text-sm text-neutral-400">{product.type} / {product.active ? "Active" : "Inactive"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVariantProductId(product.id);
                        setStatus(`${product.name} selected for mockup editing.`);
                      }}
                      className="rounded-md border border-cyan-300/60 px-3 py-1.5 text-xs font-black text-cyan-100 transition hover:bg-cyan-300 hover:text-neutral-950"
                    >
                      Edit Mockups
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-neutral-500">{productVariants.length} color mockup sets</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(product.views?.length ? product.views : ["front", "back"]).map((viewId) => (
                      <span key={viewId} className="rounded-full border border-[#2c424a] bg-[#071015] px-2 py-1 text-xs font-semibold text-neutral-300">
                        {getViewLabel(viewId)}
                      </span>
                    ))}
                  </div>
                  {product.type === "hoodies" && productVariants.length === 0 ? (
                    <p className="mt-3 rounded-md border border-yellow-400/30 bg-yellow-950/20 px-3 py-2 text-xs text-yellow-100">
                      Hoodie support is ready. Upload hoodie front, back, sleeve, and neck-tag mockup images to replace placeholder canvas art.
                    </p>
                  ) : null}
                  {productVariants.length ? (
                    <div className="mt-3 grid gap-2">
                      {productVariants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => editVariant(variant)}
                          className="flex items-center justify-between gap-3 rounded-md border border-[#2c424a] bg-[#071015] px-3 py-2 text-left text-xs text-neutral-300 transition hover:border-cyan-300"
                        >
                          <span className="font-black text-white">{variant.colorName}</span>
                          <span>{variant.active ? "Active" : "Inactive"} / {Object.keys(variant.printAreas || {}).length} locations</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid content-start gap-4">
          <form onSubmit={saveProduct} className="rounded-lg border border-[#243b43] bg-[#0b1519] p-4">
            <h2 className="text-xl font-black text-white">Add / Update Product Type</h2>
            <div className="mt-4 grid gap-3">
              <input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Product type name, e.g. Hoodies" className="rounded-md border border-[#2c424a] bg-[#071015] px-3 py-2" />
              <input value={productHandle} onChange={(event) => setProductHandle(event.target.value)} placeholder="Product handle/key, e.g. hoodies" className="rounded-md border border-[#2c424a] bg-[#071015] px-3 py-2" />
              <div className="grid grid-cols-2 gap-2">
                {VIEW_OPTIONS.map((view) => (
                  <label key={view.id} className="flex items-center gap-2 rounded-md border border-[#2c424a] bg-[#071015] px-3 py-2 text-sm">
                    <input type="checkbox" checked={productViews.includes(view.id)} onChange={() => toggleProductView(view.id)} className="accent-cyan-300" />
                    {view.label}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input type="checkbox" checked={productActive} onChange={(event) => setProductActive(event.target.checked)} className="accent-cyan-300" />
                Active product type
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_APPAREL_PRODUCTS.map((seed) => (
                  <button key={seed.type} type="button" onClick={() => seedProductForm(seed)} className="rounded-md border border-[#2c424a] px-2.5 py-1 text-xs font-semibold text-neutral-300 hover:border-cyan-300">
                    {seed.name}
                  </button>
                ))}
              </div>
              <button type="submit" className="rounded-md border border-cyan-300 bg-cyan-300 px-4 py-2 font-black text-neutral-950">Save Product Type</button>
            </div>
          </form>

          <form onSubmit={saveVariant} className="rounded-lg border border-[#243b43] bg-[#0b1519] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-white">{editingVariantId ? "Edit Mockup Color Set" : "Add Mockup Color Set"}</h2>
              {editingVariantId ? (
                <button type="button" onClick={resetVariantForm} className="rounded-md border border-[#2c424a] px-2.5 py-1 text-xs font-semibold text-neutral-300 hover:border-cyan-300">
                  New Set
                </button>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3">
              <select value={variantProductId} onChange={(event) => setVariantProductId(event.target.value)} className="rounded-md border border-[#2c424a] bg-[#071015] px-3 py-2">
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              <select
                value={mockupViewId}
                onChange={(event) => setMockupViewId(event.target.value)}
                className="rounded-md border border-[#2c424a] bg-[#071015] px-3 py-2"
              >
                {selectedViews.map((viewId) => <option key={viewId} value={viewId}>{getViewLabel(viewId)}</option>)}
              </select>
              <input
                value={colorName}
                onChange={(event) => setColorName(event.target.value)}
                placeholder="Color variant name, e.g. Black, White, Heather Grey, Red, Navy"
                className="rounded-md border border-[#2c424a] bg-[#071015] px-3 py-2"
              />
              <div className="flex flex-wrap gap-2">
                {["Black", "White", "Heather Grey", "Red", "Navy"].map((preset) => (
                  <button key={preset} type="button" onClick={() => setColorName(preset)} className="rounded-md border border-[#2c424a] px-2.5 py-1 text-xs font-semibold text-neutral-300 hover:border-cyan-300">
                    {preset}
                  </button>
                ))}
              </div>
              {[mockupViewId].map((viewId) => {
                const area = printAreas[viewId] || defaultPrintAreaForView(viewId);
                return (
                  <div key={viewId} className="rounded-md border border-[#20343b] bg-[#071015] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-white">{getViewLabel(viewId)}</p>
                      {viewImageUrls[viewId] ? <span className="text-[11px] font-semibold text-emerald-300">Image URL set</span> : <span className="text-[11px] font-semibold text-yellow-200">Placeholder until saved URL is set</span>}
                    </div>
                    <label className="mt-2 block cursor-pointer rounded-md border border-dashed border-cyan-300/50 bg-cyan-950/20 px-3 py-2 text-center text-xs font-black text-cyan-100 transition hover:bg-cyan-900/30">
                      {uploadingViewId === viewId ? "Uploading..." : `Upload ${getViewLabel(viewId)} PNG/JPG/WEBP`}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => uploadMockupImage(viewId, event)}
                        className="hidden"
                        disabled={uploadingViewId === viewId}
                      />
                    </label>
                    <input
                      value={viewImageUrls[viewId] || ""}
                      onChange={(event) => setViewImageUrls((current) => ({ ...current, [viewId]: event.target.value }))}
                      placeholder={`${getViewLabel(viewId)} mockup image URL or uploaded URL`}
                      className="mt-2 w-full rounded-md border border-[#2c424a] bg-[#0b1519] px-3 py-2 text-sm"
                    />
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(["widthInches", "heightInches", "x", "y", "width", "height"] as const).map((key) => (
                        <label key={key} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                          {key}
                          <input
                            type="number"
                            step="0.1"
                            value={area[key] ?? ""}
                            onChange={(event) => updatePrintArea(viewId, key, event.target.value)}
                            className="mt-1 w-full rounded border border-[#2c424a] bg-[#0b1519] px-2 py-1 text-sm text-neutral-100"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input type="checkbox" checked={activeVariant} onChange={(event) => setActiveVariant(event.target.checked)} className="accent-cyan-300" />
                Active color variant
              </label>
              <button type="submit" className="rounded-md border border-cyan-300 bg-cyan-300 px-4 py-2 font-black text-neutral-950">Save Mockup Set</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
