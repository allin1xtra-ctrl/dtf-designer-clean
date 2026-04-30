import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-20 text-center">
        <p className="mb-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm uppercase tracking-[0.3em] text-gray-300">
          DTF Designer Pro
        </p>

        <h1 className="max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
          Create custom DTF transfers and apparel designs live.
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-gray-300">
          Upload artwork, add text, design front, back, and sleeve placements,
          then send the finished custom design into Shopify checkout.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/customizer"
            className="rounded-full bg-white px-8 py-4 font-bold text-black transition hover:scale-105 hover:bg-gray-200"
          >
            Launch Customizer
          </Link>

          <a
            href="https://yourdtfplug.com"
            className="rounded-full border border-white/20 px-8 py-4 font-bold text-white transition hover:bg-white/10"
          >
            Visit Store
          </a>
        </div>
      </section>
    </main>
  );
}