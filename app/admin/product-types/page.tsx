"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminNav from "../AdminNav";

type ProductRecord = { id: string; name: string; slug: string; type: string; active: boolean };
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
  active: boolean;
};

export default function AdminProductTypesPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [variants, setVariants] = useState<VariantRecord[]>([]);
  const [status, setStatus] = useState("");
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState("t-shirt");
  const [variantProductId, setVariantProductId] = useState("");
  const [colorName, setColorName] = useState("");
  const [frontImageUrl, setFrontImageUrl] = useState("");
  const [backImageUrl, setBackImageUrl] = useState("");
  const [leftSleeveImageUrl, setLeftSleeveImageUrl] = useState("");
  const [rightSleeveImageUrl, setRightSleeveImageUrl] = useState("");
  const [neckTagImageUrl, setNeckTagImageUrl] = useState("");

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
    fetch("/api/admin/customizer-mockups", { cache: "no-store" })
      .then((response) => response.json().then((result) => ({ response, result })))
      .then(({ response, result }) => {
        if (!isActive) return;
        if (!response.ok) {
          setStatus(result.error || "Unable to load mockup products.");
          return;
        }
        const nextProducts = Array.isArray(result.products) ? result.products : [];
        setProducts(nextProducts);
        setVariants(Array.isArray(result.variants) ? result.variants : []);
        setVariantProductId((current) => current || nextProducts[0]?.id || "");
      })
      .catch(() => {
        if (isActive) setStatus("Unable to load mockup products.");
      });
    return () => {
      isActive = false;
    };
  }, []);

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/customizer-mockups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "product", product: { name: productName, type: productType, active: true } }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(Array.isArray(result.errors) ? result.errors.join(" ") : "Product type save failed.");
      return;
    }
    setProductName("");
    setProductType("t-shirt");
    setStatus("Product type saved.");
    await loadMockups();
  }

  async function saveVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/customizer-mockups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "variant",
        variant: {
          productId: variantProductId,
          colorName,
          frontImageUrl,
          backImageUrl,
          leftSleeveImageUrl,
          rightSleeveImageUrl,
          neckTagImageUrl,
          additionalViews: {},
          printAreas: {
            front: { x: 50, y: 50.5, width: 38, height: 61 },
          },
          hasBakedPrintGuide: {},
          editableViews: { front: true, back: true, leftSleeve: true, rightSleeve: true, neckTag: true },
          active: true,
        },
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(Array.isArray(result.errors) ? result.errors.join(" ") : "Mockup variant save failed.");
      return;
    }
    setColorName("");
    setFrontImageUrl("");
    setBackImageUrl("");
    setLeftSleeveImageUrl("");
    setRightSleeveImageUrl("");
    setNeckTagImageUrl("");
    setStatus("Mockup variant saved.");
    await loadMockups();
  }

  return (
    <main className="min-h-screen bg-[#071015] text-neutral-100">
      <AdminNav />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-2">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Customizer Admin</p>
          <h1 className="mt-2 text-3xl font-black text-white">Mockups / Product Types</h1>
          <p className="mt-2 text-sm text-neutral-400">Manage product types and color mockup sets for t-shirts, hoodies, jackets, sweaters, shorts, sweatpants, jerseys, hats, and cups.</p>
          {status ? <p className="mt-4 rounded-md border border-cyan-300/30 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-100">{status}</p> : null}

          <div className="mt-6 grid gap-3">
            {products.map((product) => (
              <article key={product.id} className="rounded-xl border border-[#243b43] bg-[#0b1519] p-4">
                <h2 className="font-black text-white">{product.name}</h2>
                <p className="text-sm text-neutral-400">{product.type} / {product.active ? "Active" : "Inactive"}</p>
                <p className="mt-1 text-xs text-neutral-500">{variants.filter((variant) => variant.productId === product.id).length} color mockup sets</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          <form onSubmit={saveProduct} className="rounded-xl border border-[#243b43] bg-[#0b1519] p-4">
            <h2 className="text-xl font-black text-white">Create Product Type</h2>
            <div className="mt-4 grid gap-3">
              <input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Product type name, e.g. Hoodies" className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2" />
              <input value={productType} onChange={(event) => setProductType(event.target.value)} placeholder="Type slug, e.g. hoodie" className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2" />
              <button type="submit" className="rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-2 font-black text-neutral-950">Save Product Type</button>
            </div>
          </form>

          <form onSubmit={saveVariant} className="rounded-xl border border-[#243b43] bg-[#0b1519] p-4">
            <h2 className="text-xl font-black text-white">Add Mockup Color Set</h2>
            <div className="mt-4 grid gap-3">
              <select value={variantProductId} onChange={(event) => setVariantProductId(event.target.value)} className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2">
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              <input value={colorName} onChange={(event) => setColorName(event.target.value)} placeholder="Color name" className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2" />
              <input value={frontImageUrl} onChange={(event) => setFrontImageUrl(event.target.value)} placeholder="Front mockup image URL" className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2" />
              <input value={backImageUrl} onChange={(event) => setBackImageUrl(event.target.value)} placeholder="Back mockup image URL" className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2" />
              <input value={leftSleeveImageUrl} onChange={(event) => setLeftSleeveImageUrl(event.target.value)} placeholder="Left sleeve image URL" className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2" />
              <input value={rightSleeveImageUrl} onChange={(event) => setRightSleeveImageUrl(event.target.value)} placeholder="Right sleeve image URL" className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2" />
              <input value={neckTagImageUrl} onChange={(event) => setNeckTagImageUrl(event.target.value)} placeholder="Neck tag image URL" className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2" />
              <button type="submit" className="rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-2 font-black text-neutral-950">Save Mockup Set</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
