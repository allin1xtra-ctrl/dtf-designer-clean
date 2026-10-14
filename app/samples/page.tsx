import Link from "next/link";
import PortfolioPreview from "./PortfolioPreview";

const samples = [
  { file: "racing-23-front.webp", title: "Racing 23 — Front Logo", category: "Full-Color Logos" },
  { file: "racing-23-back.webp", title: "Racing 23 — Back Graphic", category: "Full-Color Logos" },
  { file: "proof-of-identity.webp", title: "Proof of Identity Wordmark", category: "Typography" },
  { file: "varsity-back.webp", title: "Varsity Logo — Back", category: "Typography" },
  { file: "varsity-front.webp", title: "Varsity Logo — Front", category: "Typography" },
  { file: "lemon-halftone.webp", title: "Lemon Character", category: "Halftone & Illustration" },
  { file: "portrait-halftone.webp", title: "Portrait Illustration", category: "Halftone & Illustration" },
  { file: "feathered-emblem.webp", title: "Feathered Emblem", category: "Halftone & Illustration" },
  { file: "doorway.webp", title: "Expressive Doorway", category: "Halftone & Illustration" },
  { file: "blue-portrait.webp", title: "Blue Portrait", category: "Halftone & Illustration" },
  { file: "style-verified-front.webp", title: "Style Verified — Front", category: "Typography" },
  { file: "style-verified-stacked.webp", title: "Style Verified — Stacked", category: "Typography" },
  { file: "true-stars.webp", title: "True Stars — Dark Colorway", category: "Full-Color Logos" },
  { file: "floral-woman-back.webp", title: "Woman in Bloom — Back", category: "Fine Line Artwork" },
  { file: "floral-rose-front.webp", title: "Rose — Front", category: "Fine Line Artwork" },
  { file: "double-face-line-art.webp", title: "Twin Faces — Line Art", category: "Fine Line Artwork" },
  { file: "true-stars-light.webp", title: "True Stars — Light Colorway", category: "Full-Color Logos" },
  { file: "true-stars-front.webp", title: "True Stars — Front Graphic", category: "Full-Color Logos" },
];

const categories = ["Full-Color Logos", "Typography", "Halftone & Illustration", "Fine Line Artwork"];

export const metadata = { title: "DTF Printing Samples | Your Favorite DTF Plug", description: "Examples of full-color, logo, typography, and halftone DTF artwork from True Authentic Apparel." };

export default function Samples() {
  return <main className="min-h-screen bg-neutral-950 text-white px-6 py-16">
    <div className="mx-auto max-w-6xl">
      <Link href="/" className="text-gray-300 underline text-sm">← Home</Link>
      <p className="mt-10 text-sm uppercase tracking-widest text-orange-400">Your Favorite DTF Plug</p>
      <h1 className="mt-2 text-4xl font-black md:text-6xl">DTF Printing Samples</h1>
      <p className="mt-5 max-w-3xl text-gray-300">Explore 18 approved printing-sample artwork previews, from crisp typography and racing graphics to fine-detail halftones. Featured designs: TRUE AUTHENTIC Apparel. Actual production quality depends on supplied artwork, print size, garment, and settings.</p>
      <Link href="/quote" className="mt-7 inline-block rounded-full bg-orange-500 px-7 py-3 font-bold text-black">Request a Print Quote</Link>
      {categories.map(category => <section key={category} className="mt-12" aria-label={category}>
        <h2 className="mb-5 text-2xl font-bold">{category}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {samples.filter(s => s.category === category).map((s) => <article key={s.file} className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900">
          <PortfolioPreview file={s.file} title={s.title} />
          <div className="p-5"><p className="text-xs uppercase tracking-wider text-orange-300">{s.category}</p><h3 className="mt-2 text-xl font-bold">{s.title}</h3><p className="mt-2 text-sm text-gray-400">Featured artwork: TRUE AUTHENTIC</p></div>
        </article>)}
        </div>
      </section>)}
      <p className="mt-10 text-sm text-gray-400">All shown artworks remain the property of their respective rights holders and are portfolio examples, not stock designs for resale.</p>
    </div>
  </main>;
}
