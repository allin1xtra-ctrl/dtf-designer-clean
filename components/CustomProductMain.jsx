"use client";
import React, { useState } from "react";

const accentColors = {
  cyan: "#00fff7",
  magenta: "#ff00c8",
  yellow: "#ffe600"
};

const trustIcons = [
  { label: "Fast Turnaround", icon: "🚚" },
  { label: "Vibrant Prints", icon: "🌈" },
  { label: "Wash Resistant", icon: "🧼" },
  { label: "Secure Checkout", icon: "🔒" }
];

const processSteps = [
  { label: "Upload", icon: "📤" },
  { label: "Customize", icon: "🎨" },
  { label: "Print", icon: "🖨️" },
  { label: "Ship", icon: "📦" }
];

const qualityBullets = [
  "Vibrant colors that don't fade",
  "Soft feel after pressing",
  "Durable through washes",
  "High-resolution printing"
];

export default function CustomProductMain() {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const images = [
    "/images/product1.jpg",
    "/images/product2.jpg",
    "/images/product3.jpg"
  ];

  return (
    <section className="bg-[#0a0a0a] text-white min-h-screen flex flex-col items-center w-full">
      {/* Main Product Section */}
      <div className="w-full max-w-7xl flex flex-col md:flex-row gap-8 py-8 px-4 md:px-8">
        {/* Image Gallery */}
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full aspect-square bg-[#181818] rounded-lg overflow-hidden flex items-center justify-center relative group cursor-zoom-in">
            <img
              src={images[selectedImage]}
              alt="Product"
              className="object-contain w-full h-full transition-transform duration-200 group-hover:scale-105"
              onClick={() => window.open(images[selectedImage], "_blank")}
            />
          </div>
          <div className="flex gap-2 mt-4">
            {images.map((img, i) => (
              <button
                key={img}
                className={`w-16 h-16 rounded border-2 ${selectedImage === i ? "border-cyan-400" : "border-[#222]"}`}
                onClick={() => setSelectedImage(i)}
              >
                <img src={img} alt="Thumb" className="object-cover w-full h-full rounded" />
              </button>
            ))}
          </div>
        </div>
        {/* Product Info */}
        <div className="flex-1 flex flex-col gap-4 justify-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Your Favorite DTF Plug</h1>
          <p className="text-lg text-gray-200 mb-2">Premium custom apparel and DTF transfers. Unmatched color, durability, and feel. Designed for creators who demand the best.</p>
          <div className="text-2xl font-bold mb-2">$19.99</div>
          <div className="flex items-center gap-2 mb-4">
            <label htmlFor="quantity" className="text-gray-300">Qty:</label>
            <input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-16 px-2 py-1 rounded bg-[#181818] border border-[#333] text-white"
            />
          </div>
          <a
            href="/customizer"
            className="block w-full text-center py-3 rounded-lg font-bold text-xl mb-2"
            style={{
              background: `linear-gradient(90deg, ${accentColors.cyan}, ${accentColors.magenta}, ${accentColors.yellow})`,
              boxShadow: `0 0 16px 2px ${accentColors.cyan}, 0 0 32px 4px ${accentColors.magenta}`,
              color: "#fff",
              textShadow: "0 0 8px #00fff7, 0 0 16px #ff00c8"
            }}
          >
            Start Designing
          </a>
          <button className="w-full py-3 rounded-lg font-semibold text-lg bg-[#181818] border border-cyan-400 text-cyan-300 mb-4 hover:bg-cyan-900 transition">Add to Cart</button>
          {/* Trust Icons */}
          <div className="flex gap-4 mt-2 mb-2 flex-wrap">
            {trustIcons.map(({ label, icon }) => (
              <div key={label} className="flex items-center gap-2 text-sm bg-[#181818] px-3 py-1 rounded-full border border-[#222]">
                <span>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* 4-Step Process Bar */}
      <div className="w-full max-w-3xl flex items-center justify-between mt-8 mb-8 px-4 md:px-0">
        {processSteps.map((step, i) => (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#181818] border-2 border-cyan-400 text-2xl mb-1">{step.icon}</div>
              <span className="text-xs text-gray-300">{step.label}</span>
            </div>
            {i < processSteps.length - 1 && (
              <div className="flex-1 h-1 bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 mx-1 rounded-full" />
            )}
          </React.Fragment>
        ))}
      </div>
      {/* Product Quality Block */}
      <div className="w-full max-w-2xl bg-[#181818] rounded-lg p-6 mb-24 flex flex-col gap-4">
        <ul className="list-disc ml-6 text-cyan-300 text-base mb-2">
          {qualityBullets.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
        <div className="text-white text-base">Upload your design or create one using our designer tool.</div>
      </div>
      {/* Mobile Sticky Bar */}
      <div className="fixed bottom-0 left-0 w-full flex md:hidden z-50">
        <a
          href="/customizer"
          className="flex-1 py-4 text-center font-bold text-lg"
          style={{
            background: `linear-gradient(90deg, ${accentColors.cyan}, ${accentColors.magenta}, ${accentColors.yellow})`,
            boxShadow: `0 0 16px 2px ${accentColors.cyan}, 0 0 32px 4px ${accentColors.magenta}`,
            color: "#fff",
            textShadow: "0 0 8px #00fff7, 0 0 16px #ff00c8"
          }}
        >
          Start Designing
        </a>
        <button className="flex-1 py-4 text-center font-semibold text-lg bg-[#181818] border border-cyan-400 text-cyan-300">Add to Cart</button>
      </div>
    </section>
  );
}
