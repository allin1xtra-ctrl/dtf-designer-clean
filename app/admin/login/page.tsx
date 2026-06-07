"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const result = await response.json().catch(() => ({}));
    setIsSubmitting(false);
    if (!response.ok) {
      setStatus(result.error || "Admin login failed.");
      return;
    }
    router.replace(searchParams?.get("next") || "/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#071015] px-4 py-16 text-neutral-100">
      <form onSubmit={submitLogin} className="mx-auto max-w-md rounded-xl border border-cyan-300/25 bg-[#0b1519] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Protected Admin</p>
        <h1 className="mt-2 text-2xl font-black text-white">Sign in</h1>
        <p className="mt-2 text-sm text-neutral-400">Enter the configured admin token to manage customizer templates, mockups, and media.</p>
        <label className="mt-6 block text-sm font-semibold text-neutral-300" htmlFor="admin-token">
          Admin Token
        </label>
        <input
          id="admin-token"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          className="mt-2 w-full rounded-lg border border-[#2c424a] bg-[#081114] px-3 py-2 text-neutral-100 outline-none focus:border-cyan-300"
          autoComplete="current-password"
        />
        {status ? <p className="mt-3 rounded-md border border-red-400/40 bg-red-950/30 px-3 py-2 text-sm text-red-100">{status}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 w-full rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-2 font-black text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#071015] px-4 py-16 text-neutral-100" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
