"use client";

import { useState } from "react";

const products = ["DTF Transfers by Size", "Gang Sheet Upload", "Custom T-Shirts", "Custom Hoodies", "Wholesale / Bulk Order"];

export default function QuotePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [product, setProduct] = useState(products[0]);
  const [quantity, setQuantity] = useState("1");
  const [size, setSize] = useState("");
  const [artwork, setArtwork] = useState("");
  const [details, setDetails] = useState("");
  const [copied, setCopied] = useState(false);
  const destination = process.env.NEXT_PUBLIC_DTF_ORDER_EMAIL || "info@yourdtfplug.com";
  const summary = `Your Favorite DTF Plug — Quote Request\nCustomer: ${name}\nEmail: ${email}\nProduct: ${product}\nQuantity: ${quantity}\nDimensions: ${size || "Not supplied"}\nArtwork link: ${artwork || "Not supplied"}\nInstructions: ${details || "None"}`;
  const mailto = `mailto:${encodeURIComponent(destination)}?subject=${encodeURIComponent("DTF Quote Request - " + product)}&body=${encodeURIComponent(summary)}`;

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="text-sm text-gray-300 underline">← Home</a>
        <p className="mt-8 text-sm font-bold uppercase tracking-widest text-orange-400">Your Favorite DTF Plug</p>
        <h1 className="mt-3 text-4xl font-black">Request a Custom Quote</h1>
        <p className="mt-3 text-gray-300">Tell us about your order. No payment is collected here. We will confirm pricing and production details before accepting an order.</p>
        <form className="mt-8 space-y-5" onSubmit={e => { e.preventDefault(); if (destination) window.location.href = mailto; }}>
          <label className="block">Your name or business<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-lg border border-neutral-600 bg-neutral-900 p-3" /></label>
          <label className="block">Your email<input required type="email" maxLength={200} value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-neutral-600 bg-neutral-900 p-3" /></label>
          <label className="block">Product<select value={product} onChange={e => setProduct(e.target.value)} className="mt-2 w-full rounded-lg border border-neutral-600 bg-neutral-900 p-3">{products.map(p => <option key={p}>{p}</option>)}</select></label>
          <label className="block">Quantity<input type="number" min="1" max="100000" required value={quantity} onChange={e => setQuantity(e.target.value)} className="mt-2 w-full rounded-lg border border-neutral-600 bg-neutral-900 p-3" /></label>
          <label className="block">Print dimensions (inches)<input placeholder="e.g. 10 x 12" maxLength={100} value={size} onChange={e => setSize(e.target.value)} className="mt-2 w-full rounded-lg border border-neutral-600 bg-neutral-900 p-3" /></label>
          <label className="block">Artwork share link (optional)<input type="url" placeholder="https://..." maxLength={1000} value={artwork} onChange={e => setArtwork(e.target.value)} className="mt-2 w-full rounded-lg border border-neutral-600 bg-neutral-900 p-3" /><span className="mt-1 block text-sm text-gray-400">For now, share a Google Drive or Dropbox link. Direct file uploads are not enabled on this form.</span></label>
          <label className="block">Instructions<textarea rows={4} maxLength={3000} value={details} onChange={e => setDetails(e.target.value)} className="mt-2 w-full rounded-lg border border-neutral-600 bg-neutral-900 p-3" /></label>
          {destination ? <button type="submit" className="w-full rounded-xl bg-orange-500 px-6 py-4 font-bold text-black">Open Email to Send Quote Request</button> : <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">Online sending is not configured yet. Copy your request below; no information is transmitted.</p>}
          <button type="button" className="w-full rounded-xl border border-white/30 px-6 py-4 font-bold" onClick={async () => { await navigator.clipboard.writeText(summary); setCopied(true); }}> {copied ? "Copied request" : "Copy Order Request"} </button>
        </form>
        <p className="mt-8 text-sm text-gray-400">Quotes are subject to artwork review, payment, and production availability. This form is not an online checkout or confirmed purchase order.</p>
      </div>
    </main>
  );
}
