"use client";

import { useMemo, useState } from "react";
import { PROTECTED_LIVE_STATE } from "@/lib/admin-doctor/protected-state";
import type { DoctorCheck, DoctorHealthReport, DoctorStatus } from "@/lib/admin-doctor/checks";
import type { DoctorPlan, DoctorMode } from "@/lib/admin-doctor/planner";

type RequestState = "idle" | "loading" | "error";

const statusStyles: Record<DoctorStatus, { label: string; className: string }> = {
  pass: { label: "Pass", className: "border-emerald-500/40 bg-emerald-950/30 text-emerald-100" },
  warn: { label: "Warn", className: "border-yellow-500/40 bg-yellow-950/30 text-yellow-100" },
  fail: { label: "Fail", className: "border-red-500/40 bg-red-950/40 text-red-100" },
};

function StatusPill({ status }: { status: DoctorStatus }) {
  const style = statusStyles[status];
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}

function CheckCard({ check }: { check: DoctorCheck }) {
  return (
    <article className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{check.label}</h3>
          <p className="mt-1 text-sm text-neutral-300">{check.summary}</p>
        </div>
        <StatusPill status={check.status} />
      </div>
      <div className="mt-3 text-xs uppercase tracking-wide text-neutral-500">Risk: {check.risk}</div>
      <ul className="mt-3 space-y-1 text-sm text-neutral-400">
        {check.details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>
    </article>
  );
}

function PlanPanel({ plan }: { plan: DoctorPlan | null }) {
  if (!plan) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5 text-sm text-neutral-400">
        Generate a Research Mode or Safe Fix Mode plan to see a PR-ready diagnostic outline.
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{plan.title}</h2>
        <span className="rounded-full border border-neutral-700 px-3 py-1 text-xs uppercase text-neutral-300">
          Risk: {plan.riskLevel}
        </span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-200">Problem Found</h3>
          <p className="mt-1 text-sm text-neutral-400">{plan.issueSummary}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-200">Root Cause</h3>
          <p className="mt-1 text-sm text-neutral-400">{plan.likelyCause}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-200">Suggested Fix</h3>
          <p className="mt-1 text-sm text-neutral-400">{plan.suggestedFix}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-200">Manual Approval</h3>
          <p className="mt-1 text-sm text-neutral-400">
            {plan.manualApprovalRequired ? "Required before any code change." : "Not required."}
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <ListBlock title="Files To Inspect" items={plan.filesToInspect} />
        <ListBlock title="Commands To Run" items={plan.commandsToRun} />
        <ListBlock title="Test Checklist" items={plan.testChecklist} />
        <ListBlock title="Blocked Actions" items={plan.blockedActions} />
      </div>
      <div className="mt-5">
        <ListBlock title="Official Docs To Prefer" items={plan.officialDocsToPrefer} />
      </div>
    </section>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-200">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-neutral-400">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function AiDoctorDashboard() {
  const [adminToken, setAdminToken] = useState("");
  const [health, setHealth] = useState<DoctorHealthReport | null>(null);
  const [plan, setPlan] = useState<DoctorPlan | null>(null);
  const [issue, setIssue] = useState("Review the current customizer health and prepare a safe repair plan.");
  const [state, setState] = useState<RequestState>("idle");
  const [error, setError] = useState("");

  const sortedChecks = useMemo(() => {
    if (!health) return [];
    const order: Record<DoctorStatus, number> = { fail: 0, warn: 1, pass: 2 };
    return [...health.checks].sort((a, b) => order[a.status] - order[b.status]);
  }, [health]);

  const authHeaders = () => ({
    "Content-Type": "application/json",
    "x-admin-token": adminToken,
  });

  const runHealthCheck = async () => {
    setState("loading");
    setError("");
    try {
      const response = await fetch("/api/admin/ai-doctor/health", {
        cache: "no-store",
        headers: authHeaders(),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Health check failed.");
      setHealth(json as DoctorHealthReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health check failed.");
      setState("error");
      return;
    }
    setState("idle");
  };

  const generatePlan = async (mode: DoctorMode) => {
    setState("loading");
    setError("");
    try {
      const response = await fetch("/api/admin/ai-doctor/plan", {
        method: "POST",
        cache: "no-store",
        headers: authHeaders(),
        body: JSON.stringify({ mode, issue }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Plan generation failed.");
      setPlan(json as DoctorPlan);
      if (!health) {
        await runHealthCheck();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan generation failed.");
      setState("error");
      return;
    }
    setState("idle");
  };

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-6 text-neutral-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-neutral-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-cyan-300">DTF Designer Pro Admin</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">AI Admin Doctor</h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-400">
              Diagnose app health, protect the live customizer, and generate safe repair plans without deploying or changing production.
            </p>
          </div>
          <div className="w-full max-w-sm">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-400" htmlFor="admin-token">
              Admin Token
            </label>
            <input
              id="admin-token"
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
              placeholder="Required for protected checks"
            />
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <div className="text-xs uppercase tracking-wide text-neutral-500">App Health</div>
            <div className="mt-3">{health ? <StatusPill status={health.overallStatus} /> : <span className="text-sm text-neutral-400">Not run</span>}</div>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <div className="text-xs uppercase tracking-wide text-neutral-500">Protected Tag</div>
            <div className="mt-3 text-sm font-semibold text-white">{PROTECTED_LIVE_STATE.liveCustomizerTag}</div>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <div className="text-xs uppercase tracking-wide text-neutral-500">Backup Commit</div>
            <div className="mt-3 text-sm font-semibold text-white">{PROTECTED_LIVE_STATE.backupCommit}</div>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <div className="text-xs uppercase tracking-wide text-neutral-500">Production Safety</div>
            <div className="mt-3 text-sm font-semibold text-emerald-200">No auto deploys</div>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <label className="text-sm font-semibold text-neutral-200" htmlFor="doctor-issue">
                Research / Fix Plan Prompt
              </label>
              <textarea
                id="doctor-issue"
                value={issue}
                onChange={(event) => setIssue(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runHealthCheck}
                disabled={state === "loading"}
                className="rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-60"
              >
                Run Health Check
              </button>
              <button
                type="button"
                onClick={() => generatePlan("research")}
                disabled={state === "loading"}
                className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Research Mode
              </button>
              <button
                type="button"
                onClick={() => generatePlan("safe-fix")}
                disabled={state === "loading"}
                className="rounded-md border border-yellow-600 px-4 py-2 text-sm font-semibold text-yellow-100 disabled:opacity-60"
              >
                Generate Fix Plan
              </button>
            </div>
          </div>
          {error ? <p className="mt-4 rounded-md border border-red-700 bg-red-950 px-3 py-2 text-sm text-red-100">{error}</p> : null}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Health Checks</h2>
              <span className="text-xs text-neutral-500">{health?.generatedAt ? `Last run: ${health.generatedAt}` : "No recent run"}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {sortedChecks.length ? sortedChecks.map((check) => <CheckCard key={check.id} check={check} />) : (
                <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5 text-sm text-neutral-400 md:col-span-2">
                  Run a health check to inspect customizer route, iframe/CTA assumptions, protected placement, Fabric handlers, cart bridge, build config, and env presence.
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
              <h2 className="text-lg font-semibold text-white">Protected Live Values</h2>
              <div className="mt-4 space-y-3 text-sm text-neutral-300">
                <p>Front: x 30, y 19, width 42, height 61, max 12 x 16</p>
                <p>Back: x 25, y 19, width 48, height 59, max 12 x 16</p>
                <p>Neck aliases: x 41, y 13, width 18, height 12</p>
              </div>
            </section>
            <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
              <h2 className="text-lg font-semibold text-white">Manual Restore Notes</h2>
              <ul className="mt-4 space-y-2 text-sm text-neutral-400">
                <li>Checkpoint tag: {PROTECTED_LIVE_STATE.liveCustomizerTag}</li>
                <li>Backup branch: {PROTECTED_LIVE_STATE.backupBranch}</li>
                <li>Upgrade branch: {PROTECTED_LIVE_STATE.upgradeBranch}</li>
                <li>Do not restore or edit protected placement without manual approval.</li>
              </ul>
            </section>
            <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
              <h2 className="text-lg font-semibold text-white">Risk Warnings</h2>
              <ul className="mt-4 space-y-2 text-sm text-neutral-400">
                {PROTECTED_LIVE_STATE.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </section>
          </aside>
        </section>

        <section className="mt-6">
          <PlanPanel plan={plan} />
        </section>
      </div>
    </main>
  );
}
