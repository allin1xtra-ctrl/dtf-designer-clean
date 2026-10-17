import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom Apparel",
  description:
    "Customize T-shirts, hoodies, sweatpants, and shorts with Your Favorite DTF Plug.",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-20 text-center">
        <p className="mb-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm uppercase tracking-[0.3em] text-gray-300">
          Your Favorite DTF Plug
        </p>

        <h1 className="max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
          Custom Apparel. Your Artwork.
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-gray-300">
          Request a quote for custom T-shirts, hoodies, sweatpants,
          or shorts. Share your artwork link, quantity, and garment sizes so we
          can confirm production details and pricing.
        </p>

        <div className="mt-10 flex flex-col flex-wrap justify-center gap-4 sm:flex-row">
          <a
            href="/samples"
            className="rounded-full border border-orange-400/40 bg-orange-400/10 px-8 py-4 font-bold text-orange-200 transition hover:bg-orange-400/20"
          >
            View Printing Samples
          </a>
          <a
            href="/quote"
            className="rounded-full bg-white px-8 py-4 font-bold text-black transition hover:scale-105 hover:bg-gray-200"
          >
            Request Apparel Quote
          </a>
          <a
            href="/customizer"
            className="rounded-full border border-white/20 px-8 py-4 font-bold text-white transition hover:bg-white/10"
          >
            Customize Your Apparel
          </a>
          <a
            href="/quote"
            className="rounded-full border border-white/20 px-8 py-4 font-bold text-white transition hover:bg-white/10"
          >
            Request Custom Apparel Quote
          </a>
          <a
            href="/quote"
            className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-8 py-4 font-bold text-cyan-200 transition hover:bg-cyan-400/20"
          >
            Request Bulk Order Quote
          </a>
        </div>

        <a href="/samples" className="mt-6 inline-block rounded-full border border-orange-400/40 bg-orange-400/10 px-8 py-4 font-bold text-orange-200 transition hover:bg-orange-400/20">View Printing Samples</a>

        <div className="mt-12 grid max-w-5xl gap-4 text-left md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-bold">Custom T-Shirts &amp; Hoodies</h2>
            <p className="mt-2 text-sm text-gray-300">
              Personalize premium apparel with your own artwork and text.
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-bold">Sweatpants &amp; Shorts</h2>
            <p className="mt-2 text-sm text-gray-300">
              Preview your artwork on oversized sweatpants and shorts.
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-bold">Custom Apparel Orders</h2>
            <p className="mt-2 text-sm text-gray-300">
              Tell us what you need, share an artwork link, and request
              custom apparel pricing before placing an order.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
