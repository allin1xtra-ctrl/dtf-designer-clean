"use client";

import { useMemo, useState } from "react";

import { DEFAULT_CUSTOMIZER_CONFIGS, getDefaultCustomizerConfig, type DefaultCustomizerConfigId } from "@/lib/customizer/default-configs";
import type { CartDesignPayload, ProductCustomizerConfig, ProductCustomizerType } from "@/lib/customizer/types";
import { validateProductCustomizerConfig } from "@/lib/customizer/validation";

const CUSTOMIZER_TYPES = [
  "apparel_customizer",
  "dtf_transfer_by_size",
  "gang_sheet_size_variant",
  "upload_only_transfer",
] as const satisfies ProductCustomizerType[];

const MATERIAL_LABELS = ["Premium Hot Peel", "Cold Peel", "Stretch"];
const INK_OPTIONS = ["White", "Black", "CMYK", "Neon", "Metallic", "Pastel"];
const TEMPLATE_CATEGORIES = ["Logos", "Streetwear", "Jerseys", "Business", "Events", "Family Reunion", "Stickers", "Gang Sheets", "Labels", "Transfers"];
const ADMIN_TOKEN_STORAGE_KEY = "dtf-admin-panel-token";
const STAGING_CUSTOMIZER_CONFIG_STORAGE_KEY = "dtf-staging-customizer-config";

type RequestState = "idle" | "loading" | "error" | "success";
type MockupUploadState = RequestState | "warning";
type AiToolKey = "backgroundRemover" | "imageEnhancer" | "vectorizer" | "generateIdea";
type PrintLocationId = "front" | "back" | "leftSleeve" | "rightSleeve" | "neckTag";
type MockupUploadTarget = PrintLocationId | "transfer_sheet" | "gang_sheet";
type PrintLocationSetup = {
  label: string;
  printArea: { x: number; y: number; width: number; height: number };
  maxPrintWidth: number;
  maxPrintHeight: number;
  enabled: boolean;
};
type TransferSizeSetup = {
  id: string;
  label: string;
  width: number;
  height: number;
  enabled: boolean;
  isGangSheet?: boolean;
};

const PRINT_LOCATION_OPTIONS: Array<{ id: PrintLocationId; label: string }> = [
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "leftSleeve", label: "Left Sleeve" },
  { id: "rightSleeve", label: "Right Sleeve" },
  { id: "neckTag", label: "Neck Tag" },
];

const MOCKUP_UPLOAD_TARGETS: Array<{ id: MockupUploadTarget; label: string }> = [
  { id: "front", label: "Front mockup" },
  { id: "back", label: "Back mockup" },
  { id: "leftSleeve", label: "Left Sleeve mockup" },
  { id: "rightSleeve", label: "Right Sleeve mockup" },
  { id: "neckTag", label: "Neck Tag mockup" },
  { id: "transfer_sheet", label: "Transfer Sheet mockup" },
  { id: "gang_sheet", label: "Gang Sheet mockup" },
];

const DEFAULT_PRINT_LOCATION_SETUPS: Record<PrintLocationId, PrintLocationSetup> = {
  front: {
    label: "Front",
    printArea: { x: 50, y: 56, width: 38, height: 50 },
    maxPrintWidth: 12,
    maxPrintHeight: 16,
    enabled: true,
  },
  back: {
    label: "Back",
    printArea: { x: 50, y: 56, width: 42, height: 50 },
    maxPrintWidth: 12,
    maxPrintHeight: 16,
    enabled: true,
  },
  leftSleeve: {
    label: "Left Sleeve",
    printArea: { x: 50, y: 50, width: 17, height: 31 },
    maxPrintWidth: 4,
    maxPrintHeight: 6,
    enabled: true,
  },
  rightSleeve: {
    label: "Right Sleeve",
    printArea: { x: 50, y: 50, width: 17, height: 31 },
    maxPrintWidth: 4,
    maxPrintHeight: 6,
    enabled: true,
  },
  neckTag: {
    label: "Neck Tag",
    printArea: { x: 50, y: 28, width: 22, height: 14 },
    maxPrintWidth: 3,
    maxPrintHeight: 2,
    enabled: true,
  },
};

const DEFAULT_TRANSFER_SIZE_SETUPS: TransferSizeSetup[] = [
  { id: "3x3", label: "3x3", width: 3, height: 3, enabled: true },
  { id: "5x5", label: "5x5", width: 5, height: 5, enabled: true },
  { id: "8x10", label: "8x10", width: 8, height: 10, enabled: true },
  { id: "11x17", label: "11x17", width: 11, height: 17, enabled: true },
  { id: "12x24", label: "12x24", width: 12, height: 24, enabled: true },
  { id: "13x24", label: "13x24", width: 13, height: 24, enabled: true },
  { id: "13x60", label: "13x60", width: 13, height: 60, enabled: true },
  { id: "gang_sheet", label: "Gang Sheet", width: 22, height: 60, enabled: true, isGangSheet: true },
];

function cloneConfig(type: ProductCustomizerType): ProductCustomizerConfig {
  return structuredClone(getDefaultCustomizerConfig(type)) as ProductCustomizerConfig;
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
      {children}
    </label>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "password";
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="mt-2 w-full rounded-md border border-[#28414a] bg-[#081114] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300"
    />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#21343c] bg-[#0c1417] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="rounded-lg border border-[#21343c] bg-[#0c1417] shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100 marker:hidden">
        <span>{title}</span>
        <span className="rounded-full border border-[#28414a] px-2 py-1 text-[10px] text-neutral-400">Open</span>
      </summary>
      <div className="border-t border-[#1d343d] p-4">{children}</div>
    </details>
  );
}

function ToggleRow({ label, checked, onChange, note }: { label: string; checked: boolean; onChange: (checked: boolean) => void; note?: string }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-[#243a42] bg-[#081114] px-3 py-2">
      <span>
        <span className="block text-sm font-semibold text-neutral-100">{label}</span>
        {note ? <span className="mt-1 block text-xs text-neutral-500">{note}</span> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-cyan-300" />
    </label>
  );
}

function getMockupUploadClass(state: MockupUploadState) {
  if (state === "success") return "border-emerald-400/50 bg-emerald-950/30 text-emerald-100";
  if (state === "warning") return "border-yellow-400/50 bg-yellow-950/30 text-yellow-100";
  if (state === "error") return "border-red-400/50 bg-red-950/30 text-red-100";
  if (state === "loading") return "border-cyan-400/50 bg-cyan-950/30 text-cyan-100";
  return "border-[#243a42] bg-[#081114] text-neutral-300";
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "item";
}

function clonePrintLocationSetups() {
  return structuredClone(DEFAULT_PRINT_LOCATION_SETUPS) as Record<PrintLocationId, PrintLocationSetup>;
}

function cloneTransferSizeSetups() {
  return structuredClone(DEFAULT_TRANSFER_SIZE_SETUPS) as TransferSizeSetup[];
}

function parseColorList(value: string) {
  return parseList(value).map((item) => {
    const [labelPart, hexPart] = item.split(":");
    const label = (labelPart || item).trim();
    const hex = (hexPart || "#101316").trim();
    return { id: slugify(label), label, hex, enabled: true };
  });
}

function buildPrintLocationSetups(config: ProductCustomizerConfig) {
  const next = clonePrintLocationSetups();

  config.printLocations.forEach((location) => {
    const id = location.id as PrintLocationId;
    if (!Object.prototype.hasOwnProperty.call(next, id)) return;
    next[id] = {
      label: location.label || next[id].label,
      printArea: location.printArea || next[id].printArea,
      maxPrintWidth: Number.isFinite(location.maxPrintWidth) ? location.maxPrintWidth : next[id].maxPrintWidth,
      maxPrintHeight: Number.isFinite(location.maxPrintHeight) ? location.maxPrintHeight : next[id].maxPrintHeight,
      enabled: location.enabled !== false,
    };
  });

  return next;
}

function buildTransferSizeSetups(config: ProductCustomizerConfig) {
  if (!config.transferSizes.length) return cloneTransferSizeSetups();

  return DEFAULT_TRANSFER_SIZE_SETUPS.map((fallback) => {
    const configured = config.transferSizes.find((size) => size.id === fallback.id || size.label === fallback.label);
    return configured
      ? {
          id: configured.id,
          label: configured.label,
          width: configured.width,
          height: configured.height,
          enabled: configured.enabled !== false,
          isGangSheet: configured.isGangSheet,
        }
      : fallback;
  });
}

function isPrintAreaOutOfBounds(area: PrintLocationSetup["printArea"]) {
  return (
    !Number.isFinite(area.x) ||
    !Number.isFinite(area.y) ||
    !Number.isFinite(area.width) ||
    !Number.isFinite(area.height) ||
    area.width <= 0 ||
    area.height <= 0 ||
    area.x - area.width / 2 < 0 ||
    area.y - area.height / 2 < 0 ||
    area.x + area.width / 2 > 100 ||
    area.y + area.height / 2 > 100
  );
}

function getPreviewPrintArea(area: PrintLocationSetup["printArea"]) {
  const width = Math.max(4, Math.min(Number.isFinite(area.width) ? area.width : 30, 90));
  const height = Math.max(4, Math.min(Number.isFinite(area.height) ? area.height : 30, 90));
  const x = Math.max(width / 2, Math.min(Number.isFinite(area.x) ? area.x : 50, 100 - width / 2));
  const y = Math.max(height / 2, Math.min(Number.isFinite(area.y) ? area.y : 50, 100 - height / 2));

  return { x, y, width, height };
}

export default function CustomizerSetupPage() {
  const [adminToken, setAdminToken] = useState("");
  const [productTitle, setProductTitle] = useState("Custom T-Shirt Upload Customize");
  const [productHandle, setProductHandle] = useState("custom-t-shirt-upload-customize");
  const [customizerType, setCustomizerType] = useState<ProductCustomizerType>("apparel_customizer");
  const [enabled, setEnabled] = useState(true);
  const [config, setConfig] = useState<ProductCustomizerConfig>(() => cloneConfig("apparel_customizer"));
  const [selectedPrintLocationId, setSelectedPrintLocationId] = useState<PrintLocationId>("front");
  const [printLocationSetups, setPrintLocationSetups] = useState<Record<PrintLocationId, PrintLocationSetup>>(() => clonePrintLocationSetups());
  const [mockupUrls, setMockupUrls] = useState<Record<string, string>>({});
  const [transferMockupUrl, setTransferMockupUrl] = useState("");
  const [gangSheetMockupUrl, setGangSheetMockupUrl] = useState("");
  const [productColors, setProductColors] = useState("Black:#101316, White:#f8fafc, Gray:#334155, Blue:#075985");
  const [materialOptions, setMaterialOptions] = useState(MATERIAL_LABELS.join(", "));
  const [inkOptions, setInkOptions] = useState(INK_OPTIONS.join(", "));
  const [transferSizeSetups, setTransferSizeSetups] = useState<TransferSizeSetup[]>(() => cloneTransferSizeSetups());
  const [defaultTransferSizeId, setDefaultTransferSizeId] = useState("3x3");
  const [templateCategoriesInput, setTemplateCategoriesInput] = useState(TEMPLATE_CATEGORIES.join(", "));
  const [defaultTemplateCategory, setDefaultTemplateCategory] = useState("Logos");
  const [templatesForApparel, setTemplatesForApparel] = useState(true);
  const [templatesForTransfer, setTemplatesForTransfer] = useState(true);
  const [realismEnabled, setRealismEnabled] = useState(true);
  const [fabricBlendDefault, setFabricBlendDefault] = useState(false);
  const [blendModeDefault, setBlendModeDefault] = useState<"normal" | "multiply" | "overlay" | "soft-light">("multiply");
  const [inkOpacityDefault, setInkOpacityDefault] = useState(95);
  const [textureOverlayEnabled, setTextureOverlayEnabled] = useState(true);
  const [maxFileSize, setMaxFileSize] = useState(config.fileRules.maxFileSizeMb);
  const [minDpi, setMinDpi] = useState(config.fileRules.minDpi);
  const [dpiRecommendation, setDpiRecommendation] = useState(config.fileRules.recommendedDpi);
  const [allowedFileTypes, setAllowedFileTypes] = useState(config.fileRules.allowedExtensions.join(", "));
  const [transparentBackground, setTransparentBackground] = useState(true);
  const [lowResolutionWarning, setLowResolutionWarning] = useState(true);
  const [aiTools, setAiTools] = useState<Record<AiToolKey, boolean>>({
    backgroundRemover: false,
    imageEnhancer: false,
    vectorizer: false,
    generateIdea: false,
  });
  const [basePrice, setBasePrice] = useState("0.00");
  const [pricePerSquareInch, setPricePerSquareInch] = useState("0.00");
  const [quantityBreaks, setQuantityBreaks] = useState("Staging placeholder only");
  const [rushFee, setRushFee] = useState("0.00");
  const [status, setStatus] = useState("Load a default config, validate it, then save to staging only.");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [mockupUploadStatus, setMockupUploadStatus] = useState<Record<MockupUploadTarget, MockupUploadState>>(() =>
    MOCKUP_UPLOAD_TARGETS.reduce((statuses, target) => {
      statuses[target.id] = "idle";
      return statuses;
    }, {} as Record<MockupUploadTarget, MockupUploadState>)
  );
  const [mockupUploadMessages, setMockupUploadMessages] = useState<Record<MockupUploadTarget, string>>(() =>
    MOCKUP_UPLOAD_TARGETS.reduce((messages, target) => {
      messages[target.id] = "Manual URL fallback is available.";
      return messages;
    }, {} as Record<MockupUploadTarget, string>)
  );

  const isApparel = customizerType === "apparel_customizer";
  const isTransfer = customizerType === "dtf_transfer_by_size" || customizerType === "gang_sheet_size_variant";
  const selectedDefault = DEFAULT_CUSTOMIZER_CONFIGS[customizerType as DefaultCustomizerConfigId];
  const selectedPrintLocationSetup = printLocationSetups[selectedPrintLocationId];
  const selectedMockupUrl = mockupUrls[selectedPrintLocationId]?.trim() || "";
  const selectedPreviewArea = getPreviewPrintArea(selectedPrintLocationSetup.printArea);
  const selectedPreviewOutOfBounds = isPrintAreaOutOfBounds(selectedPrintLocationSetup.printArea);
  const adminPreviewMockupUrl = isApparel
    ? selectedMockupUrl
    : defaultTransferSizeId === "gang_sheet"
      ? gangSheetMockupUrl.trim() || transferMockupUrl.trim()
      : transferMockupUrl.trim();
  const adminPreviewArea = isApparel ? selectedPreviewArea : { x: 50, y: 50, width: 58, height: 72 };
  const adminPreviewWarning = isApparel ? selectedPreviewOutOfBounds : false;

  const updatePrintLocationSetup = (id: PrintLocationId, updates: Partial<PrintLocationSetup>) => {
    setPrintLocationSetups((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...updates,
      },
    }));
  };

  const updatePrintAreaValue = (id: PrintLocationId, key: keyof PrintLocationSetup["printArea"], value: string) => {
    setPrintLocationSetups((current) => ({
      ...current,
      [id]: {
        ...current[id],
        printArea: {
          ...current[id].printArea,
          [key]: parseNumber(value, current[id].printArea[key]),
        },
      },
    }));
  };

  const updateTransferSizeSetup = (id: string, updates: Partial<TransferSizeSetup>) => {
    setTransferSizeSetups((current) => current.map((size) => (size.id === id ? { ...size, ...updates } : size)));
  };

  const setMockupTargetUrl = (target: MockupUploadTarget, url: string) => {
    if (target === "transfer_sheet") {
      setTransferMockupUrl(url);
      return;
    }
    if (target === "gang_sheet") {
      setGangSheetMockupUrl(url);
      return;
    }
    setMockupUrls((current) => ({ ...current, [target]: url }));
  };

  const handleMockupUpload = async (target: MockupUploadTarget, file: File | null | undefined) => {
    if (!file) {
      setMockupUploadStatus((current) => ({ ...current, [target]: "error" }));
      setMockupUploadMessages((current) => ({ ...current, [target]: "Choose a mockup image before uploading." }));
      return;
    }

    setMockupUploadStatus((current) => ({ ...current, [target]: "loading" }));
    setMockupUploadMessages((current) => ({ ...current, [target]: "Uploading mockup to staging validation route..." }));

    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("purpose", "mockup_image");

    try {
      const response = await fetch("/api/customizer/staging-upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        errors?: string[];
        warnings?: string[];
        asset?: { url?: string; filename?: string };
      } | null;
      const errors = Array.isArray(result?.errors) ? result.errors : [];
      const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
      const hostedUrl = typeof result?.asset?.url === "string" && result.asset.url.startsWith("http") ? result.asset.url : "";

      if (!response.ok || !result?.ok || errors.length > 0) {
        setMockupUploadStatus((current) => ({ ...current, [target]: "error" }));
        setMockupUploadMessages((current) => ({
          ...current,
          [target]: errors[0] || "Mockup upload failed. Manual URL fallback is still available.",
        }));
        return;
      }

      if (hostedUrl) {
        setMockupTargetUrl(target, hostedUrl);
        setMockupUploadStatus((current) => ({ ...current, [target]: warnings.length ? "warning" : "success" }));
        setMockupUploadMessages((current) => ({
          ...current,
          [target]: warnings.length
            ? `Hosted URL saved with staging warning: ${warnings[0]}`
            : "Hosted staging mockup URL saved to this field.",
        }));
        return;
      }

      setMockupUploadStatus((current) => ({ ...current, [target]: "warning" }));
      setMockupUploadMessages((current) => ({
        ...current,
        [target]: warnings[0] || "Mockup accepted for staging validation, but no hosted URL was created. Paste a manual URL if needed.",
      }));
    } catch {
      setMockupUploadStatus((current) => ({ ...current, [target]: "error" }));
      setMockupUploadMessages((current) => ({
        ...current,
        [target]: "Could not reach staging upload API. Manual URL fallback is still available.",
      }));
    }
  };

  const stagedConfig = useMemo<ProductCustomizerConfig>(() => {
    const nextConfig: ProductCustomizerConfig = {
      ...config,
      type: customizerType,
      editorMode: customizerType === "apparel_customizer" ? "apparel" : customizerType === "upload_only_transfer" ? "upload_only" : "transfer",
      productHandle,
      label: productTitle,
      fileRules: {
        ...config.fileRules,
        allowedExtensions: allowedFileTypes
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        maxFileSizeMb: maxFileSize,
        minDpi,
        recommendedDpi: dpiRecommendation,
        allowTransparentPng: transparentBackground,
      },
      aiTools: {
        ...config.aiTools,
        enabled: Object.values(aiTools).some(Boolean),
        tools: aiTools,
        stagingOnly: true,
        providerConnected: false,
      },
      colors: customizerType === "apparel_customizer" ? parseColorList(productColors) : [],
      materialOptions: customizerType === "apparel_customizer" ? [] : parseList(materialOptions).map((label) => ({ id: slugify(label), label, enabled: true })),
      transferSizes: customizerType === "apparel_customizer"
        ? []
        : transferSizeSetups.map((size) => ({
            id: size.id,
            label: size.label,
            width: size.width,
            height: size.height,
            enabled: size.enabled,
            isGangSheet: size.isGangSheet,
          })),
      pricingRules: [
        {
          id: "staging_base_price",
          label: "Staging base price",
          appliesTo: "base_product",
          unitPrice: parseNumber(basePrice, 0),
          currency: "USD",
          stagingOnly: true,
        },
        {
          id: "staging_square_inch_price",
          label: "Staging price per square inch",
          appliesTo: "base_product",
          unitPrice: parseNumber(pricePerSquareInch, 0),
          currency: "USD",
          stagingOnly: true,
        },
      ],
      stagingSettings: {
        transferMockupUrl: transferMockupUrl.trim() || undefined,
        gangSheetMockupUrl: gangSheetMockupUrl.trim() || undefined,
        defaultTransferSizeId,
        inkOptions: parseList(inkOptions),
        lowResolutionWarningEnabled: lowResolutionWarning,
        transparentBackgroundRecommended: transparentBackground,
        templateSettings: {
          enabledForApparel: templatesForApparel,
          enabledForTransfer: templatesForTransfer,
          enabledCategories: parseList(templateCategoriesInput),
          defaultCategory: defaultTemplateCategory,
          featuredTemplateIds: [],
        },
        realismDefaults: {
          enabled: realismEnabled,
          fabricBlendEnabled: fabricBlendDefault,
          defaultBlendMode: blendModeDefault,
          defaultInkOpacity: inkOpacityDefault,
          textureOverlayEnabled,
        },
        pricingPreview: {
          basePrice: parseNumber(basePrice, 0),
          pricePerSquareInch: parseNumber(pricePerSquareInch, 0),
          rushFee: parseNumber(rushFee, 0),
          quantityBreaks,
        },
      },
      stagingOnly: true,
    };

    if (nextConfig.printLocations.length > 0) {
      nextConfig.printLocations = PRINT_LOCATION_OPTIONS.map((location) => {
        const setup = printLocationSetups[location.id];
        return {
          id: location.id,
          label: setup.label || location.label,
          mockupUrl: mockupUrls[location.id] || undefined,
          printArea: setup.printArea,
          maxPrintWidth: setup.maxPrintWidth,
          maxPrintHeight: setup.maxPrintHeight,
          enabled: setup.enabled,
        };
      });
    }

    return nextConfig;
  }, [aiTools, allowedFileTypes, basePrice, blendModeDefault, config, customizerType, defaultTemplateCategory, defaultTransferSizeId, dpiRecommendation, fabricBlendDefault, gangSheetMockupUrl, inkOpacityDefault, inkOptions, lowResolutionWarning, materialOptions, maxFileSize, minDpi, mockupUrls, pricePerSquareInch, printLocationSetups, productColors, productHandle, productTitle, quantityBreaks, realismEnabled, rushFee, templateCategoriesInput, templatesForApparel, templatesForTransfer, textureOverlayEnabled, transferMockupUrl, transferSizeSetups, transparentBackground]);

  const loadDefaultConfig = (type: ProductCustomizerType) => {
    const nextConfig = cloneConfig(type);
    setCustomizerType(type);
    setConfig(nextConfig);
    setProductHandle(nextConfig.productHandle || "");
    setProductTitle(nextConfig.label);
    setMaxFileSize(nextConfig.fileRules.maxFileSizeMb);
    setMinDpi(nextConfig.fileRules.minDpi);
    setDpiRecommendation(nextConfig.fileRules.recommendedDpi);
    setAllowedFileTypes(nextConfig.fileRules.allowedExtensions.join(", "));
    setTransparentBackground(nextConfig.fileRules.allowTransparentPng);
    setAiTools({
      backgroundRemover: nextConfig.aiTools.tools.backgroundRemover,
      imageEnhancer: nextConfig.aiTools.tools.imageEnhancer,
      vectorizer: nextConfig.aiTools.tools.vectorizer,
      generateIdea: nextConfig.aiTools.tools.generateIdea,
    });
    setPrintLocationSetups(buildPrintLocationSetups(nextConfig));
    setTransferSizeSetups(buildTransferSizeSetups(nextConfig));
    setDefaultTransferSizeId(nextConfig.transferSizes.find((size) => size.enabled !== false)?.id || "3x3");
    setMockupUrls(nextConfig.printLocations.reduce<Record<string, string>>((urls, location) => {
      if (location.mockupUrl) urls[location.id] = location.mockupUrl;
      return urls;
    }, {}));
    setTransferMockupUrl(nextConfig.stagingSettings?.transferMockupUrl || "");
    setGangSheetMockupUrl(nextConfig.stagingSettings?.gangSheetMockupUrl || "");
    setStatus(`${nextConfig.label} defaults loaded. Nothing was saved to production.`);
    setErrors([]);
    setWarnings([]);
  };

  const validateConfig = () => {
    const validation = validateProductCustomizerConfig(stagedConfig);
    setErrors(validation.errors);
    setWarnings(validation.warnings);
    if (validation.ok) {
      try {
        window.localStorage.setItem(STAGING_CUSTOMIZER_CONFIG_STORAGE_KEY, JSON.stringify(stagedConfig));
        setStatus("Config validates locally and was stored for /customizer-preview staging load.");
      } catch {
        setStatus("Config validates locally, but browser storage is unavailable for preview load.");
      }
    } else {
      setStatus("Config has validation errors.");
    }
    return validation;
  };

  const authHeaders = () => ({
    "Content-Type": "application/json",
    "x-admin-token": adminToken,
  });

  const saveStagingConfig = async () => {
    const validation = validateConfig();
    if (!validation.ok) return;

    setRequestState("loading");
    setStatus("Saving config to staging API only...");

    try {
      try {
        if (adminToken.trim()) {
          window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, adminToken.trim());
        }
      } catch {
        setWarnings((current) => [...current, "Admin token could not be stored locally. The API request will still be attempted."]);
      }

      const response = await fetch("/api/admin/customizer-config", {
        method: "POST",
        cache: "no-store",
        headers: authHeaders(),
        body: JSON.stringify({ config: stagedConfig }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || json.message || "Staging save failed.");

      setRequestState("success");
      setErrors(json.errors || []);
      setWarnings(json.warnings || []);
      setStatus("Config accepted by staging API. Shopify and checkout were not changed.");
    } catch (error) {
      setRequestState("error");
      setStatus(error instanceof Error ? error.message : "Staging save failed.");
    }
  };

  const validateSamplePayload = async () => {
    setRequestState("loading");
    const payload: CartDesignPayload = {
      configId: stagedConfig.id,
      type: stagedConfig.type,
      editorMode: stagedConfig.editorMode,
      productHandle: stagedConfig.productHandle,
      quantity: 1,
      selectedPrintLocationId: stagedConfig.printLocations[0]?.id,
      selectedTransferSizeId: stagedConfig.transferSizes[0]?.id,
      layers: [
        {
          id: "staging-layer-1",
          type: "image",
          label: "Staging artwork",
          visible: true,
          locked: false,
          x: 50,
          y: 50,
          width: 40,
          height: 40,
          rotation: 0,
          opacity: 1,
          qualityStatus: "print_ready",
        },
      ],
      stagingOnly: true,
    };

    try {
      const response = await fetch("/api/admin/customizer-config/validate", {
        method: "POST",
        cache: "no-store",
        headers: authHeaders(),
        body: JSON.stringify({ payload }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.errors?.[0] || "Payload validation failed.");

      setRequestState("success");
      setErrors(json.errors || []);
      setWarnings(json.warnings || []);
      setStatus(json.ok ? "Sample payload validates through staging API." : "Sample payload returned validation errors.");
    } catch (error) {
      setRequestState("error");
      setStatus(error instanceof Error ? error.message : "Payload validation failed.");
    }
  };

  return (
    <main className="min-h-screen bg-[#061015] px-4 py-6 text-neutral-100 md:px-6">
      <div className="mx-auto max-w-[1500px]">
        <header className="rounded-xl border border-[#1d343d] bg-[#09151a] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Preview / Staging Admin</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Customizer Product Setup</h1>
              <p className="mt-2 max-w-3xl text-sm text-neutral-400">
                Configure product customizer behavior for review before Shopify, checkout, Cloudinary, AI providers, or production storage are connected.
              </p>
            </div>
            <div className="w-full max-w-sm">
              <FieldLabel htmlFor="admin-token">Admin Token</FieldLabel>
              <TextInput id="admin-token" type="password" value={adminToken} onChange={setAdminToken} placeholder="Required for staging API save/validate" />
            </div>
          </div>
          <nav className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-300">
            {["Product", "Mockups", "Print Areas", "Transfers", "Templates", "Realism", "File Rules", "Pricing", "Save"].map((item) => (
              <span key={item} className="rounded-full border border-[#28414a] bg-[#081114] px-3 py-1.5">
                {item}
              </span>
            ))}
          </nav>
        </header>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-5">
            <Section title="Product Setup">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="product-title">Product Title</FieldLabel>
                  <TextInput id="product-title" value={productTitle} onChange={setProductTitle} />
                </div>
                <div>
                  <FieldLabel htmlFor="product-handle">Product Handle</FieldLabel>
                  <TextInput id="product-handle" value={productHandle} onChange={setProductHandle} />
                </div>
                <div>
                  <FieldLabel htmlFor="customizer-type">Customizer Type</FieldLabel>
                  <select
                    id="customizer-type"
                    value={customizerType}
                    onChange={(event) => loadDefaultConfig(event.target.value as ProductCustomizerType)}
                    className="mt-2 w-full rounded-md border border-[#28414a] bg-[#081114] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                  >
                    {CUSTOMIZER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <ToggleRow label={enabled ? "Customizer Enabled" : "Customizer Disabled"} checked={enabled} onChange={setEnabled} note="Staging UI flag only; no live product is changed." />
              </div>
            </Section>

            <Section title="Print Location Manager">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-4">
                  {isApparel ? (
                    <>
                      <div>
                        <FieldLabel htmlFor="admin-location-selector">Selected Location</FieldLabel>
                        <select
                          id="admin-location-selector"
                          value={selectedPrintLocationId}
                          onChange={(event) => setSelectedPrintLocationId(event.target.value as PrintLocationId)}
                          className="mt-2 w-full rounded-md border border-[#28414a] bg-[#081114] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                        >
                          {PRINT_LOCATION_OPTIONS.map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <FieldLabel htmlFor="selected-max-print-width">Max Print Width Inches</FieldLabel>
                          <TextInput
                            id="selected-max-print-width"
                            type="number"
                            value={selectedPrintLocationSetup.maxPrintWidth}
                            onChange={(value) =>
                              updatePrintLocationSetup(selectedPrintLocationId, {
                                maxPrintWidth: parseNumber(value, selectedPrintLocationSetup.maxPrintWidth),
                              })
                            }
                          />
                        </div>
                        <div>
                          <FieldLabel htmlFor="selected-max-print-height">Max Print Height Inches</FieldLabel>
                          <TextInput
                            id="selected-max-print-height"
                            type="number"
                            value={selectedPrintLocationSetup.maxPrintHeight}
                            onChange={(value) =>
                              updatePrintLocationSetup(selectedPrintLocationId, {
                                maxPrintHeight: parseNumber(value, selectedPrintLocationSetup.maxPrintHeight),
                              })
                            }
                          />
                        </div>
                        <ToggleRow
                          label={`${selectedPrintLocationSetup.label} Enabled`}
                          checked={selectedPrintLocationSetup.enabled}
                          onChange={(checked) => updatePrintLocationSetup(selectedPrintLocationId, { enabled: checked })}
                          note="Staging location flag only."
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-4">
                        {(["x", "y", "width", "height"] as const).map((key) => (
                          <div key={key}>
                            <FieldLabel htmlFor={`selected-print-area-${key}`}>
                              {key === "x" || key === "y" ? `Center ${key.toUpperCase()} %` : `${key[0].toUpperCase()}${key.slice(1)} %`}
                            </FieldLabel>
                            <TextInput
                              id={`selected-print-area-${key}`}
                              type="number"
                              value={selectedPrintLocationSetup.printArea[key]}
                              onChange={(value) => updatePrintAreaValue(selectedPrintLocationId, key, value)}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {isTransfer ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                        <div>
                          <FieldLabel htmlFor="default-transfer-size">Default Selected Transfer Size</FieldLabel>
                          <select
                            id="default-transfer-size"
                            value={defaultTransferSizeId}
                            onChange={(event) => setDefaultTransferSizeId(event.target.value)}
                            className="mt-2 w-full rounded-md border border-[#28414a] bg-[#081114] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                          >
                            {transferSizeSetups.map((size) => (
                              <option key={size.id} value={size.id}>
                                {size.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <FieldLabel htmlFor="dpi-recommendation">DPI Recommendation</FieldLabel>
                          <TextInput id="dpi-recommendation" type="number" value={dpiRecommendation} onChange={(value) => setDpiRecommendation(parseNumber(value, dpiRecommendation))} />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        {transferSizeSetups.map((size) => (
                          <div key={size.id} className="grid gap-2 rounded-md border border-[#243a42] bg-[#081114] p-3 md:grid-cols-[1fr_90px_90px_90px] md:items-end">
                            <div>
                              <FieldLabel htmlFor={`transfer-size-label-${size.id}`}>Transfer Size Label</FieldLabel>
                              <TextInput id={`transfer-size-label-${size.id}`} value={size.label} onChange={(value) => updateTransferSizeSetup(size.id, { label: value })} />
                            </div>
                            <div>
                              <FieldLabel htmlFor={`transfer-size-width-${size.id}`}>Width In</FieldLabel>
                              <TextInput id={`transfer-size-width-${size.id}`} type="number" value={size.width} onChange={(value) => updateTransferSizeSetup(size.id, { width: parseNumber(value, size.width) })} />
                            </div>
                            <div>
                              <FieldLabel htmlFor={`transfer-size-height-${size.id}`}>Height In</FieldLabel>
                              <TextInput id={`transfer-size-height-${size.id}`} type="number" value={size.height} onChange={(value) => updateTransferSizeSetup(size.id, { height: parseNumber(value, size.height) })} />
                            </div>
                            <ToggleRow label={size.enabled ? "Enabled" : "Disabled"} checked={size.enabled} onChange={(checked) => updateTransferSizeSetup(size.id, { enabled: checked })} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <p className="rounded-md border border-yellow-500/30 bg-yellow-950/20 px-3 py-2 text-sm text-yellow-100">
                    Safe boundary warning: center X/Y, width, and height are clamped in preview so the dashed print area cannot break the mockup.
                  </p>
                </div>

                <div className="rounded-lg border border-[#28414a] bg-[#081114] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Admin Live Preview</div>
                      <div className="mt-1 text-xs text-neutral-500">{isApparel ? selectedPrintLocationSetup.label : "Transfer artboard"}</div>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${adminPreviewWarning ? "border-yellow-400/50 text-yellow-100" : "border-emerald-400/50 text-emerald-200"}`}>
                      {adminPreviewWarning ? "Clamped" : "In Bounds"}
                    </span>
                  </div>
                  <div className="relative mt-3 aspect-[4/5] overflow-hidden rounded-md border border-[#203741] bg-[radial-gradient(circle_at_50%_20%,rgba(103,232,249,0.12),transparent_34%),linear-gradient(145deg,#dfe8ef,#aab7c1)]">
                    {adminPreviewMockupUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={adminPreviewMockupUrl}
                        alt="Staging mockup preview"
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <div className="absolute left-[18%] top-[18%] h-[70%] w-[64%] rounded-[34px_34px_18px_18px] bg-[linear-gradient(135deg,#1d2529,#06090a_70%)] shadow-[0_18px_32px_rgba(0,0,0,0.35),inset_18px_0_34px_rgba(255,255,255,0.05)]" />
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 border border-dashed border-cyan-200 bg-cyan-300/10 shadow-[0_0_22px_rgba(34,211,238,0.18)]"
                      style={{
                        left: `${adminPreviewArea.x}%`,
                        top: `${adminPreviewArea.y}%`,
                        width: `${adminPreviewArea.width}%`,
                        height: `${adminPreviewArea.height}%`,
                      }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-neutral-400">
                    Missing or broken mockup URLs fall back to the premium generated preview in the customer editor.
                  </p>
                </div>
              </div>
            </Section>

            {isApparel ? (
              <CollapsibleSection title="Mockups & Apparel Options" defaultOpen>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-200">Print Locations</h3>
                    <div className="mt-3 grid gap-2">
                      {PRINT_LOCATION_OPTIONS.map((location) => (
                        <ToggleRow
                          key={location.id}
                          label={location.label}
                          checked={printLocationSetups[location.id].enabled}
                          onChange={(checked) => updatePrintLocationSetup(location.id, { enabled: checked })}
                          note={`${printLocationSetups[location.id].maxPrintWidth}" x ${printLocationSetups[location.id].maxPrintHeight}" max`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-200">Product Colors</h3>
                    <p className="mt-2 text-xs text-neutral-500">Use Label:#hex pairs, separated by commas.</p>
                    <TextInput id="product-colors" value={productColors} onChange={setProductColors} />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {PRINT_LOCATION_OPTIONS.map((location) => (
                    <div key={location.id}>
                      <FieldLabel htmlFor={`mockup-${location.id}`}>{location.label} Mockup URL</FieldLabel>
                      <TextInput
                        id={`mockup-${location.id}`}
                        value={mockupUrls[location.id] || ""}
                        onChange={(value) => setMockupUrls((current) => ({ ...current, [location.id]: value }))}
                        placeholder="https://example.com/mockup.png"
                      />
                      <label className="mt-2 block rounded-md border border-[#243a42] bg-[#081114] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400">
                        Upload {location.label} Mockup
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={(event) => {
                            void handleMockupUpload(location.id, event.target.files?.[0]);
                            event.target.value = "";
                          }}
                        />
                      </label>
                      <p className={`mt-2 rounded-md border px-3 py-2 text-xs ${getMockupUploadClass(mockupUploadStatus[location.id])}`}>
                        {mockupUploadMessages[location.id]}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 rounded-md border border-cyan-400/30 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-100">
                  Use high-resolution transparent PNG or clean product mockup images. Recommended minimum: 2000px wide.
                </p>
              </CollapsibleSection>
            ) : null}

            {isTransfer ? (
              <CollapsibleSection title="Transfers & Mockups" defaultOpen>
                <div className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-200">Configured Transfer Sizes</h3>
                    <p className="mt-2 text-sm text-neutral-500">{transferSizeSetups.filter((size) => size.enabled).length} enabled size options are staged.</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-200">Material Options</h3>
                    <TextInput id="material-options" value={materialOptions} onChange={setMaterialOptions} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-200">Ink / Color Options</h3>
                    <TextInput id="ink-options" value={inkOptions} onChange={setInkOptions} />
                    <div className="mt-3">
                      <FieldLabel htmlFor="transfer-mockup-url">Transfer Sheet / Artboard Mockup URL</FieldLabel>
                      <TextInput id="transfer-mockup-url" value={transferMockupUrl} onChange={setTransferMockupUrl} placeholder="https://example.com/transfer-artboard.png" />
                      <label className="mt-2 block rounded-md border border-[#243a42] bg-[#081114] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400">
                        Upload Transfer Sheet Mockup
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={(event) => {
                            void handleMockupUpload("transfer_sheet", event.target.files?.[0]);
                            event.target.value = "";
                          }}
                        />
                      </label>
                      <p className={`mt-2 rounded-md border px-3 py-2 text-xs ${getMockupUploadClass(mockupUploadStatus.transfer_sheet)}`}>
                        {mockupUploadMessages.transfer_sheet}
                      </p>
                    </div>
                    <div className="mt-3">
                      <FieldLabel htmlFor="gang-sheet-mockup-url">Gang Sheet Mockup URL</FieldLabel>
                      <TextInput id="gang-sheet-mockup-url" value={gangSheetMockupUrl} onChange={setGangSheetMockupUrl} placeholder="https://example.com/gang-sheet-artboard.png" />
                      <label className="mt-2 block rounded-md border border-[#243a42] bg-[#081114] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400">
                        Upload Gang Sheet Mockup
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={(event) => {
                            void handleMockupUpload("gang_sheet", event.target.files?.[0]);
                            event.target.value = "";
                          }}
                        />
                      </label>
                      <p className={`mt-2 rounded-md border px-3 py-2 text-xs ${getMockupUploadClass(mockupUploadStatus.gang_sheet)}`}>
                        {mockupUploadMessages.gang_sheet}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-4 rounded-md border border-cyan-400/30 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-100">
                  Use high-resolution transparent PNG or clean product mockup images. Recommended minimum: 2000px wide.
                </p>
              </CollapsibleSection>
            ) : null}

            <CollapsibleSection title="File Rules">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="allowed-file-types">Allowed File Types</FieldLabel>
                  <TextInput id="allowed-file-types" value={allowedFileTypes} onChange={setAllowedFileTypes} />
                </div>
                <div>
                  <FieldLabel htmlFor="max-file-size">Max File Size MB</FieldLabel>
                  <TextInput id="max-file-size" type="number" value={maxFileSize} onChange={(value) => setMaxFileSize(parseNumber(value, maxFileSize))} />
                </div>
                <div>
                  <FieldLabel htmlFor="min-dpi">Min DPI</FieldLabel>
                  <TextInput id="min-dpi" type="number" value={minDpi} onChange={(value) => setMinDpi(parseNumber(value, minDpi))} />
                </div>
                <ToggleRow label="Transparent Background Recommended" checked={transparentBackground} onChange={setTransparentBackground} />
                <ToggleRow label="Low Resolution Warning Enabled" checked={lowResolutionWarning} onChange={setLowResolutionWarning} />
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="AI Tool Settings">
              <div className="grid gap-2 md:grid-cols-2">
                {[
                  ["backgroundRemover", "Background Remover enabled"],
                  ["imageEnhancer", "Image Enhancer enabled"],
                  ["vectorizer", "Vectorizer enabled"],
                  ["generateIdea", "Generate Idea enabled"],
                ].map(([key, label]) => (
                  <ToggleRow
                    key={key}
                    label={label}
                    checked={aiTools[key as AiToolKey]}
                    onChange={(checked) => {
                      setAiTools((current) => ({ ...current, [key]: checked }));
                      setStatus(`${label} is ${checked ? "enabled" : "disabled"} for staging only. No AI provider is connected.`);
                    }}
                    note="No AI provider is connected."
                  />
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Editable Template Options">
              <div className="grid gap-4 md:grid-cols-2">
                <ToggleRow label="Templates Enabled for Apparel" checked={templatesForApparel} onChange={setTemplatesForApparel} />
                <ToggleRow label="Templates Enabled for Transfers" checked={templatesForTransfer} onChange={setTemplatesForTransfer} />
                <div>
                  <FieldLabel htmlFor="template-categories">Enabled Template Categories</FieldLabel>
                  <TextInput id="template-categories" value={templateCategoriesInput} onChange={setTemplateCategoriesInput} />
                </div>
                <div>
                  <FieldLabel htmlFor="default-template-category">Default Template Category</FieldLabel>
                  <TextInput id="default-template-category" value={defaultTemplateCategory} onChange={setDefaultTemplateCategory} />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Realism Defaults">
              <div className="grid gap-4 md:grid-cols-2">
                <ToggleRow label="Realistic Mockup Preview Enabled" checked={realismEnabled} onChange={setRealismEnabled} />
                <ToggleRow label="Fabric Blend Default" checked={fabricBlendDefault} onChange={setFabricBlendDefault} />
                <ToggleRow label="Texture Overlay Enabled" checked={textureOverlayEnabled} onChange={setTextureOverlayEnabled} />
                <div>
                  <FieldLabel htmlFor="blend-mode-default">Default Blend Mode</FieldLabel>
                  <select
                    id="blend-mode-default"
                    value={blendModeDefault}
                    onChange={(event) => setBlendModeDefault(event.target.value as typeof blendModeDefault)}
                    className="mt-2 w-full rounded-md border border-[#28414a] bg-[#081114] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                  >
                    {["normal", "multiply", "overlay", "soft-light"].map((mode) => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel htmlFor="ink-opacity-default">Default Ink Opacity</FieldLabel>
                  <TextInput id="ink-opacity-default" type="number" value={inkOpacityDefault} onChange={(value) => setInkOpacityDefault(parseNumber(value, inkOpacityDefault))} />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Pricing Rules Placeholder">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="base-price">Base Price</FieldLabel>
                  <TextInput id="base-price" value={basePrice} onChange={setBasePrice} />
                </div>
                <div>
                  <FieldLabel htmlFor="price-per-inch">Price Per Square Inch</FieldLabel>
                  <TextInput id="price-per-inch" value={pricePerSquareInch} onChange={setPricePerSquareInch} />
                </div>
                <div>
                  <FieldLabel htmlFor="quantity-breaks">Quantity Breaks Placeholder</FieldLabel>
                  <TextInput id="quantity-breaks" value={quantityBreaks} onChange={setQuantityBreaks} />
                </div>
                <div>
                  <FieldLabel htmlFor="rush-fee">Rush Fee Placeholder</FieldLabel>
                  <TextInput id="rush-fee" value={rushFee} onChange={setRushFee} />
                </div>
              </div>
              <p className="mt-3 text-sm text-neutral-500">Do not connect to Shopify pricing yet. These fields are staging placeholders only.</p>
            </CollapsibleSection>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
            <Section title="Save / Validate Panel">
              <div className="space-y-3">
                <button type="button" onClick={() => loadDefaultConfig(customizerType)} className="w-full rounded-md border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-100">
                  Load Default Config
                </button>
                <button type="button" onClick={validateConfig} className="w-full rounded-md bg-cyan-300 px-4 py-2 text-sm font-semibold text-[#061015]">
                  Validate Config Locally
                </button>
                <button type="button" onClick={saveStagingConfig} disabled={requestState === "loading"} className="w-full rounded-md bg-emerald-300 px-4 py-2 text-sm font-semibold text-[#061015] disabled:opacity-60">
                  Save Config to Staging API
                </button>
                <button type="button" onClick={validateSamplePayload} disabled={requestState === "loading"} className="w-full rounded-md border border-[#2c424a] px-4 py-2 text-sm font-semibold text-neutral-100 disabled:opacity-60">
                  Validate Sample Payload
                </button>
              </div>
              <div className="mt-4 rounded-md border border-[#263d45] bg-[#081114] p-3">
                <div className="text-xs uppercase tracking-wide text-neutral-500">Status</div>
                <p className="mt-2 text-sm text-neutral-200">{status}</p>
              </div>
              {errors.length ? (
                <div className="mt-3 rounded-md border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-100">
                  <div className="font-semibold">Errors</div>
                  <ul className="mt-2 space-y-1">
                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {warnings.length ? (
                <div className="mt-3 rounded-md border border-yellow-500/40 bg-yellow-950/20 p-3 text-sm text-yellow-100">
                  <div className="font-semibold">Warnings</div>
                  <ul className="mt-2 space-y-1">
                    {warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Section>

            <Section title="Staging Summary">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">Loaded Default</dt><dd>{selectedDefault.label}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">Product Enabled</dt><dd>{enabled ? "Yes" : "No"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">Low Res Warning</dt><dd>{lowResolutionWarning ? "On" : "Off"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">Production Save</dt><dd className="text-emerald-300">Blocked</dd></div>
              </dl>
              <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-[#05090b] p-3 text-xs text-neutral-400">
                {JSON.stringify(stagedConfig, null, 2)}
              </pre>
            </Section>
          </aside>
        </div>
      </div>
    </main>
  );
}
