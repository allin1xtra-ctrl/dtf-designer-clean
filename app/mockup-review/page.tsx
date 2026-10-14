import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Premium Blank Garment Review | Your Favorite DTF Plug",
  description: "Original unbranded oversized garment concepts for future mockup replacement.",
  robots: { index: false, follow: false },
};
const garments = [
  ["Oversized T-shirt", "Boxy fit, dropped shoulders, heavy cotton", "Front, back, both sleeves, neck", "t-shirts"],
  ["Oversized hoodie", "Relaxed fit, substantial hood, heavyweight fleece", "Front, back, both sleeves, neck", "hoodies"],
  ["Sweatpants", "Relaxed wide legs, elastic waist, cuffed hems", "Front, back, both legs", "pants"],
  ["Oversized shorts", "Relaxed above-knee fit, elastic waist", "Front, back, both legs", "shorts"],
];
export default function MockupReview() {
  return <main className="min-h-screen bg-neutral-950 px-5 py-12 text-white sm:px-8">
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="text-sm text-gray-300 underline">← Home</Link>
      <p className="mt-8 text-sm uppercase tracking-widest text-orange-300">Garment collection review</p>
      <h1 className="mt-3 text-3xl font-black sm:text-5xl">Premium blanks. Ready for your artwork.</h1>
      <p className="mt-5 max-w-3xl text-gray-300">Original unbranded oversized T-shirts, hoodies, sweatpants and shorts. Review the shape, fabric appearance and matching front and back views below.</p>
      <p className="mt-4 rounded-xl border border-orange-300/30 bg-orange-300/10 p-4 text-sm text-orange-100">Concept review only. Existing editor mockups remain active. These images illustrate garment direction and do not confirm a supplied physical product.</p>
      <figure className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-neutral-200">
        <Image src="/premium-mockups/v1/reference-board.webp" width={1254} height={1254} sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1087px) calc(100vw - 64px), 1024px" alt="Four rows of blank charcoal garments: oversized T-shirt, hoodie, sweatpants and shorts. Front views left, matching back views right. No branding or printed artwork." className="h-auto w-full" />
        <figcaption className="bg-neutral-900 p-4 text-sm text-gray-300">Top to bottom: T-shirt, hoodie, sweatpants, shorts. Front on the left; back on the right.</figcaption>
      </figure>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">{garments.map(([name,description,views,id]) => <article key={id} className="rounded-xl border border-white/10 bg-neutral-900 p-5"><h2 className="text-xl font-bold">{name}</h2><p className="mt-2 text-gray-300">{description}</p><p className="mt-3 text-sm text-gray-400">Final view set: {views}.</p></article>)}</div>
      <p className="mt-8 text-sm text-gray-400">Artwork position, proportions, colors and print boundaries will be retained when final mockups are installed. The gang-sheet artwork area and sheet are both 13 × 60 inches.</p>
    </div>
  </main>;
}
