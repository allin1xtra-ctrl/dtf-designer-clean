"use client";

import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";

type StatusBadgeProps = { ok: boolean; label: string; detail?: string };

function StatusBadge({ ok, label, detail }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        ok
          ? "bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-500/30"
          : "bg-red-950/60 text-red-300 ring-1 ring-red-500/30"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
      {ok ? label : detail || label}
    </span>
  );
}

type IntegrationCardProps = {
  title: string;
  description: string;
  ok: boolean;
  okLabel?: string;
  failLabel?: string;
  failDetail?: string;
  action?: React.ReactNode;
  items?: string[];
};

function IntegrationCard({
  title,
  description,
  ok,
  okLabel = "Ready",
  failLabel = "Not configured",
  failDetail,
  action,
  items,
}: IntegrationCardProps) {
  return (
    <div className="rounded-xl border border-[#1e343c] bg-[#0b1519] p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300/70">{title}</p>
          {items && (
            <p className="mt-0.5 text-xs text-neutral-500">{items.join(", ")}</p>
          )}
        </div>
        <StatusBadge ok={ok} label={ok ? okLabel : failLabel} detail={failDetail} />
      </div>
      <p className="text-sm text-neutral-400">{description}</p>
      {!ok && action && <div className="mt-4">{action}</div>}
    </div>
  );
}

type AuthStatus = {
  shopify: {
    oauthConfigured: boolean;
    adminConfigured: boolean;
    hasClientId: boolean;
    hasAppUrl: boolean;
    hasApiSecret: boolean;
    hasAdminToken: boolean;
    hasStoreDomain: boolean;
    connectUrl: string;
  };
  kv: { configured: boolean };
  openai: { configured: boolean };
};

export default function SettingsPage() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load integration status.");
        setLoading(false);
      });
  }, []);

  const shopify = status?.shopify;
  const shopifyReady = Boolean(shopify?.adminConfigured || shopify?.oauthConfigured);

  function shopifyFailDetail() {
    if (!shopify) return "Connection Required";
    const missing: string[] = [];
    if (!shopify.hasStoreDomain) missing.push("SHOPIFY_STORE_DOMAIN");
    if (!shopify.hasAdminToken) missing.push("SHOPIFY_ADMIN_ACCESS_TOKEN");
    if (!shopify.hasClientId) missing.push("SHOPIFY_API_KEY");
    if (!shopify.hasAppUrl) missing.push("SHOPIFY_APP_URL");
    if (!shopify.hasApiSecret) missing.push("SHOPIFY_API_SECRET");
    return missing.length ? `Missing: ${missing.join(", ")}` : "Connection Required";
  }

  return (
    <>
      <AdminNav />
      <main className="min-h-screen bg-[#071015] px-4 py-8 text-neutral-100">
        <div className="mx-auto max-w-3xl">
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-500/60">
            System Truth
          </p>
          <h1 className="mb-1 text-2xl font-black uppercase tracking-[0.08em] text-neutral-100">
            Settings &amp; Connections
          </h1>
          <p className="mb-8 text-sm text-neutral-500">
            Secrets are configured server-side only. Stored values are never returned to the
            browser.
          </p>

          {loading && (
            <p className="text-sm text-neutral-500">Loading integration status…</p>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {!loading && !error && status && (
            <div className="flex flex-col gap-4">
              {/* OpenAI */}
              <IntegrationCard
                title="OpenAI"
                description="Powers AI design generation, background removal, image enhancement, and campaign studio."
                ok={status.openai.configured}
                okLabel="Ready"
                failLabel="Not configured"
                failDetail="Set OPENAI_API_KEY in your environment variables."
              />

              {/* Shopify */}
              <IntegrationCard
                title="Shopify"
                items={["orders", "products", "fulfillment", "storefront"]}
                description={
                  shopifyReady
                    ? "Admin API and storefront integration are active."
                    : shopify?.oauthConfigured
                    ? "OAuth is configured server-side. Click Connect Shopify to authorize."
                    : "Shopify OAuth is not configured on the server yet. Set SHOPIFY_API_KEY, SHOPIFY_APP_URL, and SHOPIFY_API_SECRET to enable the OAuth install flow. For direct admin access, set SHOPIFY_ADMIN_ACCESS_TOKEN and SHOPIFY_STORE_DOMAIN."
                }
                ok={shopifyReady}
                okLabel="Ready"
                failLabel="Connection Required"
                failDetail={shopifyFailDetail()}
                action={
                  shopify?.oauthConfigured ? (
                    <a
                      href="/api/auth"
                      className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 active:bg-cyan-700"
                    >
                      Connect Shopify
                    </a>
                  ) : (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 px-4 py-3 text-xs text-amber-300">
                      Add <code className="font-mono text-amber-200">SHOPIFY_API_KEY</code>,{" "}
                      <code className="font-mono text-amber-200">SHOPIFY_APP_URL</code>, and{" "}
                      <code className="font-mono text-amber-200">SHOPIFY_API_SECRET</code> to your
                      Vercel environment variables, then redeploy to enable the Connect Shopify
                      button.
                    </div>
                  )
                }
              />

              {/* KV / Token store */}
              <IntegrationCard
                title="Token Store (Vercel KV)"
                description="Persists Shopify OAuth access tokens across deployments. Required for the OAuth install flow."
                ok={status.kv.configured}
                okLabel="Ready"
                failLabel="Not configured"
                failDetail="Set KV_REST_API_URL and KV_REST_API_TOKEN in your environment variables."
              />

              {/* Env reference */}
              <details className="rounded-xl border border-[#1e343c] bg-[#0b1519]">
                <summary className="cursor-pointer px-5 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:text-neutral-200">
                  Required environment variables
                </summary>
                <div className="border-t border-[#1e343c] px-5 py-4">
                  <p className="mb-3 text-xs text-neutral-500">
                    Add these to Vercel Project → Settings → Environment Variables, then redeploy.
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-neutral-500">
                        <th className="pb-2 font-semibold">Variable</th>
                        <th className="pb-2 font-semibold">Purpose</th>
                        <th className="pb-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e343c]">
                      {[
                        {
                          name: "SHOPIFY_STORE_DOMAIN",
                          purpose: "e.g. yourdtfplug.myshopify.com",
                          set: shopify?.hasStoreDomain,
                        },
                        {
                          name: "SHOPIFY_ADMIN_ACCESS_TOKEN",
                          purpose: "Admin API token (shpat_…)",
                          set: shopify?.hasAdminToken,
                        },
                        {
                          name: "SHOPIFY_API_KEY",
                          purpose: "OAuth app client ID",
                          set: shopify?.hasClientId,
                        },
                        {
                          name: "SHOPIFY_API_SECRET",
                          purpose: "OAuth app client secret",
                          set: shopify?.hasApiSecret,
                        },
                        {
                          name: "SHOPIFY_APP_URL",
                          purpose: "Public URL of this deployment",
                          set: shopify?.hasAppUrl,
                        },
                        {
                          name: "KV_REST_API_URL",
                          purpose: "Vercel KV REST endpoint",
                          set: status.kv.configured,
                        },
                        {
                          name: "KV_REST_API_TOKEN",
                          purpose: "Vercel KV auth token",
                          set: status.kv.configured,
                        },
                        {
                          name: "OPENAI_API_KEY",
                          purpose: "OpenAI API key",
                          set: status.openai.configured,
                        },
                      ].map(({ name, purpose, set }) => (
                        <tr key={name}>
                          <td className="py-2 pr-4 font-mono text-neutral-200">{name}</td>
                          <td className="py-2 pr-4 text-neutral-500">{purpose}</td>
                          <td className="py-2">
                            {set ? (
                              <span className="text-emerald-400">✓ Set</span>
                            ) : (
                              <span className="text-red-400">✗ Missing</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
