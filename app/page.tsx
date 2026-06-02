import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom DTF Transfers, Gang Sheets & Custom Apparel",
  description:
    "Order premium custom DTF transfers, gang sheets, custom t-shirts, and hoodies with no minimums, vibrant color, fast turnaround, and easy online artwork upload.",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-20 text-center">
        <p className="mb-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm uppercase tracking-[0.3em] text-gray-300">
          Your Favorite DTF Plug
        </p>

        <h1 className="max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
          Custom DTF Transfers, Gang Sheets &amp; Apparel Printing
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-gray-300">
          Upload your artwork online and order custom DTF transfers, gang
          sheets, custom t-shirts, and custom hoodies with no minimums, vibrant
          color, and fast turnaround.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="https://yourdtfplug.com/collections/dtf-transfers-by-size"
            className="rounded-full bg-white px-8 py-4 font-bold text-black transition hover:scale-105 hover:bg-gray-200"
          >
            Order DTF Transfers
          </a>
          <a
            href="/customizer?dtf_mode=transfer&mode=transfer&transferSize=13x60"
            className="rounded-full border border-white/20 px-8 py-4 font-bold text-white transition hover:bg-white/10"
          >
            Build a Gang Sheet
          </a>
          <a
            href="https://yourdtfplug.com/products/custom-t-shirt-upload-customize"
            className="rounded-full border border-white/20 px-8 py-4 font-bold text-white transition hover:bg-white/10"
          >
            Customize Apparel
          </a>
          <a
            href="/campaign-studio"
            className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-8 py-4 font-bold text-cyan-200 transition hover:bg-cyan-400/20"
          >
            Campaign Concept Studio
          </a>
        </div>

        <div className="mt-12 grid max-w-5xl gap-4 text-left md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-bold">Custom DTF Transfers</h2>
            <p className="mt-2 text-sm text-gray-300">
              No minimum custom DTF transfers for apparel brands, events, and
              print shops.
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-bold">Gang Sheets</h2>
            <p className="mt-2 text-sm text-gray-300">
              Build your own custom gang sheet online to maximize sheet space
              and reduce print cost.
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-bold">Custom T-Shirts & Hoodies</h2>
            <p className="mt-2 text-sm text-gray-300">
              Upload your design, place artwork fast, and send custom apparel
              orders directly to checkout.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
