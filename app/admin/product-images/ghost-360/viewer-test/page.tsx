import AdminNav from "../../../AdminNav";
import CustomGhost360Viewer from "@/components/product/CustomGhost360Viewer";

function frameDataUrl(label: string, color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
      <rect width="900" height="900" fill="#ffffff"/>
      <ellipse cx="450" cy="720" rx="170" ry="34" fill="#000000" opacity="0.14"/>
      <path d="M325 145 C365 105 535 105 575 145 L628 245 L570 282 L548 220 L548 700 L352 700 L352 220 L330 282 L272 245 Z" fill="${color}" stroke="#2f2722" stroke-width="10"/>
      <path d="M390 150 C420 185 480 185 510 150" fill="none" stroke="#2f2722" stroke-width="10" stroke-linecap="round"/>
      <text x="450" y="810" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#4A0F14">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const frames = [
  frameDataUrl("Front", "#f3eadb"),
  frameDataUrl("Front Left", "#ead9c3"),
  frameDataUrl("Back", "#d6b994"),
  frameDataUrl("Front Right", "#ead9c3"),
];

export default function CustomGhost360ViewerTestPage() {
  return (
    <main className="min-h-screen bg-[#071015] text-neutral-100">
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Product Image Effects</p>
        <h1 className="mt-2 text-3xl font-black text-white">Custom Ghost 360 Viewer Test</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section>
            <h2 className="text-lg font-black text-white">One Image Fallback</h2>
            <CustomGhost360Viewer frameUrls={[frames[0]]} effectStyle="floor-shadow" className="mt-3 border border-[#243b43]" />
          </section>
          <section>
            <h2 className="text-lg font-black text-white">Front / Back</h2>
            <CustomGhost360Viewer frameUrls={[frames[0], frames[2]]} effectStyle="ghost-fade" className="mt-3 border border-[#243b43]" />
          </section>
          <section>
            <h2 className="text-lg font-black text-white">4+ Frames</h2>
            <CustomGhost360Viewer frameUrls={frames} effectStyle="reflection" className="mt-3 border border-[#243b43]" />
          </section>
        </div>
      </div>
    </main>
  );
}
