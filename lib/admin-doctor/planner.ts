import { DoctorCheck, DoctorHealthReport, runDoctorHealthChecks } from "./checks";
import { PROTECTED_LIVE_STATE } from "./protected-state";

export type DoctorMode = "research" | "safe-fix";

export type DoctorPlan = {
  mode: DoctorMode;
  generatedAt: string;
  title: string;
  issueSummary: string;
  likelyCause: string;
  filesToInspect: string[];
  suggestedFix: string;
  riskLevel: "low" | "medium" | "high";
  manualApprovalRequired: boolean;
  commandsToRun: string[];
  testChecklist: string[];
  blockedActions: string[];
  officialDocsToPrefer: string[];
  healthSnapshot: {
    overallStatus: DoctorHealthReport["overallStatus"];
    warnings: string[];
    failingChecks: Array<Pick<DoctorCheck, "id" | "label" | "status" | "summary" | "risk">>;
  };
};

function cleanIssue(issue: unknown) {
  const value = String(issue || "").trim();
  return value || "General customizer and admin health review requested.";
}

function inferRisk(report: DoctorHealthReport): DoctorPlan["riskLevel"] {
  if (report.checks.some((check) => check.status === "fail" || check.risk === "high")) return "high";
  if (report.checks.some((check) => check.status === "warn" || check.risk === "medium")) return "medium";
  return "low";
}

function inferFiles(issue: string, report: DoctorHealthReport) {
  const lowerIssue = issue.toLowerCase();
  const files = new Set<string>([
    "app/admin/ai-doctor/",
    "lib/admin-doctor/",
    "app/api/admin/ai-doctor/",
  ]);

  if (lowerIssue.includes("upload") || lowerIssue.includes("drag") || lowerIssue.includes("resize") || lowerIssue.includes("fabric")) {
    files.add("app/customizer/page.tsx");
  }

  if (lowerIssue.includes("cart") || lowerIssue.includes("checkout") || lowerIssue.includes("shopify")) {
    files.add("app/customizer/page.tsx");
    files.add("app/api/checkout/route.ts");
  }

  if (lowerIssue.includes("cta") || report.checks.some((check) => check.id === "checkCtaLinks" && check.status !== "pass")) {
    files.add("app/page.tsx");
  }

  if (report.checks.some((check) => check.id === "checkBuildConfig" && check.status !== "pass")) {
    files.add("package.json");
    files.add("next.config.ts");
    files.add("vercel.json");
  }

  return Array.from(files);
}

export function createDoctorPlan(mode: DoctorMode, issueInput: unknown): DoctorPlan {
  const issue = cleanIssue(issueInput);
  const report = runDoctorHealthChecks();
  const riskLevel = inferRisk(report);
  const failingChecks = report.checks
    .filter((check) => check.status !== "pass")
    .map(({ id, label, status, summary, risk }) => ({ id, label, status, summary, risk }));

  const protectedRules = PROTECTED_LIVE_STATE.rules.join(" ");
  const baseCause = failingChecks.length
    ? `The latest health snapshot found ${failingChecks.length} warning or failure condition(s). Review those checks before changing code.`
    : "No failing health checks were found. Treat the issue as a targeted investigation and avoid broad refactors.";

  const title = mode === "research" ? "AI Doctor Research Plan" : "AI Doctor Safe Fix Plan";

  return {
    mode,
    generatedAt: new Date().toISOString(),
    title,
    issueSummary: issue,
    likelyCause: baseCause,
    filesToInspect: inferFiles(issue, report),
    suggestedFix:
      mode === "research"
        ? "Inspect the listed files, compare behavior against the protected live checkpoint, then document the smallest safe change before editing."
        : "Prepare a narrow patch only after manual approval. Do not alter protected placement, checkout/cart behavior, Shopify files, environment variables, or production deployment.",
    riskLevel,
    manualApprovalRequired: true,
    commandsToRun: [
      "git status --short",
      "git branch --show-current",
      "git tag --list live-customizer-working-v3",
      "npm.cmd run build",
    ],
    testChecklist: [
      "Confirm branch is ai-admin-doctor-upgrade.",
      "Confirm protected Front and Back placement values match live-customizer-working-v3.",
      "Upload artwork on Front and verify it stays on Front only.",
      "Switch to Back and verify Back is empty unless Back has its own artwork.",
      "Resize uploaded artwork and verify it does not shift left.",
      "Run npm.cmd run build.",
      "Do not push, merge, or deploy production without approval.",
    ],
    blockedActions: [
      "No direct pushes to main.",
      "No production deploy or Vercel promotion.",
      "No automatic edits to protected placement values.",
      "No checkout/cart logic changes without explicit approval.",
      "No Shopify file changes unless specifically requested.",
      "No printing or exposing secret environment values.",
      protectedRules,
    ],
    officialDocsToPrefer: [
      "Next.js official docs for App Router and route handlers.",
      "Vercel official docs for build and deployment behavior.",
      "Vercel AI SDK official docs for tool-calling patterns if the SDK is added later.",
      "Shopify official docs for Admin API, storefront URLs, and iframe integration.",
      "Fabric.js official docs for canvas object movement, scaling, and serialization.",
      "OpenAI/Codex official docs for agent workflow and tool safety.",
    ],
    healthSnapshot: {
      overallStatus: report.overallStatus,
      warnings: report.warnings,
      failingChecks,
    },
  };
}
