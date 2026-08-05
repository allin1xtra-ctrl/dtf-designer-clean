"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";

type Step = "email" | "code" | "success";

function OwnerSignupForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    fetch("/api/owner/session")
      .then((r) => r.json())
      .then((data: { authenticated?: boolean }) => {
        if (data?.authenticated) setStep("success");
      })
      .catch(() => undefined);
  }, []);

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/owner/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(result.error || "Failed to send code. Please try again.");
        return;
      }
      setStep("code");
    } catch {
      setStatus("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/owner/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(result.error || "Invalid code. Please try again.");
        return;
      }
      setStep("success");
    } catch {
      setStatus("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    await fetch("/api/owner/session", { method: "DELETE" }).catch(() => undefined);
    setStep("email");
    setEmail("");
    setCode("");
    setStatus("");
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[#071015] px-4 py-16 text-neutral-100 flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-cyan-300/25 bg-[#0b1519] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Owner Signup — Preview
        </p>
        <h1 className="mt-2 text-2xl font-black text-white">
          {step === "email" && "Sign in as Owner"}
          {step === "code" && "Enter Verification Code"}
          {step === "success" && "Signed In"}
        </h1>

        {/* Email step */}
        {step === "email" && (
          <form onSubmit={handleSendCode} className="mt-6 space-y-4">
            <p className="text-sm text-neutral-400">
              Enter the owner email address. A 9-digit verification code will be sent to that address.
            </p>
            <div>
              <label htmlFor="owner-email" className="block text-sm font-semibold text-neutral-300">
                Owner Email
              </label>
              <input
                id="owner-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[#2c424a] bg-[#081114] px-3 py-2 text-neutral-100 outline-none focus:border-cyan-300"
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
            {status && (
              <p className="rounded-md border border-red-400/40 bg-red-950/30 px-3 py-2 text-sm text-red-100">
                {status}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-2 font-black text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send Code"}
            </button>
          </form>
        )}

        {/* Code step */}
        {step === "code" && (
          <form onSubmit={handleVerifyCode} className="mt-6 space-y-4">
            <p className="text-sm text-neutral-400">
              A 9-digit code was sent to <strong className="text-neutral-200">{email}</strong>.
              Enter it below. The code expires in 10 minutes.
            </p>
            <div>
              <label htmlFor="owner-code" className="block text-sm font-semibold text-neutral-300">
                Verification Code
              </label>
              <input
                id="owner-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{9}"
                maxLength={9}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 9))}
                className="mt-2 w-full rounded-lg border border-[#2c424a] bg-[#081114] px-3 py-2 text-center text-2xl font-black tracking-[0.3em] text-neutral-100 outline-none focus:border-cyan-300"
                autoComplete="one-time-code"
                placeholder="000000000"
              />
            </div>
            {status && (
              <p className="rounded-md border border-red-400/40 bg-red-950/30 px-3 py-2 text-sm text-red-100">
                {status}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || code.length !== 9}
              className="w-full rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-2 font-black text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Verify Code"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("email"); setStatus(""); setCode(""); }}
              className="w-full rounded-lg border border-neutral-700 bg-transparent px-4 py-2 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200"
            >
              ← Back
            </button>
          </form>
        )}

        {/* Success step */}
        {step === "success" && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-neutral-400">
              You are signed in as owner
              {email ? (
                <>
                  {" "}(<strong className="text-neutral-200">{email}</strong>)
                </>
              ) : null}.
            </p>
            <div className="rounded-md border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
              ✓ Owner session active
            </div>
            <button
              onClick={handleSignOut}
              disabled={busy}
              className="w-full rounded-lg border border-neutral-700 bg-transparent px-4 py-2 text-sm text-neutral-400 transition hover:border-red-500/50 hover:text-red-300 disabled:opacity-60"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function OwnerSignupPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#071015] px-4 py-16 text-neutral-100 flex items-center justify-center">
          <p className="text-neutral-500 text-sm">Loading…</p>
        </main>
      }
    >
      <OwnerSignupForm />
    </Suspense>
  );
}
