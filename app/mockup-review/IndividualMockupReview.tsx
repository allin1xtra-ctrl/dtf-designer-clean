"use client";

import Image from "next/image";
import { useState } from "react";
import { premiumMockupAssets } from "@/lib/premium-mockup-assets";

const products = [["t-shirts", "Oversized T-shirt"], ["hoodies", "Oversized hoodie"], ["pants", "Sweatpants"], ["shorts", "Oversized shorts"]];
const colors = [["black", "Black"], ["white", "White"], ["heather-grey", "Heather Grey"], ["regular-grey", "Regular Grey"], ["royal-blue", "Royal Blue"], ["red", "Red"], ["off-white", "Off White"]];
const viewNames: Record<string, string> = { front: "Front", back: "Back", leftSleeve: "Left sleeve", rightSleeve: "Right sleeve", neckTag: "Inside neck", leftLeg: "Left leg", rightLeg: "Right leg" };

export default function IndividualMockupReview() {
  const [product, setProduct] = useState("t-shirts");
  const [color, setColor] = useState("black");
  const [view, setView] = useState("front");
  const availableColors = colors.filter(([id]) => premiumMockupAssets.some(asset => asset.productId === product && asset.colorId === id));
  const available = premiumMockupAssets.filter(asset => asset.productId === product && asset.colorId === color);
  const selected = available.find(asset => asset.view === view) || available[0];
  return <section className="mt-10" aria-label="Individual garment mockups">
    <h2 className="text-2xl font-bold">Inspect individual mockups</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="text-sm">Garment<select className="mt-1 block w-full rounded-lg bg-neutral-800 p-3" value={product} onChange={e => {setProduct(e.target.value);setColor("black");setView("front");}}>{products.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="text-sm">Garment color<select className="mt-1 block w-full rounded-lg bg-neutral-800 p-3" value={color} onChange={e => setColor(e.target.value)}>{availableColors.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="text-sm">Mockup view<select className="mt-1 block w-full rounded-lg bg-neutral-800 p-3" value={selected?.view || ""} onChange={e => setView(e.target.value)}>{available.map(asset => <option key={asset.view} value={asset.view}>{viewNames[asset.view]}</option>)}</select></label>
    </div>
    {selected ? <figure className="mt-5 overflow-hidden rounded-xl border border-white/10">
      <div className="relative aspect-square" style={{backgroundImage:"repeating-conic-gradient(#737373 0% 25%, #a3a3a3 0% 50%)",backgroundSize:"20px 20px"}}>
        <Image src={selected.url} fill sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1087px) calc(100vw - 64px), 1024px" className="object-contain" alt={`${colors.find(([id])=>id===color)?.[1]} ${products.find(([id])=>id===product)?.[1]}, ${viewNames[selected.view]}. Blank and unbranded.`} />
      </div>
      <figcaption className="bg-neutral-900 p-4 text-sm text-gray-300">Blank garment preview. Artwork and print guides are separate editor layers.</figcaption>
    </figure> : <p className="mt-5 text-gray-400">This individual view is still being prepared.</p>}
  </section>;
}
