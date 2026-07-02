import GhostMannequin360Viewer from "@/components/product/GhostMannequin360Viewer";
import AdminNav from "../../AdminNav";

function frameDataUrl(label: string, color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
      <rect width="900" height="900" fill="#f6f1e8"/>
      <path d="M325 145 C365 105 535 105 575 145 L628 245 L570 282 L548 220 L548 720 L352 720 L352 220 L330 282 L272 245 Z" fill="${color}" stroke="#2f2722" stroke-width="10"/>
      <path d="M390 150 C420 185 480 185 510 150" fill="none" stroke="#2f2722" stroke-width="10" stroke-linecap="round"/>
      <text x="450" y="810" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#4A0F14">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const frames = [
  frameDataUrl("Front", "#f3eadb"),
  frameDataUrl("Front Left", "#ead9c3"),
  frameDataUrl("Left", "#dfc9ae"),
  frameDataUrl("Back Left", "#d6b994"),
  frameDataUrl("Back", "#caa87e"),
  frameDataUrl("Back Right", "#d6b994"),
  frameDataUrl("Right", "#dfc9ae"),
  frameDataUrl("Front Right", "#ead9c3"),
];

export default function GhostMannequin360ViewerTestPage() {
  return (
    <main className="min-h-screen bg-[#071015] text-neutral-100">
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Product Image AI</p>
        <h1 className="mt-2 text-3xl font-black text-white">360 Viewer Test</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="text-lg font-black text-white">Drag / Swipe Viewer</h2>
            <GhostMannequin360Viewer frameUrls={frames} alt="Test ghost mannequin 360 product view" className="mt-3 aspect-square border border-[#243b43]" />
          </section>
          <section>
            <h2 className="text-lg font-black text-white">Static Fallback</h2>
            <GhostMannequin360Viewer frameUrls={frames.slice(0, 2)} fallbackImageUrl={frames[0]} alt="Static ghost mannequin fallback" className="mt-3 aspect-square border border-[#243b43]" />
          </section>
        </div>
      </div>
    </main>
  );
}
