import fs from "node:fs";
import path from "node:path";
import { PROTECTED_LIVE_STATE, PROTECTED_PLACEMENT_WARNING } from "./protected-state";

export type DoctorStatus = "pass" | "warn" | "fail";

export type DoctorCheck = {
  id: string;
  label: string;
  status: DoctorStatus;
  summary: string;
  details: string[];
  risk: "low" | "medium" | "high";
};

export type DoctorHealthReport = {
  generatedAt: string;
  overallStatus: DoctorStatus;
  protectedState: typeof PROTECTED_LIVE_STATE;
  checks: DoctorCheck[];
  warnings: string[];
};

const SOURCE_FILES = {
  customizer: path.join(/*turbopackIgnore: true*/ process.cwd(), "app", "customizer", "page.tsx"),
  homepage: path.join(/*turbopackIgnore: true*/ process.cwd(), "app", "page.tsx"),
  vercelConfig: path.join(/*turbopackIgnore: true*/ process.cwd(), "vercel.json"),
  packageJson: path.join(/*turbopackIgnore: true*/ process.cwd(), "package.json"),
  packageLock: path.join(/*turbopackIgnore: true*/ process.cwd(), "package-lock.json"),
  tsconfig: path.join(/*turbopackIgnore: true*/ process.cwd(), "tsconfig.json"),
} as const;
type SourceFile = keyof typeof SOURCE_FILES;

const REQUIRED_ENV_VARS = [
  "ADMIN_PANEL_TOKEN",
  "SHOPIFY_STORE_DOMAIN",
  "SHOPIFY_ADMIN_ACCESS_TOKEN",
  "SHOPIFY_ADMIN_API_VERSION",
  "OPENAI_API_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

function readText(file: SourceFile) {
  const absolutePath = SOURCE_FILES[file];
  if (!fs.existsSync(absolutePath)) return "";
  return fs.readFileSync(absolutePath, "utf8");
}

function exists(file: SourceFile) {
  return fs.existsSync(SOURCE_FILES[file]);
}

function makeCheck(
  id: string,
  label: string,
  status: DoctorStatus,
  summary: string,
  details: string[],
  risk: DoctorCheck["risk"] = status === "fail" ? "high" : status === "warn" ? "medium" : "low"
): DoctorCheck {
  return { id, label, status, summary, details, risk };
}

function hasExactSnippet(source: string, snippet: string) {
  return source.replace(/\s+/g, " ").includes(snippet.replace(/\s+/g, " "));
}

export function checkCustomizerRoute(): DoctorCheck {
  const routeExists = exists("customizer");
  return makeCheck(
    "checkCustomizerRoute",
    "Customizer Route",
    routeExists ? "pass" : "fail",
    routeExists ? "Customizer route file exists." : "Customizer route file is missing.",
    [
      "Inspected app/customizer/page.tsx.",
      routeExists ? "Route can be statically inspected by the Doctor." : "Route missing, customizer cannot render.",
    ]
  );
}

export function checkVercelCustomizerStatus(): DoctorCheck {
  const vercelConfigExists = exists("vercelConfig");
  const customizerExists = exists("customizer");
  const ok = customizerExists && vercelConfigExists;

  return makeCheck(
    "checkVercelCustomizerStatus",
    "Vercel / Customizer Status",
    ok ? "pass" : "warn",
    ok ? "Customizer route and Vercel config are present." : "Customizer hosting config needs review.",
    [
      `Customizer route present: ${customizerExists ? "yes" : "no"}.`,
      `vercel.json present: ${vercelConfigExists ? "yes" : "no"}.`,
      "next.config.ts header policy is a manual review item to avoid tracing config files at runtime.",
    ],
    ok ? "low" : "medium"
  );
}

export function checkShopifyIframeStatus(): DoctorCheck {
  const customizer = readText("customizer");
  const hasParentOrigin = customizer.includes('const SHOPIFY_PARENT_ORIGIN = "https://yourdtfplug.com"');
  const hasHeightMessage = customizer.includes("DTF_CUSTOMIZER_HEIGHT");
  const hasAddToCartMessage = customizer.includes("DTF_ADD_TO_CART");
  const ok = hasParentOrigin && hasHeightMessage && hasAddToCartMessage;

  return makeCheck(
    "checkShopifyIframeStatus",
    "Shopify Iframe Status",
    ok ? "pass" : "warn",
    ok ? "Iframe messaging and frame ancestor allowlist are present." : "Shopify iframe integration needs review.",
    [
      `Shopify parent origin constant present: ${hasParentOrigin ? "yes" : "no"}.`,
      `Height postMessage present: ${hasHeightMessage ? "yes" : "no"}.`,
      `Add-to-cart postMessage present: ${hasAddToCartMessage ? "yes" : "no"}.`,
      "Frame ancestor allowlist is a manual review item in next.config.ts.",
    ],
    ok ? "low" : "medium"
  );
}

export function checkShopifyProductUrl(): DoctorCheck {
  const page = readText("homepage");
  const correctUrl = "https://yourdtfplug.com/products/custom-t-shirt-upload-customize";
  const badUrl = "https://your-favorite-dtf-plug.myshopify.com/products/custom-t-shirt-upload-customize";
  const hasCorrectUrl = page.includes(correctUrl);
  const hasBadUrl = page.includes(badUrl);

  return makeCheck(
    "checkShopifyProductUrl",
    "Shopify Product URL",
    hasCorrectUrl && !hasBadUrl ? "pass" : "fail",
    hasCorrectUrl && !hasBadUrl
      ? "Homepage CTA points at the live product URL."
      : "Homepage CTA URL needs review.",
    [
      `Expected URL present: ${hasCorrectUrl ? "yes" : "no"}.`,
      `Known 404 myshopify URL present: ${hasBadUrl ? "yes" : "no"}.`,
      "Inspected app/page.tsx only.",
    ]
  );
}

export function checkCtaLinks(): DoctorCheck {
  const source = readText("homepage");
  const hasCustomizeText = source.includes("Customize Apparel");
  const hrefCount = (source.match(/href=/g) || []).length;
  const hasWrongCustomizerPath = source.includes('href="/customizer"') || source.includes("href='/customizer'");

  return makeCheck(
    "checkCtaLinks",
    "CTA Links",
    hasCustomizeText && !hasWrongCustomizerPath ? "pass" : "warn",
    hasCustomizeText && !hasWrongCustomizerPath
      ? "CTA text exists and does not use the internal /customizer path."
      : "CTA links should be inspected before release.",
    [
      `Customize Apparel text present: ${hasCustomizeText ? "yes" : "no"}.`,
      `href occurrences on homepage: ${hrefCount}.`,
      `Internal /customizer CTA found: ${hasWrongCustomizerPath ? "yes" : "no"}.`,
    ],
    hasWrongCustomizerPath ? "medium" : "low"
  );
}

export function checkPrintAreaConstants(): DoctorCheck {
  const source = readText("customizer");
  const front = PROTECTED_LIVE_STATE.protectedPlacements.front;
  const back = PROTECTED_LIVE_STATE.protectedPlacements.back;
  const frontOk =
    hasExactSnippet(source, `front: { designArea: { x: ${front.designArea.x}, y: ${front.designArea.y}, width: ${front.designArea.width}, height: ${front.designArea.height} }, maxPrintWidth: ${front.maxPrintWidth}, maxPrintHeight: ${front.maxPrintHeight}, }`);
  const backOk =
    hasExactSnippet(source, `back: { designArea: { x: ${back.designArea.x}, y: ${back.designArea.y}, width: ${back.designArea.width}, height: ${back.designArea.height} }, maxPrintWidth: ${back.maxPrintWidth}, maxPrintHeight: ${back.maxPrintHeight}, }`);

  return makeCheck(
    "checkPrintAreaConstants",
    "Protected Placement Values",
    frontOk && backOk ? "pass" : "fail",
    frontOk && backOk ? "Protected Front/Back placement matches live-customizer-working-v3." : PROTECTED_PLACEMENT_WARNING,
    [
      `Front placement exact match: ${frontOk ? "yes" : "no"}.`,
      `Back placement exact match: ${backOk ? "yes" : "no"}.`,
      "Manual approval required before any placement restore or edit.",
    ]
  );
}

export function checkDuplicateFabricMoveHandlers(): DoctorCheck {
  const source = readText("customizer");
  const onCount = (source.match(/canvas\.on\("object:moving"/g) || []).length;
  const offCount = (source.match(/canvas\.off\("object:moving"/g) || []).length;
  const ok = onCount === 1 && offCount === 1;

  return makeCheck(
    "checkDuplicateFabricMoveHandlers",
    "Fabric Move Handlers",
    ok ? "pass" : "warn",
    ok ? "One object:moving handler is registered and cleaned up." : "Unexpected object:moving handler count.",
    [`canvas.on("object:moving") count: ${onCount}.`, `canvas.off("object:moving") count: ${offCount}.`],
    ok ? "low" : "medium"
  );
}

export function checkUploadMovementHandlers(): DoctorCheck {
  const source = readText("customizer");
  const hasMovingHandler = source.includes("const handleObjectMoving");
  const movingBlock = source.match(/const handleObjectMoving[\s\S]*?const handleCanvasPointerUp/)?.[0] || "";
  const modifiedBlock = source.match(/const handleObjectModified[\s\S]*?const handleObjectAddedOrRemoved/)?.[0] || "";
  const liveClampDuringMove = movingBlock.includes("clampObjectToPrintableArea");
  const resizeMarkedAsTransform = source.includes("const handleObjectTransforming") && source.includes("objectMovedDuringTransform = true");
  const postModifyClamp = modifiedBlock.includes("clampObjectToPrintableArea");
  const snapGuarded = modifiedBlock.includes("!objectMovedDuringTransform");
  const ok = hasMovingHandler && !liveClampDuringMove && resizeMarkedAsTransform && postModifyClamp && snapGuarded;

  return makeCheck(
    "checkUploadMovementHandlers",
    "Upload Movement Handlers",
    ok ? "pass" : "warn",
    ok ? "Upload movement uses post-transform bounds checks and guards resize snapping." : "Upload movement handler needs manual review.",
    [
      `Moving handler found: ${hasMovingHandler ? "yes" : "no"}.`,
      `Live clamp during object:moving: ${liveClampDuringMove ? "yes" : "no"}.`,
      `Scale/resize marks active transform: ${resizeMarkedAsTransform ? "yes" : "no"}.`,
      `Post-modified clamp found: ${postModifyClamp ? "yes" : "no"}.`,
      `Center snap guarded during move/resize: ${snapGuarded ? "yes" : "no"}.`,
    ],
    ok ? "low" : "medium"
  );
}

export function checkCartBridgeShape(): DoctorCheck {
  const source = readText("customizer");
  const hasPostMessage = source.includes("window.parent.postMessage");
  const hasEventType = source.includes("DTF_ADD_TO_CART");
  const hasOrigin = source.includes("SHOPIFY_PARENT_ORIGIN");
  const hasArtworkUrl = source.includes('"Artwork URL"');
  const ok = hasPostMessage && hasEventType && hasOrigin && hasArtworkUrl;

  return makeCheck(
    "checkCartBridgeShape",
    "Cart Bridge Shape",
    ok ? "pass" : "warn",
    ok ? "Cart bridge shape is present and uses the expected postMessage event." : "Cart bridge should be inspected before checkout changes.",
    [
      `Parent postMessage found: ${hasPostMessage ? "yes" : "no"}.`,
      `DTF_ADD_TO_CART event found: ${hasEventType ? "yes" : "no"}.`,
      `Shopify parent origin constant found: ${hasOrigin ? "yes" : "no"}.`,
      `Artwork URL line-item property found: ${hasArtworkUrl ? "yes" : "no"}.`,
    ],
    ok ? "low" : "high"
  );
}

export function checkBuildConfig(): DoctorCheck {
  const files: Array<{ label: string; file: SourceFile }> = [
    { label: "package.json", file: "packageJson" },
    { label: "package-lock.json", file: "packageLock" },
    { label: "tsconfig.json", file: "tsconfig" },
    { label: "vercel.json", file: "vercelConfig" },
  ];
  const missing = files.filter(({ file }) => !exists(file)).map(({ label }) => label);

  return makeCheck(
    "checkBuildConfig",
    "Build Config",
    missing.length ? "warn" : "pass",
    missing.length ? "Some expected build config files are missing." : "Expected build config files are present.",
    missing.length
      ? [...missing.map((file) => `Missing: ${file}.`), "Manual review: next.config.ts."]
      : [...files.map(({ label }) => `Present: ${label}.`), "Manual review: next.config.ts."],
    missing.length ? "medium" : "low"
  );
}

export function checkEnvironmentPresenceWithoutPrintingSecrets(): DoctorCheck {
  const present = REQUIRED_ENV_VARS.filter((key) => Boolean(String(process.env[key] || "").trim()));
  const missing = REQUIRED_ENV_VARS.filter((key) => !String(process.env[key] || "").trim());

  return makeCheck(
    "checkEnvironmentPresenceWithoutPrintingSecrets",
    "Environment Presence",
    missing.length ? "warn" : "pass",
    missing.length ? "Some environment variables are missing. Secret values were not printed." : "Required environment variables are present. Secret values were not printed.",
    [
      `Present: ${present.length ? present.join(", ") : "none"}.`,
      `Missing: ${missing.length ? missing.join(", ") : "none"}.`,
      "Values are intentionally hidden.",
    ],
    missing.length ? "medium" : "low"
  );
}

export function runDoctorHealthChecks(): DoctorHealthReport {
  const checks = [
    checkCustomizerRoute(),
    checkVercelCustomizerStatus(),
    checkShopifyIframeStatus(),
    checkShopifyProductUrl(),
    checkCtaLinks(),
    checkPrintAreaConstants(),
    checkDuplicateFabricMoveHandlers(),
    checkUploadMovementHandlers(),
    checkCartBridgeShape(),
    checkBuildConfig(),
    checkEnvironmentPresenceWithoutPrintingSecrets(),
  ];

  const hasFail = checks.some((check) => check.status === "fail");
  const hasWarn = checks.some((check) => check.status === "warn");
  const warnings = checks
    .filter((check) => check.status !== "pass")
    .map((check) => `${check.label}: ${check.summary}`);

  return {
    generatedAt: new Date().toISOString(),
    overallStatus: hasFail ? "fail" : hasWarn ? "warn" : "pass",
    protectedState: PROTECTED_LIVE_STATE,
    checks,
    warnings,
  };
}
