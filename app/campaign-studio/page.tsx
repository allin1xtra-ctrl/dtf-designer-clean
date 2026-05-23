"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

type CampaignResult = {
  concept: string;
  variants: { headline: string; body: string }[];
  checklist: string[];
  imagePrompts: string[];
  images: string[];
};

export default function CampaignStudioPage() {
  const [campaignBrief, setCampaignBrief] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [productDetails, setProductDetails] = useState("");
  const [tone, setTone] = useState("");
  const [channels, setChannels] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CampaignResult | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/campaign-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignBrief, targetAudience, productDetails, tone, channels }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setResult(null);
        setError(payload.error || "Request failed.");
        return;
      }

      setResult(payload as CampaignResult);
    } catch {
      setError("Unexpected network error. Please try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-100">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[420px,1fr]">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-3xl font-bold">Campaign Concept Studio</h1>
          <p className="mt-2 text-sm text-neutral-300">
            Client submits strategy inputs only. OpenAI calls happen server-side in <code>/api/campaign-studio</code>.
          </p>

          <form className="mt-5 space-y-3" onSubmit={onSubmit}>
            {[
              ["Campaign brief", campaignBrief, setCampaignBrief],
              ["Target audience", targetAudience, setTargetAudience],
              ["Product details", productDetails, setProductDetails],
              ["Tone", tone, setTone],
              ["Desired channels", channels, setChannels],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="block">
                <span className="mb-1 block text-sm font-medium">{label as string}</span>
                <textarea
                  required
                  rows={3}
                  value={value as string}
                  onChange={(event) => (setter as (v: string) => void)(event.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/40 p-3 text-sm outline-none ring-cyan-400/40 transition focus:ring"
                />
              </label>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Generating campaign..." : "Generate Campaign"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          {!result && !error && !loading && (
            <div className="flex h-full min-h-[300px] items-center justify-center text-neutral-400">
              Submit a brief to generate concept, copy, checklist, and images.
            </div>
          )}

          {loading && <p className="text-cyan-300">Working on strategy and creative direction...</p>}
          {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-200">{error}</p>}

          {result && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Campaign Concept</h2>
                <p className="mt-2 text-neutral-200">{result.concept}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold">Headline + Body Variants</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {result.variants.map((variant, idx) => (
                    <article key={idx} className="rounded-xl border border-white/10 bg-black/30 p-4">
                      <p className="text-sm font-semibold text-cyan-300">Option {idx + 1}</p>
                      <p className="mt-1 font-medium">{variant.headline}</p>
                      <p className="mt-2 text-sm text-neutral-300">{variant.body}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold">Launch Checklist</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-300">
                  {result.checklist.map((task, idx) => (
                    <li key={idx}>{task}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold">Direction Prompts + Generated Images</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  {result.images.map((image, idx) => (
                    <article key={idx} className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <p className="text-xs text-neutral-400">{result.imagePrompts[idx]}</p>
                      <Image src={image} alt={`Campaign direction ${idx + 1}`} width={1024} height={1024} className="mt-2 h-auto w-full rounded-lg" unoptimized />
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
