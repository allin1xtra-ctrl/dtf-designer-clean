"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, FabricImage, Path, Shadow, Textbox } from "fabric";
import { normalizeVariantId } from "../lib/shopify";

const FALLBACK_VARIANT_ID = "47766570074286";
const CANVAS_DEFAULT_WIDTH = 620;
const CANVAS_DEFAULT_HEIGHT = 744;

type ViewName = "front" | "back" | "leftSleeve" | "rightSleeve" | "neck";
type CurveMode = "none" | "arcUp" | "arcDown" | "wave";

type TextControlsState = {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  outlineColor: string;
  outlineWidth: number;
  shadow: boolean;
  glow: boolean;
  letterSpacing: number;
  lineHeight: number;
  textAlign: "left" | "center" | "right";
  opacity: number;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  curveMode: CurveMode;
  bendCurve: number;
};

type FontOption = {
  label: string;
  value: string;
};

type LayerItem = {
  id: string;
  index: number;
  label: string;
  type: string;
  locked: boolean;
  visible: boolean;
  active: boolean;
};

type SheetSize = {
  width: number;
  height: number;
  source: string;
};

type SelectedDesignMetrics = {
  widthIn: number;
  heightIn: number;
  widthPx: number;
  heightPx: number;
  left: number;
  top: number;
  widthCanvas: number;
  heightCanvas: number;
  exceedsBounds: boolean;
} | null;

type CropControlsState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const DEFAULT_TEXT_CONTROLS: TextControlsState = {
  fontFamily: "Arial",
  fontSize: 32,
  textColor: "#000000",
  outlineColor: "#000000",
  outlineWidth: 0,
  shadow: false,
  glow: false,
  letterSpacing: 0,
  lineHeight: 1.16,
  textAlign: "center",
  opacity: 1,
  bold: false,
  italic: false,
  uppercase: false,
  curveMode: "none",
  bendCurve: 25,
};

const FONT_OPTIONS: FontOption[] = [
  { label: "Arial", value: "Arial" },
  { label: "Helvetica", value: "Helvetica" },
  { label: "Times New Roman", value: "\"Times New Roman\"" },
  { label: "Georgia", value: "Georgia" },
  { label: "Playfair Display", value: "\"Playfair Display\"" },
  { label: "Verdana", value: "Verdana" },
  { label: "Tahoma", value: "Tahoma" },
  { label: "Trebuchet MS", value: "\"Trebuchet MS\"" },
  { label: "Courier New", value: "\"Courier New\"" },
  { label: "Impact", value: "Impact" },
  { label: "Anton", value: "Anton" },
  { label: "Bebas Neue", value: "\"Bebas Neue\"" },
  { label: "Oswald", value: "Oswald" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Poppins", value: "Poppins" },
  { label: "League Spartan", value: "\"League Spartan\"" },
  { label: "Pacifico", value: "Pacifico" },
  { label: "Lobster", value: "Lobster" },
  { label: "Great Vibes", value: "\"Great Vibes\"" },
  { label: "Dancing Script", value: "\"Dancing Script\"" },
  { label: "Bangers", value: "Bangers" },
  { label: "Permanent Marker", value: "\"Permanent Marker\"" },
  { label: "Black Ops One", value: "\"Black Ops One\"" },
  { label: "Racing Sans One", value: "\"Racing Sans One\"" },
  { label: "Graduate", value: "Graduate" },
  { label: "Cinzel", value: "Cinzel" },
  { label: "Varsity Style", value: "Graduate, \"Times New Roman\", serif" },
  { label: "Russo One", value: "\"Russo One\"" },
  { label: "Archivo Black", value: "\"Archivo Black\"" },
  { label: "Inter", value: "Inter" },
  { label: "Roboto", value: "Roboto" },
  { label: "Open Sans", value: "\"Open Sans\"" },
  { label: "Lato", value: "Lato" },
  { label: "Raleway", value: "Raleway" },
  { label: "Nunito", value: "Nunito" },
  { label: "Work Sans", value: "\"Work Sans\"" },
];

const GOOGLE_FONT_FAMILIES = new Set([
  "Anton",
  "Bebas Neue",
  "Oswald",
  "Montserrat",
  "Poppins",
  "League Spartan",
  "Playfair Display",
  "Pacifico",
  "Lobster",
  "Great Vibes",
  "Dancing Script",
  "Bangers",
  "Permanent Marker",
  "Black Ops One",
  "Racing Sans One",
  "Graduate",
  "Cinzel",
  "Russo One",
  "Archivo Black",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Raleway",
  "Nunito",
  "Work Sans",
]);

const fontLoadCache = new Map<string, Promise<void>>();
const SNAP_TO_CENTER_THRESHOLD = 4;
const LOW_RESOLUTION_UPLOAD_EDGE = 900;
const MAX_HISTORY_STATES = 60;
const CLAMP_EPSILON = 0.5;
const CANVAS_JSON_PROPS = ["name", "__curveMode", "cropX", "cropY", "__dtfView"];

const VIEW_LABELS: Record<ViewName, string> = {
  front: "Front",
  back: "Back",
  leftSleeve: "Left Sleeve",
  rightSleeve: "Right Sleeve",
  neck: "Neck Label",
};

function isViewName(value: unknown): value is ViewName {
  return typeof value === "string" && VIEW_NAMES.includes(value as ViewName);
}

type CanvasSnapshot = ReturnType<Canvas["toJSON"]>;
type DraftPayload = {
  version: number;
  productHandle: string;
  variantId: string;
  selectedColor: string;
  selectedSize: string;
  transferSize: string;
  quantity: number;
  currentView: ViewName;
  views: Record<ViewName, CanvasSnapshot | null>;
  activeCanvas: CanvasSnapshot | null;
  uploadedArtworkByView?: Partial<Record<ViewName, string>>;
  savedAt: number;
};
type UploadResponse = {
  error?: string;
  url?: string;
};
type CustomizerMode = "transfer" | "apparel";

type PrintArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SizeMockupConfig = {
  mockupUrl?: string;
  url?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  maxPrintWidth?: number;
  maxPrintHeight?: number;
  designArea?: Partial<PrintArea>;
  printArea?: Partial<PrintArea>;
  print_area?: Partial<PrintArea>;
  colorMockups?: Record<string, string>;
};

type PrintLocationData = {
  mockupUrl?: string;
  colorMockups?: Record<string, string>;
  sizeMockups?: Record<string, string | SizeMockupConfig>;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  maxPrintWidth?: number;
  maxPrintHeight?: number;
  designArea?: Partial<PrintArea>;
  printArea?: Partial<PrintArea>;
  print_area?: Partial<PrintArea>;
};

type PrintLocationsMap = Record<string, PrintLocationData>;

type ProductByHandleResponse = {
  id?: string;
  title?: string;
  handle?: string;
  metafield?: {
    value?: string;
    type?: string;
  };
  variants?: Array<{
    id?: string;
    title?: string;
    selectedOptions?: Array<{
      name?: string;
      value?: string;
    }>;
  }>;
};

type ProductByHandleApiResponse = ProductByHandleResponse & {
  error?: string;
};
type ProductVariant = NonNullable<ProductByHandleResponse["variants"]>[number];

type AiActionResponse = {
  ok?: boolean;
  error?: string;
  note?: string;
  requestId?: string;
  diagnostics?: {
    safeErrorCategory?: string;
  };
  imageDataUrl?: string;
  dataUrl?: string;
  imageUrl?: string;
  suggestions?: string[];
};

const SHOPIFY_PARENT_ORIGIN = "https://yourdtfplug.com";
const DEFAULT_DESIGN_AREA: PrintArea = { x: 10, y: 10, width: 80, height: 80 };
const MIN_CURVE_AMPLITUDE = 8;
const MAX_CURVE_AMPLITUDE = 220;
const TRANSFER_SIZE_PRESETS = ["3x3", "4x5", "5x5", "8x8", "8x10", "10x10", "11x17", "12x12", "12x16", "14x16", "16x20"];
const DRAFT_STORAGE_VERSION = 1;
const DRAFT_STORAGE_KEY_PREFIX = "dtf-designer-draft";
const DRAFT_AUTOSAVE_DEBOUNCE_MS = 800;
const PRINT_DPI = 300;
const BLANK_MOCKUP_SVG_WIDTH = 1000;
const BLANK_MOCKUP_SVG_HEIGHT = 1200;
// Expanded to leave a roughly 12% side margin and 6% top margin so fallback blank garments read larger in the preview.
const BLANK_MOCKUP_FRAME = { x: 120, y: 70, width: 760, height: 1060, radius: 24 };
const MOCKUP_FIT_RATIO = 0.96;
const MOCKUP_FIT_RATIO_SMALL_SCREEN = 0.98;
const PREVIEW_PADDING = 8;
const MIN_PREVIEW_SCALE = 0.01;
const MIN_MOBILE_PREVIEW_SCALE = 0.32;
const SCALE_CHANGE_THRESHOLD = 0.001;
const VIEW_LOCATION_KEYS: Record<ViewName, string[]> = {
  front: ["front"],
  back: ["back"],
  leftSleeve: ["leftSleeve", "left_sleeve"],
  rightSleeve: ["rightSleeve", "right_sleeve"],
  neck: ["neck", "neckLabel", "neck_label", "neck_tag"],
};
const COLOR_OPTION_NAMES = ["color", "colour"];
const SIZE_OPTION_NAMES = ["size"];
const DEFAULT_COLOR = "Black";
// Optional per-product overrides for known product handles.
// Generic view-specific blank mockups are used when no product override exists.
const PRODUCT_BLANK_MOCKUPS: Record<string, Partial<Record<ViewName, string>>> = {
  // Example:
  // "custom-hoodie": { front: "/mockups/hoodie-front-blank.png" },
};
const PRODUCT_PRINT_LOCATION_OVERRIDES: Record<string, Partial<Record<string, Partial<PrintLocationData>>>> = {
  "custom-t-shirt-upload-customize": {
    front: {
      designArea: { x: 30, y: 19, width: 42, height: 61 },
      maxPrintWidth: 12,
      maxPrintHeight: 16,
    },
    back: {
      designArea: { x: 25, y: 19, width: 48, height: 59 },
      maxPrintWidth: 12,
      maxPrintHeight: 16,
    },
    neck: { x: 41, y: 13, width: 18, height: 12 },
    neck_tag: { x: 41, y: 13, width: 18, height: 12 },
    neckLabel: { x: 41, y: 13, width: 18, height: 12 },
    neck_label: { x: 41, y: 13, width: 18, height: 12 },
  },
};
const VIEW_NAMES: ViewName[] = ["front", "back", "leftSleeve", "rightSleeve", "neck"];
const DEFAULT_MOCKUP_LOCATIONS: Record<ViewName, PrintLocationData> = {
  front: { mockupUrl: createMockupPendingDataUrl("Front"), designArea: DEFAULT_DESIGN_AREA },
  back: { mockupUrl: createMockupPendingDataUrl("Back"), designArea: DEFAULT_DESIGN_AREA },
  leftSleeve: { mockupUrl: createMockupPendingDataUrl("Left sleeve"), designArea: DEFAULT_DESIGN_AREA },
  rightSleeve: { mockupUrl: createMockupPendingDataUrl("Right sleeve"), designArea: DEFAULT_DESIGN_AREA },
  neck: { mockupUrl: createMockupPendingDataUrl("Neck label"), designArea: DEFAULT_DESIGN_AREA },
};

function createEmptyViews(): Record<ViewName, CanvasSnapshot | null> {
  return {
    front: null,
    back: null,
    leftSleeve: null,
    rightSleeve: null,
    neck: null,
  };
}

function createEmptyUploadedArtworkByView(): Record<ViewName, string> {
  return {
    front: "",
    back: "",
    leftSleeve: "",
    rightSleeve: "",
    neck: "",
  };
}

function normalizeDraftQuantity(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.max(1, Math.round(parsed));
}

function normalizeDraftSnapshot(value: unknown): CanvasSnapshot | null {
  if (!value || typeof value !== "object") return null;
  return value as CanvasSnapshot;
}

function tagCanvasObjectsForView(canvas: Canvas, view: ViewName) {
  for (const object of canvas.getObjects()) {
    (object as unknown as { __dtfView?: ViewName }).__dtfView = view;
  }
}

function filterCanvasSnapshotForView(snapshot: CanvasSnapshot | null, view: ViewName): CanvasSnapshot | null {
  if (!snapshot || typeof snapshot !== "object") return snapshot;

  const candidate = snapshot as CanvasSnapshot & {
    objects?: Array<Record<string, unknown>>;
  };

  if (!Array.isArray(candidate.objects)) return snapshot;

  return {
    ...candidate,
    objects: candidate.objects.filter((object: Record<string, unknown>) => {
      const objectView = object.__dtfView;
      return typeof objectView !== "string" || objectView === view;
    }),
  } as CanvasSnapshot;
}

function normalizeDraftViews(value: unknown): Record<ViewName, CanvasSnapshot | null> {
  const normalized = createEmptyViews();
  if (!value || typeof value !== "object") return normalized;

  for (const view of VIEW_NAMES) {
    normalized[view] = filterCanvasSnapshotForView(
      normalizeDraftSnapshot((value as Partial<Record<ViewName, CanvasSnapshot | null>>)[view]),
      view
    );
  }

  return normalized;
}

function getPrimaryFontFamily(value: string) {
  return String(value || "")
    .split(",")[0]
    .replace(/["']/g, "")
    .trim();
}

function getGoogleFontHref(fontFamily: string) {
  const primaryFamily = getPrimaryFontFamily(fontFamily);
  if (!GOOGLE_FONT_FAMILIES.has(primaryFamily)) return "";
  const encodedFamily = primaryFamily.replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@400;500;600;700;800;900&display=swap`;
}

function ensureGoogleFontStylesheet(fontFamily: string) {
  if (typeof document === "undefined") return;

  const href = getGoogleFontHref(fontFamily);
  if (!href) return;

  const primaryFamily = getPrimaryFontFamily(fontFamily);
  const id = `dtf-font-${primaryFamily.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  if (document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function ensureFontLoaded(fontFamily: string) {
  const cleanFontFamily = String(fontFamily || "").trim();
  if (!cleanFontFamily || typeof document === "undefined") {
    return Promise.resolve();
  }

  const cached = fontLoadCache.get(cleanFontFamily);
  if (cached) return cached;

  const promise = (async () => {
    ensureGoogleFontStylesheet(cleanFontFamily);

    if (!document.fonts?.load) return;

    try {
      await Promise.all([
        document.fonts.load(`400 32px ${cleanFontFamily}`),
        document.fonts.load(`700 32px ${cleanFontFamily}`),
      ]);
      await document.fonts.ready;
    } catch (error) {
      console.warn("Font failed to load before canvas render:", {
        fontFamily: getPrimaryFontFamily(cleanFontFamily),
        errorType: error instanceof Error ? error.name : typeof error,
      });
    }
  })();

  fontLoadCache.set(cleanFontFamily, promise);
  return promise;
}

function collectFontFamiliesFromSnapshot(snapshot: CanvasSnapshot | null) {
  const fonts = new Set<string>();

  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;

    const candidate = value as { fontFamily?: unknown; objects?: unknown };
    if (typeof candidate.fontFamily === "string" && candidate.fontFamily.trim()) {
      fonts.add(candidate.fontFamily);
    }

    if (Array.isArray(candidate.objects)) {
      candidate.objects.forEach(visit);
    }
  };

  visit(snapshot);
  return Array.from(fonts);
}

async function ensureSnapshotFontsLoaded(snapshot: CanvasSnapshot | null) {
  const fonts = collectFontFamiliesFromSnapshot(snapshot);
  if (!fonts.length) return;
  await Promise.all(fonts.map((font) => ensureFontLoaded(font)));
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createBlankMockupDataUrl(label: string) {
  const safeLabel = escapeSvgText(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BLANK_MOCKUP_SVG_WIDTH}" height="${BLANK_MOCKUP_SVG_HEIGHT}" viewBox="0 0 ${BLANK_MOCKUP_SVG_WIDTH} ${BLANK_MOCKUP_SVG_HEIGHT}">
    <rect width="100%" height="100%" fill="#f3f3f3"/>
    <rect x="${BLANK_MOCKUP_FRAME.x}" y="${BLANK_MOCKUP_FRAME.y}" width="${BLANK_MOCKUP_FRAME.width}" height="${BLANK_MOCKUP_FRAME.height}" rx="${BLANK_MOCKUP_FRAME.radius}" fill="none" stroke="#d4d4d8" stroke-width="8" stroke-dasharray="20 14"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#71717a" font-family="Arial, sans-serif" font-size="34">${safeLabel} blank mockup</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createMockupPendingDataUrl(label: string) {
  const safeLabel = escapeSvgText(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BLANK_MOCKUP_SVG_WIDTH}" height="${BLANK_MOCKUP_SVG_HEIGHT}" viewBox="0 0 ${BLANK_MOCKUP_SVG_WIDTH} ${BLANK_MOCKUP_SVG_HEIGHT}">
    <rect width="100%" height="100%" fill="#f6f7f9"/>
    <rect x="${BLANK_MOCKUP_FRAME.x}" y="${BLANK_MOCKUP_FRAME.y}" width="${BLANK_MOCKUP_FRAME.width}" height="${BLANK_MOCKUP_FRAME.height}" rx="${BLANK_MOCKUP_FRAME.radius}" fill="#ffffff" stroke="#cbd5e1" stroke-width="8" stroke-dasharray="22 16"/>
    <text x="50%" y="45%" text-anchor="middle" fill="#334155" font-family="Arial, sans-serif" font-size="42" font-weight="700">Mockup image pending</text>
    <text x="50%" y="52%" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="30">Upload product mockup in admin</text>
    <text x="50%" y="59%" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="24">${safeLabel} view</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function normalizeOptionLabel(value: string) {
  return value.trim().toLowerCase();
}

function normalizeColorName(value: string) {
  const normalized = String(value || "").trim();
  const normalizedLower = normalized.toLowerCase();
  if (normalizedLower === "black") return "Black";
  if (normalizedLower === "white") return "White";
  return normalized;
}

function getVariantSelectedOptionValue(
  variant: ProductVariant | null | undefined,
  optionNames: string[]
) {
  const normalizedOptionNames = optionNames.map(normalizeOptionLabel);
  const matchedOption =
    variant?.selectedOptions?.find((option) =>
      normalizedOptionNames.includes(normalizeOptionLabel(String(option?.name || "")))
    ) ||
    variant?.selectedOptions?.find((option) => {
      const normalizedName = normalizeOptionLabel(String(option?.name || ""));
      return normalizedOptionNames.some((expectedName) => normalizedName.includes(expectedName));
    });
  const optionValue = String(matchedOption?.value || "").trim();
  return optionValue || "";
}

function getVariantColor(
  variant: ProductVariant | null | undefined
) {
  return normalizeColorName(getVariantSelectedOptionValue(variant, COLOR_OPTION_NAMES));
}

function getVariantSize(
  variant: ProductVariant | null | undefined
) {
  return getVariantSelectedOptionValue(variant, SIZE_OPTION_NAMES);
}

function getUniqueVariantOptionValues(
  variants: NonNullable<ProductByHandleResponse["variants"]>,
  getValue: (variant: ProductVariant) => string
) {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const variant of variants) {
    const value = getValue(variant);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    values.push(value);
  }

  return values;
}

function resolveColorMockupUrl(location: PrintLocationData | undefined, selectedColor: string) {
  const colorMockups = location?.colorMockups || {};
  const normalizedSelectedColor = String(selectedColor || "").trim();
  if (!normalizedSelectedColor) return location?.mockupUrl;

  const exact = colorMockups[normalizedSelectedColor];
  const normalizedEntry = Object.entries(colorMockups).find(
    ([key]) => key.trim().toLowerCase() === normalizedSelectedColor.toLowerCase()
  );

  return exact || normalizedEntry?.[1] || location?.mockupUrl;
}

function resolveSizeMockupConfig(
  location: PrintLocationData | undefined,
  matchedSizeMockupKey: string
) {
  if (!matchedSizeMockupKey) return null;
  const sizeMockups = location?.sizeMockups;
  if (!sizeMockups || typeof sizeMockups !== "object") return null;
  const raw = sizeMockups[matchedSizeMockupKey];
  if (!raw) return null;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return {
      mockupUrl: trimmed || undefined,
    };
  }

  if (typeof raw !== "object") return null;
  const config = raw as SizeMockupConfig;
  const resolvedMockupUrl = typeof config.mockupUrl === "string"
    ? config.mockupUrl.trim()
    : typeof config.url === "string"
      ? config.url.trim()
      : "";

  return {
    mockupUrl: resolvedMockupUrl || undefined,
    colorMockups: config.colorMockups,
    x: config.x,
    y: config.y,
    width: config.width,
    height: config.height,
    maxPrintWidth: config.maxPrintWidth,
    maxPrintHeight: config.maxPrintHeight,
    designArea: config.designArea,
    printArea: config.printArea,
    print_area: config.print_area,
  };
}

function findMatchingVariant(
  variants: NonNullable<ProductByHandleResponse["variants"]>,
  selection: { color?: string; size?: string }
) {
  const normalizedColor = normalizeColorName(String(selection.color || ""));
  const normalizedSize = String(selection.size || "").trim();

  return (
    variants.find((variant) => {
      const variantColor = getVariantColor(variant);
      const variantSize = getVariantSize(variant);

      if (normalizedColor && variantColor !== normalizedColor) return false;
      if (normalizedSize && variantSize && variantSize !== normalizedSize) return false;
      return true;
    }) || null
  );
}

function getMockupRenderDimensions(naturalWidth: number, naturalHeight: number, fitRatio = MOCKUP_FIT_RATIO) {
  const canvasWidth = CANVAS_DEFAULT_WIDTH;
  const canvasHeight = CANVAS_DEFAULT_HEIGHT;
  const imgWidth = naturalWidth || 1;
  const imgHeight = naturalHeight || 1;
  const maxWidth = canvasWidth * fitRatio;
  const maxHeight = canvasHeight * fitRatio;
  const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);

  return {
    canvasWidth,
    canvasHeight,
    imgWidth,
    imgHeight,
    fitRatio,
    scale,
    renderedWidth: imgWidth * scale,
    renderedHeight: imgHeight * scale,
  };
}

function getMockupBounds(mockupRender: ReturnType<typeof getMockupRenderDimensions>) {
  return {
    left: (CANVAS_DEFAULT_WIDTH - mockupRender.renderedWidth) / 2,
    top: (CANVAS_DEFAULT_HEIGHT - mockupRender.renderedHeight) / 2,
    width: mockupRender.renderedWidth,
    height: mockupRender.renderedHeight,
  };
}

function getResolvedPrintAreaBounds(
  designArea: PrintArea,
  mockupRender: ReturnType<typeof getMockupRenderDimensions>
) {
  const mockupBounds = getMockupBounds(mockupRender);

  return {
    left: mockupBounds.left + pxFromPercentage(mockupBounds.width, designArea.x),
    top: mockupBounds.top + pxFromPercentage(mockupBounds.height, designArea.y),
    width: pxFromPercentage(mockupBounds.width, designArea.width),
    height: pxFromPercentage(mockupBounds.height, designArea.height),
  };
}

const GENERIC_BLANK_MOCKUPS: Record<ViewName, string> = {
  front: createBlankMockupDataUrl("Front"),
  back: createBlankMockupDataUrl("Back"),
  leftSleeve: createBlankMockupDataUrl("Left sleeve"),
  rightSleeve: createBlankMockupDataUrl("Right sleeve"),
  neck: createBlankMockupDataUrl("Neck label"),
};

function clampPercentage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
}

function normalizeBoundPercent(value: unknown, fallback: number) {
  // Accept both normalized decimals (0-1) and percentages (0-100) from metafield payloads.
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed >= 0 && parsed <= 1) return clampPercentage(parsed * 100, fallback);
  return clampPercentage(parsed, fallback);
}

function normalizeDesignArea(value?: Partial<PrintLocationData>): PrintArea {
  const designArea = value?.designArea;
  const printArea = value?.printArea;
  const legacyPrintArea = value?.print_area;
  return {
    x: normalizeBoundPercent(
      designArea?.x ?? printArea?.x ?? legacyPrintArea?.x ?? value?.x,
      DEFAULT_DESIGN_AREA.x
    ),
    y: normalizeBoundPercent(
      designArea?.y ?? printArea?.y ?? legacyPrintArea?.y ?? value?.y,
      DEFAULT_DESIGN_AREA.y
    ),
    width: normalizeBoundPercent(
      designArea?.width ?? printArea?.width ?? legacyPrintArea?.width ?? value?.width,
      DEFAULT_DESIGN_AREA.width
    ),
    height: normalizeBoundPercent(
      designArea?.height ?? printArea?.height ?? legacyPrintArea?.height ?? value?.height,
      DEFAULT_DESIGN_AREA.height
    ),
  };
}

function parsePrintLocations(value?: string): PrintLocationsMap {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to parse dtf.print_locations metafield:", {
      error,
      valuePreview: String(value).slice(0, 500),
    });
    return {};
  }
}

function normalizePrintLimit(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function hasLocationObject(location?: PrintLocationData) {
  return Boolean(location && typeof location === "object");
}

function hasMetafieldLocationData(printLocations: PrintLocationsMap) {
  return (Object.keys(VIEW_LOCATION_KEYS) as ViewName[]).some((view) =>
    VIEW_LOCATION_KEYS[view].some((key) => hasLocationObject(printLocations[key]))
  );
}

function getAvailableViews(printLocations: PrintLocationsMap) {
  return (Object.keys(VIEW_LABELS) as ViewName[]).filter((view) =>
    VIEW_LOCATION_KEYS[view].some((key) => hasLocationObject(printLocations[key]))
  );
}

function parseTransferSize(value: string) {
  const match = String(value || "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

function parseSizeLabel(value: string) {
  return parseTransferSize(value.replace(/[×]/g, "x"));
}

function formatInches(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return Number(value.toFixed(value >= 10 ? 1 : 2)).toString();
}

function formatPixels(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return Math.round(value).toLocaleString();
}

function inchesToPrintPixels(value: number) {
  return Math.max(0, Math.round(value * PRINT_DPI));
}

function getImageElementSize(imageObject: FabricImage) {
  const element = (
    imageObject as unknown as {
      getElement?: () => {
        naturalWidth?: number;
        naturalHeight?: number;
        width?: number;
        height?: number;
      };
    }
  ).getElement?.();

  return {
    width: Number(element?.naturalWidth || element?.width || imageObject.width || 1),
    height: Number(element?.naturalHeight || element?.height || imageObject.height || 1),
  };
}

function getSafeTransferSizeForView(view: ViewName) {
  if (view === "leftSleeve" || view === "rightSleeve") return "4x5";
  if (view === "neck") return "3x3";
  return "12x12";
}

function isSmallPrintLocation(view: ViewName) {
  return view === "leftSleeve" || view === "rightSleeve" || view === "neck";
}

function getSmallPrintAreaLabel(view: ViewName) {
  if (!isSmallPrintLocation(view)) return "";
  if (view === "neck") return "3 in × 3 in";
  return "4 in × 5 in";
}

function getMockupImageClassName() {
  return "absolute left-1/2 top-1/2 z-0 block max-h-full max-w-full object-contain transition-all duration-200";
}

function getPreviewStageClassName(view: ViewName) {
  const base = "relative shrink-0 overflow-visible rounded border border-[#333] bg-white shadow-2xl";
  if (view === "leftSleeve" || view === "rightSleeve" || view === "neck") {
    return `${base} origin-top`;
  }
  return base;
}

function getProductPrintLocationOverride(productHandle: string, locationKey: string) {
  const normalizedHandle = productHandle.trim().toLowerCase();
  if (!normalizedHandle) return undefined;
  return PRODUCT_PRINT_LOCATION_OVERRIDES[normalizedHandle]?.[locationKey];
}

function getPrintLocationDataForView(
  printLocations: PrintLocationsMap,
  view: ViewName,
  productHandle: string
): { activeLocation: string; activeLocationData: PrintLocationData } {
  const keys = VIEW_LOCATION_KEYS[view];

  for (const key of keys) {
    const location = printLocations[key];
    if (location && typeof location === "object") {
      return {
        activeLocation: key,
        activeLocationData: location,
      };
    }
  }

  const fallbackKey = keys[0] || view;
  const fallbackLocation = DEFAULT_MOCKUP_LOCATIONS[view] || {};

  return {
    activeLocation: fallbackKey,
    activeLocationData: fallbackLocation,
  };
}

function normalizeProductIdentifier(value: string | undefined | null) {
  return String(value || "").trim().toLowerCase();
}

function isTransferProduct(productHandle: string, productTitle: string) {
  const joined = `${normalizeProductIdentifier(productHandle)} ${normalizeProductIdentifier(productTitle)}`;
  return (
    joined.includes("dtf-transfer") ||
    joined.includes("dtf transfer") ||
    joined.includes("gang-sheet") ||
    joined.includes("gang sheet") ||
    joined.includes("gangsheet")
  );
}

function isApparelProduct(productHandle: string, productTitle: string) {
  const joined = `${normalizeProductIdentifier(productHandle)} ${normalizeProductIdentifier(productTitle)}`;
  return (
    joined.includes("custom-t-shirt") ||
    joined.includes("custom t-shirt") ||
    joined.includes("t-shirt") ||
    joined.includes("hoodie") ||
    joined.includes("apparel")
  );
}

function resolveCustomizerMode(args: {
  productHandle: string;
  productTitle: string;
  hasPlacementMetafields: boolean;
}): CustomizerMode {
  const { productHandle, productTitle, hasPlacementMetafields } = args;
  if (isApparelProduct(productHandle, productTitle)) return "apparel";
  if (isTransferProduct(productHandle, productTitle) && !hasPlacementMetafields) return "transfer";
  if (hasPlacementMetafields) return "apparel";
  return "transfer";
}

function resolveMockupUrl(
  metafieldMockupUrl: string | undefined,
  view: ViewName,
  productHandle: string
) {
  const trimmedMetafieldMockup = String(metafieldMockupUrl || "").trim();
  if (trimmedMetafieldMockup) return trimmedMetafieldMockup;

  const normalizedHandle = productHandle.trim().toLowerCase();
  const productFallback = normalizedHandle ? PRODUCT_BLANK_MOCKUPS[normalizedHandle]?.[view] : undefined;
  if (productFallback) return productFallback;

  const defaultFallback = DEFAULT_MOCKUP_LOCATIONS[view]?.mockupUrl;
  if (defaultFallback) return defaultFallback;

  return GENERIC_BLANK_MOCKUPS[view] || "";
}

function createDesignId() {
  const timestamp = Date.now();
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === "function") {
    return `DTF-${timestamp}-${cryptoApi.randomUUID()}`;
  }

  if (!cryptoApi?.getRandomValues) {
    return `DTF-${timestamp}-${Math.random().toString(36).slice(2, 14)}`;
  }

  const values = new Uint32Array(4);
  cryptoApi.getRandomValues(values);

  return `DTF-${timestamp}-${Array.from(values, (value) => value.toString(36)).join("")}`;
}

function PrintLocationControls({
  availableViews,
  currentView,
  isReady,
  loadView,
  printLocationsError,
}: {
  availableViews: ViewName[];
  currentView: ViewName;
  isReady: boolean;
  loadView: (view: ViewName) => void;
  printLocationsError: string;
}) {
  return (
    <section className="border-b border-[#222] bg-[#111] px-4 py-4 md:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            Current View
          </p>
          <p className="mt-1 text-sm text-gray-200">
            <strong className="text-white">{VIEW_LABELS[currentView]}</strong>
            {!isReady ? <span className="ml-2 text-yellow-400">Loading canvas...</span> : null}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {availableViews.map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => loadView(view)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
              currentView === view
                ? "border-white bg-white text-black"
                : "border-[#303030] bg-[#1a1a1a] text-white hover:bg-[#262626]"
            }`}
          >
            {VIEW_LABELS[view]}
          </button>
        ))}
      </div>

      {!availableViews.length ? (
        <p className="mt-3 text-xs text-gray-400">
          No print locations are configured for this product.
        </p>
      ) : null}

      {printLocationsError ? (
        <div
          id="print-locations-error"
          role="alert"
          aria-live="polite"
          className="mt-3 rounded border border-red-700 bg-red-950 px-3 py-2 text-sm text-red-200"
        >
          {printLocationsError}
        </div>
      ) : null}
    </section>
  );
}

function isCloudinaryUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("https://res.cloudinary.com/");
}

function getObjectType(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const candidate = value as { type?: unknown };
  return typeof candidate.type === "string" ? candidate.type : "";
}

function isTextObject(value: unknown): value is Textbox {
  const type = getObjectType(value);
  return type === "textbox" || type === "text" || type === "i-text";
}

function isImageObject(value: unknown): value is FabricImage {
  return getObjectType(value) === "image";
}

function isLockedObject(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { lockMovementX?: unknown; lockMovementY?: unknown };
  return Boolean(candidate.lockMovementX) && Boolean(candidate.lockMovementY);
}

function pxFromPercentage(total: number, percent: number) {
  return (total * percent) / 100;
}

function distanceFromPrintableArea(bounds: { left: number; top: number; width: number; height: number }, area: { left: number; top: number; width: number; height: number }) {
  const boundsRight = bounds.left + bounds.width;
  const boundsBottom = bounds.top + bounds.height;
  const areaRight = area.left + area.width;
  const areaBottom = area.top + area.height;

  const overflowLeft = Math.max(0, area.left - bounds.left);
  const overflowTop = Math.max(0, area.top - bounds.top);
  const overflowRight = Math.max(0, boundsRight - areaRight);
  const overflowBottom = Math.max(0, boundsBottom - areaBottom);
  return Math.max(overflowLeft, overflowTop, overflowRight, overflowBottom);
}

function sanitizeAiDebugValue(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) {
      return "[image data url redacted]";
    }
    if (value.length > 240) {
      return `${value.slice(0, 240)}...`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeAiDebugValue);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey.includes("imagedataurl")
        || normalizedKey.includes("dataurl")
        || normalizedKey.includes("imageurl")
        || normalizedKey.includes("base64")
      ) {
        return [key, typeof entryValue === "string" ? "[image value redacted]" : sanitizeAiDebugValue(entryValue)];
      }
      return [key, sanitizeAiDebugValue(entryValue)];
    });

    return Object.fromEntries(entries);
  }

  return value;
}

function sanitizeAiDebugDetails(details: Record<string, unknown>) {
  return sanitizeAiDebugValue(details) as Record<string, unknown>;
}

function formatAiErrorMessage(result: AiActionResponse, fallback: string) {
  const message = result.error || fallback;
  const category = result.diagnostics?.safeErrorCategory;
  const categoryText = category && category !== "success" ? ` Category: ${category}.` : "";
  return result.requestId
    ? `${message}${categoryText} Request ID: ${result.requestId}`
    : `${message}${categoryText}`;
}

export default function CustomizerPage() {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);

  const [currentView, setCurrentView] = useState<ViewName>("front");
  const [isReady, setIsReady] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState(FALLBACK_VARIANT_ID);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("Custom");
  const [transferSize, setTransferSize] = useState("12x12");
  const [cartStatus, setCartStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productHandle, setProductHandle] = useState("");
  const [productData, setProductData] = useState<ProductByHandleResponse | null>(null);
  const [hasVariantInQuery, setHasVariantInQuery] = useState(false);
  const [printLocations, setPrintLocations] = useState<PrintLocationsMap>({});
  const [rawPrintLocations, setRawPrintLocations] = useState("");
  const [printLocationsError, setPrintLocationsError] = useState("");
  const [shouldDebugAiLog, setShouldDebugAiLog] = useState(false);
  const [selectedObjectType, setSelectedObjectType] = useState("none");
  const [selectedLocked, setSelectedLocked] = useState(false);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [boundaryWarning, setBoundaryWarning] = useState("");
  const [imageQualityWarning, setImageQualityWarning] = useState("");
  const [selectedDesignMetrics, setSelectedDesignMetrics] = useState<SelectedDesignMetrics>(null);
  const [cropControls, setCropControls] = useState<CropControlsState>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [activeAiAction, setActiveAiAction] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [designIdeaPrompt, setDesignIdeaPrompt] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [previewScale, setPreviewScale] = useState(1);
  const [mockupNaturalSize, setMockupNaturalSize] = useState({ width: 0, height: 0 });
  const [mockupLoadFailed, setMockupLoadFailed] = useState(false);
  const [textControls, setTextControls] = useState<TextControlsState>(DEFAULT_TEXT_CONTROLS);
  const printableAreaRef = useRef({ left: 0, top: 0, width: 0, height: 0 });
  const shouldDebugAiLogRef = useRef(false);
  const lastSentIframeHeightRef = useRef(0);
  const draftAutosaveTimerRef = useRef<number | null>(null);
  const lastSavedDraftRef = useRef("");
  const restoredDraftKeyRef = useRef("");
  const isRestoringDraftRef = useRef(false);
  const isClearingDraftRef = useRef(false);
  const suspendAutosaveRef = useRef(true);
  const historyPastRef = useRef<CanvasSnapshot[]>([]);
  const historyFutureRef = useRef<CanvasSnapshot[]>([]);
  const isApplyingHistoryRef = useRef(false);
  const isSwitchingViewRef = useRef(false);
  const historyTimerRef = useRef<number | null>(null);
  const isCanvasObjectInteractingRef = useRef(false);
  const pendingPreviewScaleUpdateRef = useRef(false);
  const updatePreviewScaleRef = useRef<(() => void) | null>(null);
  const currentViewRef = useRef<ViewName>("front");
  const requestDraftSaveRef = useRef<(options?: { resume?: boolean }) => void>(() => {});

  const viewsRef = useRef<Record<ViewName, CanvasSnapshot | null>>(createEmptyViews());
  const uploadedArtworkByViewRef = useRef<Record<ViewName, string>>(createEmptyUploadedArtworkByView());

  const getCanvas = () => fabricCanvasRef.current;
  const normalizedProductHandle = productHandle.trim();
  const normalizedVariantId = normalizeVariantId(variantId) || variantId;
  const draftStorageKey = `${DRAFT_STORAGE_KEY_PREFIX}:${normalizedProductHandle || "standalone"}:design`;
  const legacyVariantDraftStorageKey = `${DRAFT_STORAGE_KEY_PREFIX}:${normalizedProductHandle || "standalone"}:${
    normalizedVariantId || "default"
  }`;

  const cancelDraftAutosave = () => {
    if (draftAutosaveTimerRef.current === null) return;
    window.clearTimeout(draftAutosaveTimerRef.current);
    draftAutosaveTimerRef.current = null;
  };

  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  const captureViewSnapshot = (
    canvasOverride?: Canvas | null,
    viewOverride?: ViewName
  ): CanvasSnapshot | null => {
    const canvas = canvasOverride ?? getCanvas();
    const targetView = viewOverride ?? currentViewRef.current;
    if (!canvas) return null;
    tagCanvasObjectsForView(canvas, targetView);
    const snapshot = filterCanvasSnapshotForView(
      (canvas as unknown as { toJSON: (propertiesToInclude?: string[]) => CanvasSnapshot }).toJSON(CANVAS_JSON_PROPS),
      targetView
    );
    viewsRef.current[targetView] = snapshot;
    return snapshot;
  };

  const buildDraftPayload = (): DraftPayload | null => {
    if (!draftStorageKey) return null;
    const canvas = getCanvas();
    if (!canvas) return null;

    const activeView = currentViewRef.current;
    const activeCanvas = captureViewSnapshot(canvas, activeView);
    return {
      version: DRAFT_STORAGE_VERSION,
      productHandle: normalizedProductHandle,
      variantId: normalizedVariantId,
      selectedColor,
      selectedSize,
      transferSize,
      quantity: normalizeDraftQuantity(quantity),
      currentView: activeView,
      views: { ...viewsRef.current },
      activeCanvas,
      uploadedArtworkByView: { ...uploadedArtworkByViewRef.current },
      savedAt: Date.now(),
    };
  };

  const requestDraftSave = (options?: { resume?: boolean }) => {
    if (typeof window === "undefined") return;
    if (!draftStorageKey) return;
    if (restoredDraftKeyRef.current !== draftStorageKey) return;
    if (isRestoringDraftRef.current || isClearingDraftRef.current) return;
    if (isCanvasObjectInteractingRef.current) return;

    if (options?.resume) {
      suspendAutosaveRef.current = false;
    }

    if (suspendAutosaveRef.current) return;

    cancelDraftAutosave();
    draftAutosaveTimerRef.current = window.setTimeout(() => {
      try {
        const payload = buildDraftPayload();
        if (!payload) return;

        const serialized = JSON.stringify(payload);
        if (serialized === lastSavedDraftRef.current) return;

        window.localStorage.setItem(draftStorageKey, serialized);
        lastSavedDraftRef.current = serialized;
        setDraftStatus("Design autosaved");
      } catch (error) {
        console.error("Failed to autosave design draft:", error);
      }
    }, DRAFT_AUTOSAVE_DEBOUNCE_MS);
  };

  useEffect(() => {
    requestDraftSaveRef.current = requestDraftSave;
  });

  const updateHistoryAvailability = () => {
    setCanUndo(historyPastRef.current.length > 1);
    setCanRedo(historyFutureRef.current.length > 0);
  };

  const getCanvasSnapshot = (canvasOverride?: Canvas | null): CanvasSnapshot | null => {
    const canvas = canvasOverride ?? getCanvas();
    if (!canvas) return null;
    tagCanvasObjectsForView(canvas, currentViewRef.current);
    return filterCanvasSnapshotForView(
      (canvas as unknown as { toJSON: (propertiesToInclude?: string[]) => CanvasSnapshot }).toJSON(CANVAS_JSON_PROPS),
      currentViewRef.current
    );
  };

  const pushHistorySnapshot = (options?: { clearFuture?: boolean }) => {
    if (isApplyingHistoryRef.current || isRestoringDraftRef.current) return;
    const snapshot = getCanvasSnapshot();
    if (!snapshot) return;

    const serialized = JSON.stringify(snapshot);
    const previous = historyPastRef.current[historyPastRef.current.length - 1];
    if (previous && JSON.stringify(previous) === serialized) {
      updateHistoryAvailability();
      return;
    }

    historyPastRef.current = [...historyPastRef.current, snapshot].slice(-MAX_HISTORY_STATES);
    if (options?.clearFuture !== false) {
      historyFutureRef.current = [];
    }
    updateHistoryAvailability();
  };

  const scheduleHistorySnapshot = () => {
    if (typeof window === "undefined") return;
    if (historyTimerRef.current !== null) {
      window.clearTimeout(historyTimerRef.current);
    }
    historyTimerRef.current = window.setTimeout(() => {
      historyTimerRef.current = null;
      pushHistorySnapshot();
    }, 150);
  };

  const resetHistoryForCurrentCanvas = () => {
    const snapshot = getCanvasSnapshot();
    historyPastRef.current = snapshot ? [snapshot] : [];
    historyFutureRef.current = [];
    updateHistoryAvailability();
  };

  const loadHistorySnapshot = async (snapshot: CanvasSnapshot | null) => {
    const canvas = getCanvas();
    if (!canvas || !snapshot) return;

    isApplyingHistoryRef.current = true;
    canvas.clear();
    canvas.backgroundColor = "transparent";
    canvas.discardActiveObject();
    const viewSnapshot = filterCanvasSnapshotForView(snapshot, currentViewRef.current);
    await ensureSnapshotFontsLoaded(viewSnapshot);
    await canvas.loadFromJSON(viewSnapshot);
    canvas.requestRenderAll();
    captureViewSnapshot(canvas, currentViewRef.current);
    syncSelectedObject();
    requestDraftSave({ resume: true });
    isApplyingHistoryRef.current = false;
  };

  const undoCanvasChange = async () => {
    const previous = historyPastRef.current;
    if (previous.length <= 1) return;

    const current = previous[previous.length - 1];
    const target = previous[previous.length - 2];
    historyPastRef.current = previous.slice(0, -1);
    historyFutureRef.current = [current, ...historyFutureRef.current].slice(0, MAX_HISTORY_STATES);
    updateHistoryAvailability();
    await loadHistorySnapshot(target);
  };

  const redoCanvasChange = async () => {
    const [target, ...remainingFuture] = historyFutureRef.current;
    if (!target) return;

    historyFutureRef.current = remainingFuture;
    historyPastRef.current = [...historyPastRef.current, target].slice(-MAX_HISTORY_STATES);
    updateHistoryAvailability();
    await loadHistorySnapshot(target);
  };

  // Intentionally keyed to readiness + product + variant. Other referenced functions are stable enough here,
  // and re-running on every render would cause unnecessary draft restore attempts.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const MIN_HEIGHT_CHANGE_THRESHOLD = 80;
    const HEIGHT_UPDATE_DEBOUNCE_MS = 250;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const sendHeight = () => {
      if (timer) clearTimeout(timer);

      timer = setTimeout(() => {
        const contentHeight = Math.ceil(
          Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight,
            document.documentElement.offsetHeight,
            document.body.offsetHeight
          )
        );
        const viewportHeight = Math.ceil(
          window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0
        );
        const params = new URLSearchParams(window.location.search);
        const hasShopifySource = params.get("source") === "shopify";
        const nextHeight = hasShopifySource
          ? Math.max(320, viewportHeight)
          : Math.max(contentHeight, viewportHeight);

        const previousHeight = lastSentIframeHeightRef.current;
        const heightDifference = Math.abs(nextHeight - previousHeight);

        if (previousHeight && heightDifference < MIN_HEIGHT_CHANGE_THRESHOLD) {
          return;
        }

        lastSentIframeHeightRef.current = nextHeight;

        window.parent?.postMessage(
          {
            type: "DTF_IFRAME_HEIGHT",
            height: nextHeight,
          },
          "*"
        );
      }, HEIGHT_UPDATE_DEBOUNCE_MS);
    };

    sendHeight();

    const timeouts = [300, 800, 1500, 2500].map((delay) =>
      window.setTimeout(sendHeight, delay)
    );

    window.addEventListener("load", sendHeight);
    window.addEventListener("resize", sendHeight);
    window.addEventListener("orientationchange", sendHeight);

    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);

    return () => {
      if (timer) clearTimeout(timer);
      timeouts.forEach(window.clearTimeout);
      window.removeEventListener("load", sendHeight);
      window.removeEventListener("resize", sendHeight);
      window.removeEventListener("orientationchange", sendHeight);
      observer.disconnect();
    };
  }, []);

  const logAiDebug = (action: string, details: Record<string, unknown>) => {
    if (!shouldDebugAiLogRef.current) return;
    const activeObject = getCanvas()?.getActiveObject();
    console.log("[AI DEBUG]", {
      selectedObjectType: getObjectType(activeObject) || "none",
      aiActionRequested: action,
      ...sanitizeAiDebugDetails(details),
    });
  };

  const getPrintableScale = () => {
    const area = printableAreaRef.current;
    const sheetWidth = Math.max(activeSheetSize.width, 0.1);
    const sheetHeight = Math.max(activeSheetSize.height, 0.1);

    return {
      area,
      sheetWidth,
      sheetHeight,
      canvasPxPerInX: area.width / sheetWidth,
      canvasPxPerInY: area.height / sheetHeight,
    };
  };

  const updateSelectedDesignMetrics = () => {
    const canvas = getCanvas();
    const activeObject = canvas?.getActiveObject();

    if (!canvas || !activeObject) {
      setSelectedDesignMetrics(null);
      return;
    }

    const { area, sheetWidth, sheetHeight } = getPrintableScale();
    const bounds = activeObject.getBoundingRect();
    const widthIn = (bounds.width / Math.max(area.width, 1)) * sheetWidth;
    const heightIn = (bounds.height / Math.max(area.height, 1)) * sheetHeight;
    const exceedsBounds = distanceFromPrintableArea(bounds, area) > 0;

    setSelectedDesignMetrics({
      widthIn,
      heightIn,
      widthPx: inchesToPrintPixels(widthIn),
      heightPx: inchesToPrintPixels(heightIn),
      left: bounds.left,
      top: bounds.top,
      widthCanvas: bounds.width,
      heightCanvas: bounds.height,
      exceedsBounds,
    });
  };

  const syncCropControlsFromActiveImage = () => {
    const activeObject = getCanvas()?.getActiveObject();
    if (!isImageObject(activeObject)) {
      setCropControls({ x: 0, y: 0, width: 0, height: 0 });
      return;
    }

    const { sheetWidth, sheetHeight, area } = getPrintableScale();
    const cropCandidate = activeObject as FabricImage & {
      cropX?: number;
      cropY?: number;
    };

    const scaleX = Number(activeObject.scaleX) || 1;
    const scaleY = Number(activeObject.scaleY) || 1;
    const cropX = Number(cropCandidate.cropX) || 0;
    const cropY = Number(cropCandidate.cropY) || 0;
    const cropWidth = Number(activeObject.width) || 0;
    const cropHeight = Number(activeObject.height) || 0;

    setCropControls({
      x: (cropX * scaleX / Math.max(area.width, 1)) * sheetWidth,
      y: (cropY * scaleY / Math.max(area.height, 1)) * sheetHeight,
      width: (cropWidth * scaleX / Math.max(area.width, 1)) * sheetWidth,
      height: (cropHeight * scaleY / Math.max(area.height, 1)) * sheetHeight,
    });
  };

  const updateLayers = () => {
    const canvas = getCanvas();
    if (!canvas) {
      setLayers([]);
      return;
    }

    const activeObject = canvas.getActiveObject();
    const nextLayers = canvas
      .getObjects()
      .map((object, index) => {
        const objectType = getObjectType(object) || "object";
        const objectName =
          typeof (object as { name?: unknown }).name === "string"
            ? String((object as { name?: unknown }).name).trim()
            : "";
        const textPreview = isTextObject(object)
          ? String(object.text || "").replace(/\s+/g, " ").trim()
          : "";
        const label = objectName || (textPreview
          ? `Text: ${textPreview.slice(0, 24)}`
          : objectType === "image"
            ? `Artwork ${index + 1}`
            : `${objectType} ${index + 1}`);

        return {
          id: `${objectType}-${index}`,
          index,
          label,
          type: objectType,
          locked: isLockedObject(object),
          visible: (object as { visible?: boolean }).visible !== false,
          active: object === activeObject,
        };
      })
      .reverse();

    setLayers(nextLayers);
  };

  const withLayerObject = (
    index: number,
    callback: (object: Parameters<Canvas["centerObject"]>[0]) => void
  ) => {
    const canvas = getCanvas();
    const object = canvas?.getObjects()[index];
    if (!canvas || !object) return;

    callback(object);
    object.setCoords();
    canvas.requestRenderAll();
    updateLayers();
    scheduleHistorySnapshot();
    requestDraftSave({ resume: true });
  };

  const renameLayer = (index: number) => {
    const canvas = getCanvas();
    const object = canvas?.getObjects()[index];
    if (!canvas || !object || typeof window === "undefined") return;

    const currentName = String((object as { name?: unknown }).name || "");
    const nextName = window.prompt("Layer name", currentName);
    if (nextName === null) return;

    (object as { name?: string }).name = nextName.trim();
    updateLayers();
    requestDraftSave({ resume: true });
  };

  const toggleLayerVisibility = (index: number) => {
    withLayerObject(index, (object) => {
      const mutable = object as { visible?: boolean };
      mutable.visible = mutable.visible === false;
    });
  };

  const toggleLayerLock = (index: number) => {
    withLayerObject(index, (object) => {
      const current = isLockedObject(object);
      const target = !current;
      const mutable = object as {
        lockMovementX?: boolean;
        lockMovementY?: boolean;
        lockScalingX?: boolean;
        lockScalingY?: boolean;
        lockRotation?: boolean;
        selectable?: boolean;
      };
      mutable.lockMovementX = target;
      mutable.lockMovementY = target;
      mutable.lockScalingX = target;
      mutable.lockScalingY = target;
      mutable.lockRotation = target;
      mutable.selectable = true;
    });
  };

  const duplicateLayer = async (index: number) => {
    const canvas = getCanvas();
    const object = canvas?.getObjects()[index];
    if (!canvas || !object) return;

    const clone = await object.clone();
    clone.set({ left: (object.left || 0) + 20, top: (object.top || 0) + 20 });
    canvas.add(clone);
    canvas.setActiveObject(clone);
    clone.setCoords();
    canvas.requestRenderAll();
    syncSelectedObject();
    requestDraftSave({ resume: true });
  };

  const bringLayerForward = (index: number) => {
    const canvas = getCanvas();
    const object = canvas?.getObjects()[index];
    if (!canvas || !object) return;
    canvas.setActiveObject(object);
    canvas.bringObjectForward(object);
    canvas.requestRenderAll();
    syncSelectedObject();
    requestDraftSave({ resume: true });
  };

  const sendLayerBackward = (index: number) => {
    const canvas = getCanvas();
    const object = canvas?.getObjects()[index];
    if (!canvas || !object) return;
    canvas.setActiveObject(object);
    canvas.sendObjectBackwards(object);
    canvas.requestRenderAll();
    syncSelectedObject();
    requestDraftSave({ resume: true });
  };

  const deleteLayer = (index: number) => {
    const canvas = getCanvas();
    const object = canvas?.getObjects()[index];
    if (!canvas || !object) return;
    const objectType = getObjectType(object);

    canvas.remove(object);
    canvas.discardActiveObject();

    if (objectType === "image") {
      const hasRemainingImageObjects = canvas
        .getObjects()
        .some((candidate) => getObjectType(candidate) === "image");

      if (!hasRemainingImageObjects) {
        uploadedArtworkByViewRef.current[currentViewRef.current] = "";
      }
    }

    canvas.requestRenderAll();
    syncSelectedObject();
    requestDraftSave({ resume: true });
  };

  const selectLayer = (index: number) => {
    const canvas = getCanvas();
    const object = canvas?.getObjects()[index];
    if (!canvas || !object) return;

    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    syncSelectedObject();
  };

  const syncTextControlsFromObject = (textObject: Textbox) => {
    const shadowValue = textObject.shadow;
    const hasGlow = shadowValue instanceof Shadow && shadowValue.blur >= 12 && shadowValue.offsetX === 0 && shadowValue.offsetY === 0;
    const hasShadow = shadowValue instanceof Shadow && !hasGlow && shadowValue.blur > 0;
    const curveModeCandidate = (textObject as unknown as { __curveMode?: CurveMode }).__curveMode;

    setTextControls((prev) => ({
      ...prev,
      fontFamily: textObject.fontFamily || "Arial",
      fontSize: Math.round(Number(textObject.fontSize) || 32),
      textColor: (textObject.fill as string) || "#000000",
      outlineColor: (textObject.stroke as string) || "#000000",
      outlineWidth: Number(textObject.strokeWidth) || 0,
      letterSpacing: Number(textObject.charSpacing) || 0,
      lineHeight: Number(textObject.lineHeight) || 1.16,
      textAlign:
        textObject.textAlign === "left" || textObject.textAlign === "right"
          ? textObject.textAlign
          : "center",
      opacity: Number(textObject.opacity) || 1,
      bold: textObject.fontWeight === "bold" || Number(textObject.fontWeight) >= 700,
      italic: textObject.fontStyle === "italic",
      uppercase:
        typeof textObject.text === "string" &&
        /[a-zA-Z]/.test(textObject.text) &&
        textObject.text === textObject.text.toUpperCase(),
      shadow: hasShadow,
      glow: hasGlow,
      curveMode: curveModeCandidate === "arcUp" || curveModeCandidate === "arcDown" || curveModeCandidate === "wave" ? curveModeCandidate : "none",
    }));
  };

  const updateBoundaryWarning = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();

    if (!activeObject) {
      setBoundaryWarning("");
      return;
    }

    const bounds = activeObject.getBoundingRect();
    const overflow = distanceFromPrintableArea(bounds, printableAreaRef.current);

    if (overflow > 0) {
      setBoundaryWarning("Selected design exceeds this location's print size limit.");
      return;
    }

    setBoundaryWarning("");
  };

  const syncSelectedObject = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();

    setSelectedObjectType(getObjectType(activeObject) || "none");
    setSelectedLocked(isLockedObject(activeObject));

    if (isTextObject(activeObject)) {
      syncTextControlsFromObject(activeObject);
    }

    updateBoundaryWarning();
    updateSelectedDesignMetrics();
    syncCropControlsFromActiveImage();
    updateLayers();
  };

  const saveCurrentView = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    captureViewSnapshot(canvas, currentViewRef.current);
  };

  const loadView = async (view: ViewName) => {
    const canvas = getCanvas();
    if (!canvas) return;

    const previousView = currentViewRef.current;
    captureViewSnapshot(canvas, previousView);
    isSwitchingViewRef.current = true;

    try {
      canvas.clear();
      canvas.backgroundColor = "transparent";
      canvas.discardActiveObject();

      currentViewRef.current = view;
      setCurrentView(view);
      setAiSuggestions([]);
      setBoundaryWarning("");
      setImageQualityWarning("");

      if (isSmallPrintLocation(view)) {
        setTransferSize(getSafeTransferSizeForView(view));
      }

      const saved = filterCanvasSnapshotForView(viewsRef.current[view], view);
      viewsRef.current[view] = saved;
      if (saved?.objects?.length) {
        await ensureSnapshotFontsLoaded(saved);
        await canvas.loadFromJSON(saved);
      }

      canvas.renderAll();
      const savedArtworkUrl = uploadedArtworkByViewRef.current[view];
      setCartStatus(savedArtworkUrl ? `Using saved Cloudinary artwork for ${VIEW_LABELS[view]}.` : "");
      syncSelectedObject();
      resetHistoryForCurrentCanvas();
      setImageQualityWarning("");
      requestDraftSave({ resume: true });
    } finally {
      isSwitchingViewRef.current = false;
    }
  };

  const applyTextCurve = (textObject: Textbox, mode: CurveMode, bendCurve: number) => {
    if (mode === "none") {
      textObject.set("path", undefined);
      (textObject as unknown as { __curveMode?: CurveMode }).__curveMode = "none";
      return;
    }

    const width = Math.max(Number(textObject.width) || 260, 160);
    const amplitude = Math.max(
      MIN_CURVE_AMPLITUDE,
      Math.min(MAX_CURVE_AMPLITUDE, Math.abs(bendCurve))
    );

    const curveByMode: Record<Exclude<CurveMode, "none">, string> = {
      arcUp: `M ${-width / 2} 0 Q 0 ${-amplitude} ${width / 2} 0`,
      arcDown: `M ${-width / 2} 0 Q 0 ${amplitude} ${width / 2} 0`,
      wave: `M ${-width / 2} 0 C ${-width / 4} ${-amplitude}, ${width / 4} ${amplitude}, ${width / 2} 0`,
    };

    const path = new Path(curveByMode[mode], { visible: false, strokeWidth: 0, fill: "" });
    textObject.set({ path, pathAlign: "center", pathSide: "left", pathStartOffset: 0 });
    (textObject as unknown as { __curveMode?: CurveMode }).__curveMode = mode;
  };

  const withActiveTextObject = (callback: (textObject: Textbox) => void) => {
    const activeObject = getCanvas()?.getActiveObject();
    if (!isTextObject(activeObject)) {
      setAiStatus("Select a text object first.");
      return;
    }

    callback(activeObject);
    activeObject.setCoords();
    getCanvas()?.requestRenderAll();
    syncTextControlsFromObject(activeObject);
    updateBoundaryWarning();
  };

  const applyTextControls = (next: TextControlsState) => {
    withActiveTextObject((textObject) => {
      const baseText = String(textObject.text || "");
      const nextText = next.uppercase ? baseText.toUpperCase() : baseText;

      let nextShadow: Shadow | undefined;
      if (next.glow) {
        nextShadow = new Shadow({ color: next.outlineColor || next.textColor, blur: 18, offsetX: 0, offsetY: 0, affectStroke: true });
      } else if (next.shadow) {
        nextShadow = new Shadow({ color: "rgba(0,0,0,0.45)", blur: 8, offsetX: 3, offsetY: 3, affectStroke: false });
      }

      textObject.set({
        text: nextText,
        fontFamily: next.fontFamily,
        fontSize: next.fontSize,
        fill: next.textColor,
        stroke: next.outlineColor,
        strokeWidth: next.outlineWidth,
        charSpacing: next.letterSpacing,
        lineHeight: next.lineHeight,
        textAlign: next.textAlign,
        opacity: next.opacity,
        fontWeight: next.bold ? "bold" : "normal",
        fontStyle: next.italic ? "italic" : "normal",
        shadow: nextShadow,
      });

      applyTextCurve(textObject, next.curveMode, next.bendCurve);
    });
    scheduleHistorySnapshot();

    void ensureFontLoaded(next.fontFamily).then(() => {
      const canvas = getCanvas();
      const activeObject = canvas?.getActiveObject();
      if (!canvas || !isTextObject(activeObject)) return;
      if (activeObject.fontFamily !== next.fontFamily) return;
      activeObject.dirty = true;
      activeObject.setCoords();
      canvas.requestRenderAll();
      requestDraftSave({ resume: true });
    });
  };

  const updateTextControls = (patch: Partial<TextControlsState>) => {
    setTextControls((prev) => {
      const next = { ...prev, ...patch };
      applyTextControls(next);
      return next;
    });
  };

  const replaceActiveImage = async (nextDataUrl: string) => {
    const canvas = getCanvas();
    if (!canvas) return false;
    const activeObject = canvas.getActiveObject();
    if (!isImageObject(activeObject)) return false;

    const index = canvas.getObjects().indexOf(activeObject);
    const replacement = await FabricImage.fromURL(nextDataUrl);

    replacement.set({
      left: activeObject.left,
      top: activeObject.top,
      scaleX: activeObject.scaleX,
      scaleY: activeObject.scaleY,
      angle: activeObject.angle,
      flipX: activeObject.flipX,
      flipY: activeObject.flipY,
      opacity: activeObject.opacity,
      skewX: activeObject.skewX,
      skewY: activeObject.skewY,
      lockMovementX: activeObject.lockMovementX,
      lockMovementY: activeObject.lockMovementY,
      lockScalingX: activeObject.lockScalingX,
      lockScalingY: activeObject.lockScalingY,
      lockRotation: activeObject.lockRotation,
    });

    canvas.remove(activeObject);
    if (index >= 0) {
      canvas.insertAt(index, replacement);
    } else {
      canvas.add(replacement);
    }

    canvas.setActiveObject(replacement);
    replacement.setCoords();
    canvas.requestRenderAll();
    syncSelectedObject();
    requestDraftSave({ resume: true });
    return true;
  };

  const addImageToPrintableArea = async (nextDataUrl: string) => {
    const canvas = getCanvas();
    if (!canvas) return false;

    const nextImage = await FabricImage.fromURL(nextDataUrl);
    const { left: areaLeft, top: areaTop, width: areaWidth, height: areaHeight } = printableAreaRef.current;
    const baseWidth = nextImage.width || 1;
    const baseHeight = nextImage.height || 1;
    const containScale = Math.min(areaWidth / baseWidth, areaHeight / baseHeight);
    nextImage.scale(containScale);

    nextImage.set({
      left: areaLeft + (areaWidth - nextImage.getScaledWidth()) / 2,
      top: areaTop + (areaHeight - nextImage.getScaledHeight()) / 2,
    });

    canvas.add(nextImage);
    canvas.setActiveObject(nextImage);
    nextImage.setCoords();
    canvas.requestRenderAll();
    syncSelectedObject();
    requestDraftSave({ resume: true });
    return true;
  };

  const runAiRouteAction = async (route: string, actionName: string) => {
    const canvas = getCanvas();
    if (!canvas) return;

    let activeObject = canvas.getActiveObject();
    if (!isImageObject(activeObject)) {
      const firstImage = canvas.getObjects().find((obj) => getObjectType(obj) === "image");
      if (firstImage) {
        canvas.setActiveObject(firstImage);
        activeObject = firstImage;
      }
    }

    if (!isImageObject(activeObject)) {
      setAiStatus("Select an uploaded image before removing background.");
      return;
    }

    try {
      setActiveAiAction(actionName);
      setAiStatus(`${actionName}...`);
      const imageDataUrl = activeObject.toDataURL({ format: "png", multiplier: 1 });

      const response = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });

      const raw = await response.text();
      let result: AiActionResponse = {};
      if (raw) {
        try {
          result = JSON.parse(raw) as AiActionResponse;
        } catch (parseError) {
          console.error(`${actionName} response parse failed:`, parseError);
          setAiStatus(`${actionName} failed. The service returned an invalid response.`);
          return;
        }
      }

      logAiDebug(actionName, {
        apiRoute: route,
        apiRouteResponse: result,
        status: response.status,
      });

      if (!response.ok || result.ok === false) {
        const fallbackError = actionName === "Remove Background"
          ? "Background removal failed. Please try another image or upload a transparent PNG."
          : `${actionName} failed.`;
        setAiStatus(formatAiErrorMessage(result, fallbackError));
        return;
      }

      const updatedImageUrl = typeof result.imageDataUrl === "string"
        ? result.imageDataUrl
        : typeof result.dataUrl === "string"
          ? result.dataUrl
          : typeof result.imageUrl === "string"
            ? result.imageUrl
          : "";

      if (updatedImageUrl) {
        const replaced = await replaceActiveImage(updatedImageUrl);
        setAiStatus(replaced ? result.note || `${actionName} complete.` : `${actionName} complete.`);
        logAiDebug(actionName, { updatedImageUrl });
        return;
      }

      setAiStatus(result.note || `${actionName} finished.`);
    } catch (error) {
      console.error(`${actionName} failed:`, {
        errorType: error instanceof Error ? error.name : typeof error,
      });
      setAiStatus(
        actionName === "Remove Background"
          ? "Background removal failed. Please try another image or upload a transparent PNG."
          : `${actionName} failed.`
      );
    } finally {
      setActiveAiAction("");
    }
  };

  const generateLocalSuggestions = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const suggestions = [
      "Increase contrast for better print visibility",
      "Keep design inside printable area",
      "Add outline for dark garments",
      "Use larger text for readability",
      "Center design in print area",
    ];

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      const overflow = distanceFromPrintableArea(
        activeObject.getBoundingRect(),
        printableAreaRef.current
      );
      if (overflow > 0) {
        suggestions.unshift("Move artwork back inside printable area for best print result.");
      }
    }

    setAiSuggestions(suggestions);
    setAiStatus("Design suggestions ready.");
    logAiDebug("Suggest Design Improvements", { suggestions });
  };

  const generateDesignIdea = async () => {
    const prompt = designIdeaPrompt.trim();

    if (!prompt) {
      setAiStatus("Enter a prompt before generating artwork.");
      return;
    }

    try {
      setActiveAiAction("Generate Idea");
      setAiStatus("Generating design idea...");
      const response = await fetch("/api/ai/generate-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          context: {
            productMode: shouldShowTransferSizePreview ? "transfer" : "apparel",
            currentView,
            garmentTemplate: productData?.title || "",
            shirtColor: selectedColor || "",
            transferSize,
          },
        }),
      });

      const raw = await response.text();
      let result: AiActionResponse = {};
      if (raw) {
        try {
          result = JSON.parse(raw) as AiActionResponse;
        } catch (parseError) {
          console.error("AI design response parse failed:", parseError);
          setAiStatus("Image generation service is temporarily unavailable.");
          return;
        }
      }

      logAiDebug("Generate Idea", {
        apiRoute: "/api/ai/generate-idea",
        apiRouteResponse: result,
        status: response.status,
      });

      if (!response.ok || result.ok === false) {
        setAiStatus(
          formatAiErrorMessage(result, "AI design generation failed. Please try a different prompt.")
        );
        return;
      }

      const generatedImageUrl = typeof result.imageDataUrl === "string"
        ? result.imageDataUrl
        : typeof result.dataUrl === "string"
          ? result.dataUrl
          : typeof result.imageUrl === "string"
            ? result.imageUrl
          : "";

      if (generatedImageUrl) {
        const added = await addImageToPrintableArea(generatedImageUrl);
        logAiDebug("Generate Idea", { generatedImageUrl, addedToCanvas: added });
        setAiStatus(added ? "Design idea added to canvas." : result.note || "Design idea generated.");
      } else {
        setAiStatus(result.note || "Design idea generated.");
      }

      if (result.suggestions?.length) {
        setAiSuggestions(result.suggestions);
      }
    } catch (error) {
      console.error("AI design generation failed:", {
        errorType: error instanceof Error ? error.name : typeof error,
      });
      setAiStatus("AI design generation failed. Please try a different prompt.");
    } finally {
      setActiveAiAction("");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawVariant = params.get("variant") || params.get("variantId") || params.get("variant_id");
    const normalized = normalizeVariantId(rawVariant);
    const handleFromUrl = params.get("product") || params.get("handle") || "";
    const debugAiFlag = params.get("debugAI");

    setHasVariantInQuery(Boolean(normalized));
    setVariantId(normalized || FALLBACK_VARIANT_ID);
    setSelectedSize(params.get("size") || "Custom");
    setTransferSize(params.get("transferSize") || params.get("transfer_size") || "12x12");
    setProductHandle(handleFromUrl);
    setShouldDebugAiLog(debugAiFlag === "1" || debugAiFlag === "true");
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message?.type !== "dtf:shopify-context") return;
      const payload = message.payload || {};

      const nextVariantId = normalizeVariantId(payload.variantId);
      const nextProductHandle =
        typeof payload.productHandle === "string" ? payload.productHandle.trim() : "";

      if (nextVariantId && !hasVariantInQuery) {
        setVariantId(nextVariantId);
      }

      if (nextProductHandle) {
        setProductHandle(nextProductHandle);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [hasVariantInQuery]);

  useEffect(() => {
    if (!productHandle) {
      setProductData(null);
      setPrintLocations({});
      setRawPrintLocations("");
      setPrintLocationsError("");
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    const normalizedRequestedHandle = productHandle.trim();
    setPrintLocations({});
    setRawPrintLocations("");
    setPrintLocationsError("");

    const fetchProductByHandle = async () => {
      try {
        const apiPath = `/api/products/${encodeURIComponent(normalizedRequestedHandle)}`;
        const response = await fetch(apiPath, {
          signal: controller.signal,
          cache: "no-store",
        });
        const raw = await response.text();
        let result = {} as ProductByHandleApiResponse;

        if (raw) {
          try {
            result = JSON.parse(raw) as ProductByHandleApiResponse;
          } catch (parseError) {
            throw new Error(
              `Invalid product API response JSON (${response.status}): ${String(
                parseError
              )}`
            );
          }
        }

        if (!response.ok) {
          throw new Error(result.error || `Failed to load product (${response.status}).`);
        }

        if (!isMounted) return;

        setProductData(result);

        const metafieldValue = result.metafield?.value;
        const parsedLocations = parsePrintLocations(metafieldValue);

        logAiDebug("Product Fetch", {
          requestedHandle: normalizedRequestedHandle,
          returnedProductHandle: result.handle || "",
          returnedProductTitle: result.title || "",
          rawPrintLocations: metafieldValue || "",
          parsedPrintLocations: parsedLocations,
        });

        setPrintLocations(parsedLocations);
        setRawPrintLocations(typeof metafieldValue === "string" ? metafieldValue : "");
        if (!metafieldValue || !hasMetafieldLocationData(parsedLocations)) {
          setPrintLocationsError(
            "DTF print preview setup is missing. Configure product metafield dtf.print_locations to continue."
          );
        } else {
          setPrintLocationsError("");
        }

        const matchingVariant = result.variants?.find(
          (variant) => normalizeVariantId(variant.id) === variantId
        );
        const fallbackVariant = matchingVariant || result.variants?.[0];
        const normalizedFallbackVariantId = normalizeVariantId(fallbackVariant?.id);

        if (normalizedFallbackVariantId && normalizedFallbackVariantId !== variantId) {
          if (!hasVariantInQuery || !matchingVariant) {
            setVariantId(normalizedFallbackVariantId);
          }
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch product by handle:", error);
        if (isMounted) {
          setProductData(null);
          setPrintLocations({});
          setRawPrintLocations("");
          setPrintLocationsError(
            "Unable to load DTF print preview settings for this product. Please try again."
          );
        }
      }
    };

    fetchProductByHandle();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [hasVariantInQuery, productHandle]);

  const productVariants = useMemo(
    () => (Array.isArray(productData?.variants) ? productData.variants : []),
    [productData]
  );
  const selectedVariant = useMemo(
    () =>
      productVariants.find((variant) => normalizeVariantId(variant.id) === variantId) || null,
    [productVariants, variantId]
  );
  const availableColors = useMemo(
    () => getUniqueVariantOptionValues(productVariants, getVariantColor),
    [productVariants]
  );
  const availableSizes = useMemo(
    () => getUniqueVariantOptionValues(productVariants, getVariantSize),
    [productVariants]
  );
  const hasColorOptions = availableColors.length > 0;
  const hasSizeOptions = availableSizes.length > 0;
  const hasPlacementMetafields = hasMetafieldLocationData(printLocations);
  const customizerMode = resolveCustomizerMode({
    productHandle,
    productTitle: productData?.title || "",
    hasPlacementMetafields,
  });
  const shouldShowPlacementControls = customizerMode === "apparel" || hasPlacementMetafields;
  const shouldShowTransferSizePreview = customizerMode === "transfer";

  useEffect(() => {
    if (!selectedVariant) {
      if (!hasColorOptions && selectedColor) {
        setSelectedColor("");
      }
      return;
    }

    const variantColor = getVariantColor(selectedVariant);
    const variantSize = getVariantSize(selectedVariant);

    if (variantColor !== selectedColor) {
      setSelectedColor(variantColor);
    }

    if (hasSizeOptions && variantSize && variantSize !== selectedSize) {
      setSelectedSize(variantSize);
    }
  }, [hasColorOptions, hasSizeOptions, selectedColor, selectedSize, selectedVariant]);

  const handleColorChange = (nextColor: string) => {
    saveCurrentView();
    const normalizedColor = normalizeColorName(nextColor);
    setSelectedColor(normalizedColor);

    const matchedVariant =
      findMatchingVariant(productVariants, {
        color: normalizedColor,
        size: hasSizeOptions ? selectedSize : undefined,
      }) || findMatchingVariant(productVariants, { color: normalizedColor });

    const nextVariantId = normalizeVariantId(matchedVariant?.id);
    if (nextVariantId) {
      setVariantId(nextVariantId);
    }

    const matchedSize = getVariantSize(matchedVariant);
    if (matchedSize) {
      setSelectedSize(matchedSize);
    }

    requestDraftSave({ resume: true });
  };

  const handleSizeChange = (nextSize: string) => {
    saveCurrentView();
    setSelectedSize(nextSize);

    if (!hasSizeOptions) return;

    const matchedVariant =
      findMatchingVariant(productVariants, {
        color: hasColorOptions ? selectedColor : undefined,
        size: nextSize,
      }) || findMatchingVariant(productVariants, { size: nextSize });

    const nextVariantId = normalizeVariantId(matchedVariant?.id);
    if (nextVariantId) {
      setVariantId(nextVariantId);
    }

    const matchedColor = getVariantColor(matchedVariant);
    if (matchedColor) {
      setSelectedColor(matchedColor);
    }

    requestDraftSave({ resume: true });
  };

  const handleTransferSizeChange = (nextTransferSize: string) => {
    setTransferSize(nextTransferSize);
    requestDraftSave({ resume: true });
  };

  const handleQuantityChange = (nextQuantity: number) => {
    setQuantity(nextQuantity);
    requestDraftSave({ resume: true });
  };

  const locationInfo = getPrintLocationDataForView(printLocations, currentView, productHandle);
  const { activeLocation, activeLocationData } = locationInfo;
  const matchedSizeMockupKey = useMemo(() => {
    const normalizedSelectedSize = (selectedSize ?? "").trim();
    if (!normalizedSelectedSize) return "";
    const sizeMockups = activeLocationData?.sizeMockups;
    if (!sizeMockups || typeof sizeMockups !== "object") return "";
    const normalizedSelectedSizeLower = normalizedSelectedSize.toLowerCase();

    for (const size of Object.keys(sizeMockups)) {
      const normalizedKey = size.trim();
      if (!normalizedKey) continue;
      const normalizedKeyLower = normalizedKey.toLowerCase();
      if (normalizedKeyLower === normalizedSelectedSizeLower) {
        return size;
      }
    }

    return "";
  }, [activeLocationData?.sizeMockups, selectedSize]);
  const activeSizeMockupKeys = useMemo(
    () => Object.keys(activeLocationData?.sizeMockups || {}),
    [activeLocationData?.sizeMockups]
  );
  const sizeMockupConfig = useMemo(
    () => resolveSizeMockupConfig(activeLocationData, matchedSizeMockupKey),
    [activeLocationData, matchedSizeMockupKey]
  );
  const resolvedLocationData = useMemo(
    () => {
      const mergedLocationData = sizeMockupConfig
        ? { ...activeLocationData, ...sizeMockupConfig }
        : activeLocationData;
      const productOverride = getProductPrintLocationOverride(productHandle, activeLocation);

      return productOverride
        ? { ...mergedLocationData, ...productOverride }
        : mergedLocationData;
    },
    [activeLocation, activeLocationData, productHandle, sizeMockupConfig]
  );
  const selectedColorOption = selectedVariant?.selectedOptions?.find((option) => {
    const optionName = normalizeOptionLabel(String(option?.name || ""));
    return COLOR_OPTION_NAMES.includes(optionName);
  });
  const selectedColorFromVariant = normalizeColorName(String(selectedColorOption?.value || ""));
  const normalizedSelectedColor = normalizeColorName(
    selectedColorFromVariant || selectedColor || DEFAULT_COLOR
  );
  const sizeMockupUrl = (sizeMockupConfig?.mockupUrl || "").trim();
  const colorMockupUrl = sizeMockupUrl ? "" : resolveColorMockupUrl(resolvedLocationData, normalizedSelectedColor);
  const mockupUrl = sizeMockupUrl || colorMockupUrl || resolvedLocationData?.mockupUrl;
  const resolvedMockupUrl = resolveMockupUrl(mockupUrl, currentView, productHandle);
  const designArea = normalizeDesignArea(resolvedLocationData);
  const mockupFitRatio = previewScale < 1 ? MOCKUP_FIT_RATIO_SMALL_SCREEN : MOCKUP_FIT_RATIO;
  const mockupRender = getMockupRenderDimensions(
    mockupNaturalSize.width,
    mockupNaturalSize.height,
    mockupFitRatio
  );
  const resolvedPrintAreaBounds = getResolvedPrintAreaBounds(designArea, mockupRender);
  const maxPrintWidth = normalizePrintLimit(resolvedLocationData?.maxPrintWidth);
  const maxPrintHeight = normalizePrintLimit(resolvedLocationData?.maxPrintHeight);
  const availableViews = getAvailableViews(printLocations);
  const transferDimensions = parseTransferSize(transferSize);
  const variantSizeDimensions = parseSizeLabel(selectedSize || "");
  const isSmallLocation = isSmallPrintLocation(currentView);
  const safePrintAreaLabel = getSmallPrintAreaLabel(currentView);
  const activeSheetSize: SheetSize = (() => {
    if (maxPrintWidth && maxPrintHeight) {
      return { width: maxPrintWidth, height: maxPrintHeight, source: "product print area" };
    }

    if (shouldShowTransferSizePreview && transferDimensions) {
      return { width: transferDimensions.width, height: transferDimensions.height, source: "transfer size" };
    }

    if (variantSizeDimensions) {
      return { width: variantSizeDimensions.width, height: variantSizeDimensions.height, source: "selected variant" };
    }

    if (isSmallLocation) {
      const smallDimensions = parseTransferSize(getSafeTransferSizeForView(currentView));
      if (smallDimensions) {
        return { width: smallDimensions.width, height: smallDimensions.height, source: "location default" };
      }
    }

    return { width: 12, height: 12, source: "default sheet" };
  })();
  const hasSelectedDesign = selectedObjectType !== "none";
  const canvasPixelWidth = inchesToPrintPixels(activeSheetSize.width);
  const canvasPixelHeight = inchesToPrintPixels(activeSheetSize.height);
  const rulerInchTicksX = useMemo(() => {
    const max = Math.max(activeSheetSize.width, 0.1);
    const ticks = [];
    for (let value = 0; value <= max + 0.001; value += 0.5) {
      ticks.push({
        value,
        left: resolvedPrintAreaBounds.left + (value / max) * resolvedPrintAreaBounds.width,
        major: Math.abs(value - Math.round(value)) < 0.001,
      });
    }
    return ticks;
  }, [activeSheetSize.width, resolvedPrintAreaBounds.left, resolvedPrintAreaBounds.width]);
  const rulerInchTicksY = useMemo(() => {
    const max = Math.max(activeSheetSize.height, 0.1);
    const ticks = [];
    for (let value = 0; value <= max + 0.001; value += 0.5) {
      ticks.push({
        value,
        top: resolvedPrintAreaBounds.top + (value / max) * resolvedPrintAreaBounds.height,
        major: Math.abs(value - Math.round(value)) < 0.001,
      });
    }
    return ticks;
  }, [activeSheetSize.height, resolvedPrintAreaBounds.height, resolvedPrintAreaBounds.top]);

  const exceedsPrintWidth = Boolean(
    !isSmallLocation &&
    hasSelectedDesign &&
    maxPrintWidth &&
    transferDimensions &&
    transferDimensions.width > maxPrintWidth
  );

  const exceedsPrintHeight = Boolean(
    !isSmallLocation &&
    hasSelectedDesign &&
    maxPrintHeight &&
    transferDimensions &&
    transferDimensions.height > maxPrintHeight
  );

  const exceedsPrintLimits = exceedsPrintWidth || exceedsPrintHeight;

  useEffect(() => {
    if (!matchedSizeMockupKey || shouldShowTransferSizePreview) return;
    setTransferSize((currentTransferSize) =>
      currentTransferSize === matchedSizeMockupKey ? currentTransferSize : matchedSizeMockupKey
    );
  }, [matchedSizeMockupKey, setTransferSize, shouldShowTransferSizePreview]);
  const isAddToCartDisabled = isSubmitting || Boolean(printLocationsError);
  const addToCartDescriptionId = printLocationsError ? "print-locations-error" : undefined;

  useEffect(() => {
    if (!availableViews.length || availableViews.includes(currentView)) return;
    currentViewRef.current = availableViews[0];
    setCurrentView(availableViews[0]);
  }, [availableViews, currentView]);

  useEffect(() => {
    console.log("DTF selected variant:", selectedVariant);
    console.log("DTF selected variant ID:", variantId);
    console.log("DTF selected variant title:", String(selectedVariant?.title || ""));
    console.log("DTF selected size:", selectedSize);
    console.log("DTF matched size mockup key:", matchedSizeMockupKey);
    console.log("DTF active sizeMockups keys:", activeSizeMockupKeys);
    console.log("DTF final transfer size:", transferSize);
    console.log("DTF selected color:", normalizedSelectedColor);
    console.log("DTF active location data:", resolvedLocationData);
    console.log("DTF resolved color mockup URL:", resolvedMockupUrl);
  }, [
    activeSizeMockupKeys,
    matchedSizeMockupKey,
    normalizedSelectedColor,
    resolvedLocationData,
    resolvedMockupUrl,
    selectedSize,
    selectedVariant,
    transferSize,
    variantId,
  ]);

  useEffect(() => {
    if (!shouldDebugAiLogRef.current) return;
    console.log("[Customizer] Mockup resolution", {
      selectedVariantId: variantId,
      selectedColor: normalizedSelectedColor,
      activePrintLocation: activeLocation,
      resolvedMockupUrl,
    });
  }, [activeLocation, normalizedSelectedColor, resolvedMockupUrl, variantId]);

  useEffect(() => {
    if (!previewPaneRef.current || typeof ResizeObserver === "undefined") return;

    const updateScale = () => {
      if (isCanvasObjectInteractingRef.current) {
        pendingPreviewScaleUpdateRef.current = true;
        return;
      }

      const rect = previewPaneRef.current?.getBoundingClientRect();
      if (!rect) return;

      const widthScale = (rect.width - PREVIEW_PADDING) / CANVAS_DEFAULT_WIDTH;
      const heightScale = (rect.height - PREVIEW_PADDING) / CANVAS_DEFAULT_HEIGHT;
      const isMobileViewport = window.innerWidth <= 768;
      const minScale = isMobileViewport ? MIN_MOBILE_PREVIEW_SCALE : MIN_PREVIEW_SCALE;
      const nextScale = Math.min(Math.max(Math.min(widthScale, heightScale), minScale), 1);
      // Ignore tiny float-only changes so ResizeObserver doesn't trigger unnecessary re-renders.
      setPreviewScale((prev) =>
        Math.abs(prev - nextScale) < SCALE_CHANGE_THRESHOLD ? prev : nextScale
      );
    };

    updatePreviewScaleRef.current = updateScale;
    updateScale();
    const observer = new ResizeObserver(() => updateScale());
    observer.observe(previewPaneRef.current);
    window.addEventListener("resize", updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
      if (updatePreviewScaleRef.current === updateScale) {
        updatePreviewScaleRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setMockupNaturalSize({ width: 0, height: 0 });
    setMockupLoadFailed(false);
  }, [resolvedMockupUrl]);

  useEffect(() => {
    if (!shouldDebugAiLogRef.current) return;
    console.log("[Customizer Mockup Fit]", {
      activePrintLocation: activeLocation,
      mockupNaturalWidth: mockupRender.imgWidth,
      mockupNaturalHeight: mockupRender.imgHeight,
      renderedMockupWidth: Number(mockupRender.renderedWidth.toFixed(2)),
      renderedMockupHeight: Number(mockupRender.renderedHeight.toFixed(2)),
      resolvedDesignArea: resolvedPrintAreaBounds,
      canvasWidth: Number((CANVAS_DEFAULT_WIDTH * previewScale).toFixed(2)),
      canvasHeight: Number((CANVAS_DEFAULT_HEIGHT * previewScale).toFixed(2)),
    });
  }, [
    activeLocation,
    mockupRender.imgHeight,
    mockupRender.imgWidth,
    mockupRender.renderedHeight,
    mockupRender.renderedWidth,
    previewScale,
    resolvedPrintAreaBounds.height,
    resolvedPrintAreaBounds.left,
    resolvedPrintAreaBounds.top,
    resolvedPrintAreaBounds.width,
  ]);

  useEffect(() => {
    if (!shouldDebugAiLogRef.current) return;
    console.log("[AI DEBUG]", {
      aiActionRequested: "Mockup Resolution",
      requestedHandle: productHandle,
      activeView: currentView,
      activeLocation,
      rawPrintLocations,
      parsedPrintLocations: printLocations,
      metafieldMockupUrl: mockupUrl || "",
      resolvedMockupUrl,
    });
  }, [
    activeLocation,
    currentView,
    mockupUrl,
    printLocations,
    productHandle,
    rawPrintLocations,
    resolvedMockupUrl,
  ]);

  useEffect(() => {
    printableAreaRef.current = resolvedPrintAreaBounds;
    if (isCanvasObjectInteractingRef.current) return;
    updateSelectedDesignMetrics();
    syncCropControlsFromActiveImage();
  }, [resolvedPrintAreaBounds]);

  useEffect(() => {
    shouldDebugAiLogRef.current = shouldDebugAiLog;
  }, [shouldDebugAiLog]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    const body = document.body;
    const previousRoot = {
      height: root.style.height,
      maxHeight: root.style.maxHeight,
      overflow: root.style.overflow,
      overscrollBehavior: root.style.overscrollBehavior,
    };
    const previousBody = {
      height: body.style.height,
      maxHeight: body.style.maxHeight,
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
      position: body.style.position,
      inset: body.style.inset,
      width: body.style.width,
    };

    const restore = () => {
      root.style.height = previousRoot.height;
      root.style.maxHeight = previousRoot.maxHeight;
      root.style.overflow = previousRoot.overflow;
      root.style.overscrollBehavior = previousRoot.overscrollBehavior;
      body.style.height = previousBody.height;
      body.style.maxHeight = previousBody.maxHeight;
      body.style.overflow = previousBody.overflow;
      body.style.overscrollBehavior = previousBody.overscrollBehavior;
      body.style.position = previousBody.position;
      body.style.inset = previousBody.inset;
      body.style.width = previousBody.width;
    };

    const applyMobileScrollLock = () => {
      if (window.innerWidth > 768) {
        restore();
        return;
      }

      root.style.height = "100dvh";
      root.style.maxHeight = "100dvh";
      root.style.overflow = "hidden";
      root.style.overscrollBehavior = "none";
      body.style.height = "100dvh";
      body.style.maxHeight = "100dvh";
      body.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
      body.style.position = "fixed";
      body.style.inset = "0";
      body.style.width = "100%";
    };

    applyMobileScrollLock();
    window.addEventListener("resize", applyMobileScrollLock);
    window.addEventListener("orientationchange", applyMobileScrollLock);

    return () => {
      window.removeEventListener("resize", applyMobileScrollLock);
      window.removeEventListener("orientationchange", applyMobileScrollLock);
      restore();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      cancelDraftAutosave();
      if (historyTimerRef.current !== null) {
        window.clearTimeout(historyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    cancelDraftAutosave();
    suspendAutosaveRef.current = true;
  }, [draftStorageKey]);

  const snapObjectToPrintableCenter = (object: unknown) => {
    if (!object || typeof object !== "object") return false;
    const target = object as {
      left?: number;
      top?: number;
      getCenterPoint?: () => { x: number; y: number };
      getScaledWidth?: () => number;
      getScaledHeight?: () => number;
      set?: (patch: Partial<{ left: number; top: number }>) => void;
      setCoords?: () => void;
    };

    if (!target.getCenterPoint || !target.getScaledWidth || !target.getScaledHeight || !target.set) {
      return false;
    }

    const area = printableAreaRef.current;
    const center = target.getCenterPoint();
    const areaCenterX = area.left + area.width / 2;
    const areaCenterY = area.top + area.height / 2;
    const nextPosition: Partial<{ left: number; top: number }> = {};

    if (Math.abs(center.x - areaCenterX) <= SNAP_TO_CENTER_THRESHOLD) {
      nextPosition.left = areaCenterX - target.getScaledWidth() / 2;
    }

    if (Math.abs(center.y - areaCenterY) <= SNAP_TO_CENTER_THRESHOLD) {
      nextPosition.top = areaCenterY - target.getScaledHeight() / 2;
    }

    if (typeof nextPosition.left !== "number" && typeof nextPosition.top !== "number") {
      return false;
    }

    target.set(nextPosition);
    target.setCoords?.();
    return true;
  };

  const clampObjectToPrintableArea = (object: unknown) => {
    if (!object || typeof object !== "object") return false;

    const target = object as {
      left?: number;
      top?: number;
      getBoundingRect?: () => { left: number; top: number; width: number; height: number };
      set?: (patch: Partial<{ left: number; top: number }>) => void;
      setCoords?: () => void;
    };

    if (!target.getBoundingRect || !target.set) return false;

    target.setCoords?.();
    const rect = target.getBoundingRect();
    const bounds = printableAreaRef.current;
    const oversizedX = rect.width > bounds.width + CLAMP_EPSILON;
    const oversizedY = rect.height > bounds.height + CLAMP_EPSILON;
    const leftOverflow = bounds.left - rect.left;
    const rightOverflow = rect.left + rect.width - (bounds.left + bounds.width);
    const topOverflow = bounds.top - rect.top;
    const bottomOverflow = rect.top + rect.height - (bounds.top + bounds.height);
    let dx = 0;
    let dy = 0;

    if (!oversizedX) {
      if (leftOverflow > CLAMP_EPSILON && rightOverflow <= CLAMP_EPSILON) {
        dx = leftOverflow;
      } else if (rightOverflow > CLAMP_EPSILON && leftOverflow <= CLAMP_EPSILON) {
        dx = -rightOverflow;
      }
    }

    if (!oversizedY) {
      if (topOverflow > CLAMP_EPSILON && bottomOverflow <= CLAMP_EPSILON) {
        dy = topOverflow;
      } else if (bottomOverflow > CLAMP_EPSILON && topOverflow <= CLAMP_EPSILON) {
        dy = -bottomOverflow;
      }
    }

    if (Math.abs(dx) <= CLAMP_EPSILON && Math.abs(dy) <= CLAMP_EPSILON) {
      return false;
    }

    target.set({
      left: (target.left || 0) + dx,
      top: (target.top || 0) + dy,
    });
    target.setCoords?.();
    return true;
  };

  useEffect(() => {
    if (!isReady || !draftStorageKey) return;
    if (!fabricCanvasRef.current) return;
    if (restoredDraftKeyRef.current === draftStorageKey) return;

    let cancelled = false;

    const restoreDraft = async () => {
      restoredDraftKeyRef.current = draftStorageKey;
      lastSavedDraftRef.current = "";

      try {
        const rawDraft =
          window.localStorage.getItem(draftStorageKey) ||
          (legacyVariantDraftStorageKey !== draftStorageKey
            ? window.localStorage.getItem(legacyVariantDraftStorageKey)
            : null);
        if (!rawDraft) {
          suspendAutosaveRef.current = false;
          resetHistoryForCurrentCanvas();
          return;
        }

        const parsedDraft = JSON.parse(rawDraft) as Partial<DraftPayload>;
        const draftProductHandle =
          typeof parsedDraft.productHandle === "string" ? parsedDraft.productHandle.trim() : "";
        if (
          parsedDraft.version !== DRAFT_STORAGE_VERSION ||
          draftProductHandle !== normalizedProductHandle ||
          !isViewName(parsedDraft.currentView)
        ) {
          window.localStorage.removeItem(draftStorageKey);
          return;
        }

        const canvas = getCanvas();
        if (!canvas || cancelled) return;

        const restoredViews = normalizeDraftViews(parsedDraft.views);
        const restoredArtworkByView = createEmptyUploadedArtworkByView();
        const uploadedArtworkByView =
          parsedDraft.uploadedArtworkByView &&
          typeof parsedDraft.uploadedArtworkByView === "object"
            ? parsedDraft.uploadedArtworkByView
            : null;
        if (uploadedArtworkByView) {
          for (const view of VIEW_NAMES) {
            const candidate = uploadedArtworkByView[view];
            restoredArtworkByView[view] = typeof candidate === "string" ? candidate : "";
          }
        }
        const draftAvailableViews = availableViews.length ? availableViews : VIEW_NAMES;
        const restoredView = draftAvailableViews.includes(parsedDraft.currentView)
          ? parsedDraft.currentView
          : draftAvailableViews[0];
        const restoredActiveCanvas = filterCanvasSnapshotForView(
          restoredView === parsedDraft.currentView
            ? normalizeDraftSnapshot(parsedDraft.activeCanvas) || restoredViews[restoredView]
            : restoredViews[restoredView],
          restoredView
        );

        isRestoringDraftRef.current = true;
        setQuantity(normalizeDraftQuantity(parsedDraft.quantity));
        setSelectedColor(typeof parsedDraft.selectedColor === "string" ? parsedDraft.selectedColor : "");
        setSelectedSize(typeof parsedDraft.selectedSize === "string" ? parsedDraft.selectedSize : "Custom");
        setTransferSize(
          typeof parsedDraft.transferSize === "string" ? parsedDraft.transferSize : "12x12"
        );
        currentViewRef.current = restoredView;
        setCurrentView(restoredView);
        viewsRef.current = restoredViews;
        uploadedArtworkByViewRef.current = restoredArtworkByView;

        canvas.clear();
        canvas.backgroundColor = "transparent";
        canvas.discardActiveObject();

        if (restoredActiveCanvas?.objects?.length) {
          try {
            await ensureSnapshotFontsLoaded(restoredActiveCanvas);
            await canvas.loadFromJSON(restoredActiveCanvas);
          } catch (error) {
            console.error("Failed to load saved design draft canvas JSON:", error);
            window.localStorage.removeItem(draftStorageKey);
            return;
          }
        }

        if (cancelled) return;

        canvas.renderAll();
        syncSelectedObject();
        resetHistoryForCurrentCanvas();
        suspendAutosaveRef.current = false;
        setDraftStatus("Previous design restored");
        window.localStorage.setItem(draftStorageKey, rawDraft);
        lastSavedDraftRef.current = rawDraft;
      } catch (error) {
        console.error("Failed to restore saved design draft:", error);
        window.localStorage.removeItem(draftStorageKey);
      } finally {
        isRestoringDraftRef.current = false;
      }
    };

    void restoreDraft();

    return () => {
      cancelled = true;
    };
  }, [
    availableViews,
    draftStorageKey,
    isReady,
    normalizedProductHandle,
    normalizedVariantId,
  ]);

  useEffect(() => {
    if (!canvasElRef.current) return;

    const canvas = new Canvas(canvasElRef.current, {
      width: CANVAS_DEFAULT_WIDTH,
      height: CANVAS_DEFAULT_HEIGHT,
      backgroundColor: "transparent",
      allowTouchScrolling: true,
    });

    fabricCanvasRef.current = canvas;

    const setTransformRenderMode = (object: unknown, isTransforming: boolean) => {
      if (!object || typeof object !== "object") return;
      const target = object as {
        objectCaching?: boolean;
        noScaleCache?: boolean;
        dirty?: boolean;
      };

      target.objectCaching = !isTransforming;
      target.noScaleCache = isTransforming;
      target.dirty = true;
    };

    const handleSelection = () => {
      syncSelectedObject();
      if (shouldDebugAiLogRef.current) {
        const activeObject = canvas.getActiveObject();
        console.log("[AI DEBUG]", {
          selectedObjectType: getObjectType(activeObject) || "none",
        });
      }
    };

    const handleObjectTransformStart = (target?: unknown) => {
      setTransformRenderMode(target, true);
      if (isCanvasObjectInteractingRef.current) return;
      isCanvasObjectInteractingRef.current = true;
      cancelDraftAutosave();
    };
    let objectMovedDuringTransform = false;

    const finishObjectTransform = (target?: unknown) => {
      setTransformRenderMode(target, false);
      isCanvasObjectInteractingRef.current = false;
      if (pendingPreviewScaleUpdateRef.current) {
        pendingPreviewScaleUpdateRef.current = false;
        updatePreviewScaleRef.current?.();
      }
    };

    const handleObjectChange = (options?: { autosave?: boolean }) => {
      updateBoundaryWarning();
      updateSelectedDesignMetrics();
      syncCropControlsFromActiveImage();
      updateLayers();
      if (options?.autosave !== false) {
        requestDraftSaveRef.current({ resume: true });
      }
    };

    const handleObjectTransforming = (event: { target?: unknown }) => {
      handleObjectTransformStart(event.target);
      objectMovedDuringTransform = true;
    };

    const handleObjectMoving = (event: { target?: unknown }) => {
      handleObjectTransformStart(event.target);
      objectMovedDuringTransform = true;
    };

    const handleCanvasPointerUp = () => {
      finishObjectTransform();
    };

    const handleObjectModified = (event: { target?: unknown }) => {
      const target = event.target as { setCoords?: () => void } | undefined;
      finishObjectTransform(target);
      const clampedToPrintableArea = event.target
        ? clampObjectToPrintableArea(event.target)
        : false;
      const transformAction = (event as { transform?: { action?: string } }).transform?.action || "";
      const shouldSnapToCenter = !clampedToPrintableArea
        && !objectMovedDuringTransform
        && transformAction !== "drag"
        && transformAction !== "move";
      const snappedToCenter = shouldSnapToCenter && event.target
        ? snapObjectToPrintableCenter(event.target)
        : false;
      objectMovedDuringTransform = false;
      target?.setCoords?.();
      if (clampedToPrintableArea || snappedToCenter) {
        canvas.requestRenderAll();
      }
      handleObjectChange();
      scheduleHistorySnapshot();
    };

    const handleObjectAddedOrRemoved = () => {
      if (isSwitchingViewRef.current) return;
      updateLayers();
      updateSelectedDesignMetrics();
      syncCropControlsFromActiveImage();
      scheduleHistorySnapshot();
      requestDraftSaveRef.current();
    };

    const handleDraftTextChange = () => {
      if (isSwitchingViewRef.current) return;
      updateSelectedDesignMetrics();
      scheduleHistorySnapshot();
      requestDraftSaveRef.current({ resume: true });
    };

    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", handleSelection);
    canvas.on("object:added", handleObjectAddedOrRemoved);
    canvas.on("object:moving", handleObjectMoving);
    canvas.on("object:scaling", handleObjectTransforming);
    canvas.on("object:rotating", handleObjectTransforming);
    canvas.on("object:skewing", handleObjectTransforming);
    canvas.on("object:resizing", handleObjectTransforming);
    canvas.on("object:modified", handleObjectModified);
    canvas.on("mouse:up", handleCanvasPointerUp);
    canvas.on("object:removed", handleObjectAddedOrRemoved);
    canvas.on("text:changed", handleDraftTextChange);
    resetHistoryForCurrentCanvas();

    setIsReady(true);

    return () => {
      canvas.off("selection:created", handleSelection);
      canvas.off("selection:updated", handleSelection);
      canvas.off("selection:cleared", handleSelection);
      canvas.off("object:added", handleObjectAddedOrRemoved);
      canvas.off("object:moving", handleObjectMoving);
      canvas.off("object:scaling", handleObjectTransforming);
      canvas.off("object:rotating", handleObjectTransforming);
      canvas.off("object:skewing", handleObjectTransforming);
      canvas.off("object:resizing", handleObjectTransforming);
      canvas.off("object:modified", handleObjectModified);
      canvas.off("mouse:up", handleCanvasPointerUp);
      canvas.off("object:removed", handleObjectAddedOrRemoved);
      canvas.off("text:changed", handleDraftTextChange);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const canvas = getCanvas();

    if (!file || !canvas) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      const result = e.target?.result;

      if (!result || typeof result !== "string") return;

      try {
        const img = await FabricImage.fromURL(result);
        const { left: areaLeft, top: areaTop, width: areaWidth, height: areaHeight } = printableAreaRef.current;
        const baseWidth = img.width || 1;
        const baseHeight = img.height || 1;
        const containScale = Math.min(areaWidth / baseWidth, areaHeight / baseHeight);
        img.scale(containScale);

        if (Math.min(baseWidth, baseHeight) < LOW_RESOLUTION_UPLOAD_EDGE) {
          setImageQualityWarning(
            "Uploaded artwork is low resolution. Use a larger transparent PNG for sharper DTF output."
          );
        } else {
          setImageQualityWarning("");
        }

        img.set({
          left: areaLeft + (areaWidth - img.getScaledWidth()) / 2,
          top: areaTop + (areaHeight - img.getScaledHeight()) / 2,
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        captureViewSnapshot(canvas, currentViewRef.current);
        canvas.requestRenderAll();
        syncSelectedObject();
        requestDraftSave({ resume: true });
      } catch (error) {
        console.error("Image upload failed:", error);
      }
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const updateCropControl = (key: keyof CropControlsState, value: number) => {
    setCropControls((prev) => ({
      ...prev,
      [key]: Math.max(0, Number.isFinite(value) ? value : 0),
    }));
  };

  const applyCropToSelectedImage = () => {
    const canvas = getCanvas();
    const activeObject = canvas?.getActiveObject();
    if (!canvas || !isImageObject(activeObject)) {
      setAiStatus("Select an uploaded image before cropping.");
      return;
    }

    const { area, sheetWidth, sheetHeight } = getPrintableScale();
    const scaleX = Math.max(Math.abs(Number(activeObject.scaleX) || 1), 0.0001);
    const scaleY = Math.max(Math.abs(Number(activeObject.scaleY) || 1), 0.0001);
    const sourceSize = getImageElementSize(activeObject);

    const cropXSource = (cropControls.x / Math.max(sheetWidth, 0.1)) * area.width / scaleX;
    const cropYSource = (cropControls.y / Math.max(sheetHeight, 0.1)) * area.height / scaleY;
    const cropWidthSource = (cropControls.width / Math.max(sheetWidth, 0.1)) * area.width / scaleX;
    const cropHeightSource = (cropControls.height / Math.max(sheetHeight, 0.1)) * area.height / scaleY;

    const nextCropX = Math.max(0, Math.min(sourceSize.width - 1, cropXSource));
    const nextCropY = Math.max(0, Math.min(sourceSize.height - 1, cropYSource));
    const nextWidth = Math.max(1, Math.min(sourceSize.width - nextCropX, cropWidthSource));
    const nextHeight = Math.max(1, Math.min(sourceSize.height - nextCropY, cropHeightSource));

    activeObject.set({
      cropX: nextCropX,
      cropY: nextCropY,
      width: nextWidth,
      height: nextHeight,
    } as Partial<FabricImage>);

    activeObject.setCoords();
    canvas.requestRenderAll();
    syncSelectedObject();
    scheduleHistorySnapshot();
    requestDraftSave({ resume: true });
  };

  const resetCropOnSelectedImage = () => {
    const canvas = getCanvas();
    const activeObject = canvas?.getActiveObject();
    if (!canvas || !isImageObject(activeObject)) {
      setAiStatus("Select an uploaded image before resetting crop.");
      return;
    }

    const sourceSize = getImageElementSize(activeObject);
    activeObject.set({
      cropX: 0,
      cropY: 0,
      width: sourceSize.width,
      height: sourceSize.height,
    } as Partial<FabricImage>);

    activeObject.setCoords();
    canvas.requestRenderAll();
    syncSelectedObject();
    scheduleHistorySnapshot();
    requestDraftSave({ resume: true });
  };

  const addText = async () => {
    const canvas = getCanvas();
    if (!canvas) return;

    await ensureFontLoaded(textControls.fontFamily);

    const text = new Textbox("Your Design", {
      left: 100,
      top: 100,
      fill: textControls.textColor,
      stroke: textControls.outlineColor,
      strokeWidth: textControls.outlineWidth,
      fontSize: textControls.fontSize,
      fontFamily: textControls.fontFamily,
      lineHeight: textControls.lineHeight,
      textAlign: textControls.textAlign,
      opacity: textControls.opacity,
      width: 250,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
    syncSelectedObject();
    setImageQualityWarning("");
    requestDraftSave({ resume: true });
  };

  const withActiveObject = (
    callback: (obj: Parameters<Canvas["centerObject"]>[0]) => void
  ) => {
    const canvas = getCanvas();
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    callback(activeObject);
    activeObject.setCoords();
    canvas.requestRenderAll();
    syncSelectedObject();
    setImageQualityWarning("");
    scheduleHistorySnapshot();
    requestDraftSave({ resume: true });
  };

  const removeSelected = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    const selectedObjectType = getObjectType(activeObject);

    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.renderAll();

    if (selectedObjectType === "image") {
      const hasRemainingImageObjects = canvas
        .getObjects()
        .some((object) => getObjectType(object) === "image");

      if (!hasRemainingImageObjects) {
        uploadedArtworkByViewRef.current[currentViewRef.current] = "";
      }
    }

    syncSelectedObject();
    requestDraftSave({ resume: true });
  };

  const removeArtwork = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    const imageObjects = canvas.getObjects().filter((object) => getObjectType(object) === "image");
    const activeIsImage = activeObject && getObjectType(activeObject) === "image";

    if (activeIsImage && activeObject) {
      canvas.remove(activeObject);
    } else {
      imageObjects.forEach((imageObject) => canvas.remove(imageObject));
    }

    canvas.discardActiveObject();
    canvas.renderAll();

    const hasRemainingImageObjects = canvas
      .getObjects()
      .some((object) => getObjectType(object) === "image");

    if (!hasRemainingImageObjects) {
      uploadedArtworkByViewRef.current[currentViewRef.current] = "";
    }

    syncSelectedObject();
    requestDraftSave({ resume: true });
  };

  const duplicateSelected = async () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    const clone = await activeObject.clone();
    clone.set({ left: (activeObject.left || 0) + 20, top: (activeObject.top || 0) + 20 });
    canvas.add(clone);
    canvas.setActiveObject(clone);
    canvas.renderAll();
    syncSelectedObject();
    requestDraftSave({ resume: true });
  };

  const centerSelected = () => {
    withActiveObject((obj) => {
      const mutable = obj as {
        getScaledWidth?: () => number;
        getScaledHeight?: () => number;
        set?: (patch: Partial<{ left: number; top: number }>) => void;
      };
      if (!mutable.getScaledWidth || !mutable.getScaledHeight || !mutable.set) return;
      const area = printableAreaRef.current;
      mutable.set({
        left: area.left + (area.width - mutable.getScaledWidth()) / 2,
        top: area.top + (area.height - mutable.getScaledHeight()) / 2,
      });
    });
  };

  const toggleLockSelected = () => {
    withActiveObject((obj) => {
      if (!obj || typeof obj !== "object") return;
      const current = isLockedObject(obj);
      const target = !current;
      const mutable = obj as {
        lockMovementX?: boolean;
        lockMovementY?: boolean;
        lockScalingX?: boolean;
        lockScalingY?: boolean;
        lockRotation?: boolean;
        selectable?: boolean;
      };

      mutable.lockMovementX = target;
      mutable.lockMovementY = target;
      mutable.lockScalingX = target;
      mutable.lockScalingY = target;
      mutable.lockRotation = target;
      mutable.selectable = true;
    });
  };

  const flipHorizontal = () => {
    withActiveObject((obj) => {
      if (!obj || typeof obj !== "object") return;
      const mutable = obj as { flipX?: boolean };
      mutable.flipX = !Boolean(mutable.flipX);
    });
  };

  const flipVertical = () => {
    withActiveObject((obj) => {
      if (!obj || typeof obj !== "object") return;
      const mutable = obj as { flipY?: boolean };
      mutable.flipY = !Boolean(mutable.flipY);
    });
  };

  const rotateSelected = () => {
    withActiveObject((obj) => {
      if (!obj || typeof obj !== "object") return;
      const mutable = obj as { angle?: number };
      mutable.angle = (mutable.angle || 0) + 15;
    });
  };

  const bringForward = () => {
    const canvas = getCanvas();
    const activeObject = canvas?.getActiveObject();
    if (!canvas || !activeObject) return;
    canvas.bringObjectForward(activeObject);
    canvas.requestRenderAll();
    updateLayers();
    scheduleHistorySnapshot();
    requestDraftSave({ resume: true });
  };

  const sendBackward = () => {
    const canvas = getCanvas();
    const activeObject = canvas?.getActiveObject();
    if (!canvas || !activeObject) return;
    canvas.sendObjectBackwards(activeObject);
    canvas.requestRenderAll();
    updateLayers();
    scheduleHistorySnapshot();
    requestDraftSave({ resume: true });
  };

  const clearSavedDesign = () => {
    if (typeof window === "undefined") return;

    const shouldClear = window.confirm(
      "Clear your saved design draft? This removes the autosaved design from this device."
    );
    if (!shouldClear) return;

    cancelDraftAutosave();
    isClearingDraftRef.current = true;
    suspendAutosaveRef.current = true;

    try {
      if (draftStorageKey) {
        window.localStorage.removeItem(draftStorageKey);
      }
    } catch (error) {
      console.error("Failed to clear saved design draft:", error);
    }

    lastSavedDraftRef.current = "";
    viewsRef.current = createEmptyViews();
    uploadedArtworkByViewRef.current = createEmptyUploadedArtworkByView();

    const canvas = getCanvas();
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = "transparent";
      canvas.discardActiveObject();
      canvas.renderAll();
    }

    syncSelectedObject();
    resetHistoryForCurrentCanvas();
    setDraftStatus("Saved design cleared");
    isClearingDraftRef.current = false;
  };

  const exportCurrentViewBlob = async () => {
    const canvas = getCanvas();
    if (!canvas) return null;

    saveCurrentView();
    const renderedCanvas = canvas.lowerCanvasEl;
    if (!renderedCanvas) return null;

    return new Promise<Blob | null>((resolve) => {
      renderedCanvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const uploadPreviewImage = async () => {
    const activeView = currentViewRef.current;
    const blob = await exportCurrentViewBlob();
    if (!blob) throw new Error("Preview image could not be generated.");

    const formData = new FormData();
    formData.append("file", blob, `dtf-${activeView}.png`);

    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const result = (await response.json()) as UploadResponse;

    if (!response.ok || !result.url) {
      throw new Error(result.error || "Artwork upload failed.");
    }

    uploadedArtworkByViewRef.current[activeView] = result.url;
    requestDraftSave({ resume: true });
    return result.url;
  };

  const handleAddToCart = async () => {
    if (printLocationsError) {
      setCartStatus(printLocationsError);
      return;
    }

    if (boundaryWarning) {
      setCartStatus("Selected design exceeds this location's print size limit.");
      return;
    }

    const numericId = parseInt(variantId, 10);
    if (isNaN(numericId)) {
      console.error("Invalid variant ID:", variantId);
      return;
    }

    try {
      setIsSubmitting(true);
      setCartStatus("Uploading artwork...");

      const activeView = currentViewRef.current;
      const existingArtworkUrl = uploadedArtworkByViewRef.current[activeView];
      const uploadedArtworkUrl = isCloudinaryUrl(existingArtworkUrl)
        ? existingArtworkUrl
        : await uploadPreviewImage();

      if (!isCloudinaryUrl(uploadedArtworkUrl)) {
        alert("Artwork upload is not complete. Please wait and try again.");
        setCartStatus("");
        return;
      }

      const lineItemProperties: Record<string, string> = {
        "Design ID": createDesignId(),
        Size: selectedSize || "Custom",
        Placement: VIEW_LABELS[activeView],
        "Print Location": activeLocation,
        "Artwork URL": uploadedArtworkUrl,
        "Preview URL": uploadedArtworkUrl,
        "Mockup URL": resolvedMockupUrl || "",
        "Max Print Width (in)": maxPrintWidth ? String(maxPrintWidth) : "",
        "Max Print Height (in)": maxPrintHeight ? String(maxPrintHeight) : "",
        "Boundary Warning": boundaryWarning || "None",
      };

      if (shouldShowTransferSizePreview) {
        const normalizedTransferSize = TRANSFER_SIZE_PRESETS.includes(transferSize)
          ? transferSize
          : "Custom";
        lineItemProperties["Transfer Size"] = normalizedTransferSize;
      }

      const payload = {
        id: numericId,
        quantity: Number(quantity || 1),
        properties: lineItemProperties,
      };

      window.parent.postMessage({ type: "DTF_ADD_TO_CART", data: payload }, SHOPIFY_PARENT_ORIGIN);
      setCartStatus("Custom design sent to Shopify cart.");
    } catch (error) {
      console.error("Add to cart failed:", error);
      setCartStatus("Artwork upload failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadDesign = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const dataURL = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `DTF-Print-${currentView}.png`;
    link.click();
  };

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-[#0e0e0e] text-white">
      <style jsx global>{`
        .canvas-container,
        .upper-canvas,
        .lower-canvas {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          max-width: 100% !important;
          max-height: 100% !important;
        }

        .canvas-container {
          z-index: 10 !important;
        }

        .customizer-mobile-shell-wrap {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .customizer-mobile-shell {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          width: 100%;
          min-width: 0;
          height: 100%;
          transform: none;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          html,
          body {
            height: 100dvh;
            max-height: 100dvh;
            overflow: hidden;
            overscroll-behavior: none;
          }

          body {
            position: fixed;
            inset: 0;
            width: 100%;
          }

          .customizer-mobile-shell-wrap {
            display: flex;
            height: 100%;
            width: 100%;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .customizer-mobile-shell {
            display: grid;
            grid-template-columns: clamp(150px, 38vw, 260px) minmax(0, 1fr);
            width: 100%;
            min-width: 0;
            height: 100dvh;
            max-height: 100dvh;
            overflow: hidden;
          }

          .customizer-mobile-shell > aside {
            height: 100dvh;
            min-width: 0;
            overflow-x: hidden;
            overflow-y: auto;
            border-right: 1px solid #222;
            border-top: 0;
          }

          .customizer-mobile-shell > main {
            height: 100dvh;
            min-width: 0;
            overflow: hidden;
          }

          .canvas-container,
          .upper-canvas,
          .lower-canvas {
            transform-origin: top left !important;
          }
        }
      `}</style>
      <div className="customizer-mobile-shell-wrap">
        <div className="customizer-mobile-shell flex h-full min-w-0 overflow-hidden md:grid md:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="order-1 h-full min-w-0 overflow-y-auto border-r border-[#222] bg-[#111] p-3 pb-12 md:p-5">
          <div>
            <h1 className="text-xl font-bold">DTF Designer Pro</h1>
            <p className="mt-1 text-sm text-gray-400">
              Upload artwork, customize DTF transfers and gang sheets, place designs on custom
              t-shirts and hoodies, then send your order details to Shopify checkout.
            </p>
          </div>

          {shouldShowPlacementControls ? (
            <div className="mt-2 md:mt-5">
              <PrintLocationControls
                availableViews={availableViews}
                currentView={currentView}
                isReady={isReady}
                loadView={loadView}
                printLocationsError={printLocationsError}
              />
            </div>
          ) : (
            <div className="mt-2 rounded border border-[#2b2b2b] bg-[#171717] px-3 py-2 text-xs text-gray-300 md:mt-5">
              DTF Transfer / Gang Sheet mode
            </div>
          )}

          {draftStatus ? (
            <div
              role="status"
              aria-live="polite"
              className="mt-3 rounded border border-[#2b2b2b] bg-[#1a1a1a] px-3 py-2 text-xs text-gray-300"
            >
              {draftStatus}
            </div>
          ) : null}

        <div className="md:mt-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">Upload Artwork</h2>
          <input id="artwork-upload-input" name="artworkUpload" ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="block w-full cursor-pointer rounded bg-[#1f1f1f] p-2 text-sm text-white hover:bg-[#333]">Upload Artwork</button>
          {imageQualityWarning ? <p className="mt-2 text-xs text-yellow-300">{imageQualityWarning}</p> : null}
        </div>

        <div className="mt-3 rounded border border-[#2b2b2b] bg-[#171717] p-3">
          {draftStatus ? (
            <p aria-live="polite" className="text-xs text-gray-300">
              {draftStatus}
            </p>
          ) : (
            <p className="text-xs text-gray-300">
              Your design is saved automatically while you work.
            </p>
          )}
          <button type="button" onClick={clearSavedDesign} aria-describedby="clear-saved-design-help" className="mt-3 w-full rounded bg-[#1f1f1f] px-3 py-2 text-left text-sm text-white hover:bg-[#333]">
            Clear Saved Design
          </button>
          <p id="clear-saved-design-help" className="sr-only">
            Removes the autosaved design draft from this device after confirmation.
          </p>
        </div>

        <div className="mt-5 rounded border border-[#2b2b2b] bg-[#171717] p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-300">Canvas & Design Info</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-[#2b2b2b] bg-[#111] px-3 py-2">
              <p className="text-gray-500">Canvas / Sheet</p>
              <p className="mt-1 font-semibold text-white">{formatInches(activeSheetSize.width)}&quot; × {formatInches(activeSheetSize.height)}&quot;</p>
              <p className="mt-1 text-[11px] text-gray-500">{activeSheetSize.source}</p>
            </div>
            <div className="rounded border border-[#2b2b2b] bg-[#111] px-3 py-2">
              <p className="text-gray-500">300 DPI Pixels</p>
              <p className="mt-1 font-semibold text-white">{formatPixels(canvasPixelWidth)} × {formatPixels(canvasPixelHeight)}</p>
              <p className="mt-1 text-[11px] text-gray-500">print-ready estimate</p>
            </div>
            <div className="rounded border border-[#2b2b2b] bg-[#111] px-3 py-2">
              <p className="text-gray-500">Selected Design</p>
              <p className="mt-1 font-semibold text-white">
                {selectedDesignMetrics
                  ? `${formatInches(selectedDesignMetrics.widthIn)}" × ${formatInches(selectedDesignMetrics.heightIn)}"`
                  : "No selection"}
              </p>
              {selectedDesignMetrics ? (
                <p className="mt-1 text-[11px] text-gray-500">
                  {formatPixels(selectedDesignMetrics.widthPx)} × {formatPixels(selectedDesignMetrics.heightPx)} px
                </p>
              ) : null}
            </div>
            <div className="rounded border border-[#2b2b2b] bg-[#111] px-3 py-2">
              <p className="text-gray-500">View / Location</p>
              <p className="mt-1 font-semibold text-white">{VIEW_LABELS[currentView]}</p>
              <p className="mt-1 text-[11px] text-gray-500">{activeLocation}</p>
            </div>
          </div>
          {selectedDesignMetrics?.exceedsBounds ? (
            <p className="mt-3 rounded border border-yellow-700 bg-yellow-950 px-3 py-2 text-xs text-yellow-200">
              Selected design exceeds the printable safe area.
            </p>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <button type="button" onClick={undoCanvasChange} disabled={!canUndo} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50">Undo</button>
          <button type="button" onClick={redoCanvasChange} disabled={!canRedo} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50">Redo</button>
          <button type="button" onClick={addText} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Add Text</button>
          <button type="button" onClick={duplicateSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Duplicate</button>
          <button type="button" onClick={centerSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Center</button>
          <button type="button" onClick={toggleLockSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">{selectedLocked ? "Unlock" : "Lock"}</button>
          <button type="button" onClick={flipHorizontal} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Flip H</button>
          <button type="button" onClick={flipVertical} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Flip V</button>
          <button type="button" onClick={removeSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Delete Selected</button>
          <button type="button" onClick={rotateSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Rotate</button>
          <button type="button" onClick={bringForward} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Bring Forward</button>
          <button type="button" onClick={sendBackward} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Send Backward</button>
          <button type="button" onClick={removeArtwork} className="rounded bg-[#2a1111] px-3 py-2 text-left hover:bg-[#3b1616] sm:col-span-2">Remove Artwork</button>
        </div>

        <div className="mt-5 rounded border border-[#2b2b2b] bg-[#171717] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Layers</h2>
            <span className="text-xs text-gray-500">{layers.length} objects</span>
          </div>
          {layers.length ? (
            <div className="space-y-2">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className={`rounded border px-2 py-2 text-xs ${
                    layer.active
                      ? "border-white bg-[#242424]"
                      : "border-[#2b2b2b] bg-[#111]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectLayer(layer.index)}
                    className="block w-full truncate text-left font-medium text-white"
                    title={layer.label}
                  >
                    {layer.visible ? "" : "Hidden: "}{layer.label}
                  </button>
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    <button type="button" onClick={() => renameLayer(layer.index)} className="rounded bg-[#1f1f1f] px-2 py-1 hover:bg-[#333]">Name</button>
                    <button type="button" onClick={() => toggleLayerVisibility(layer.index)} className="rounded bg-[#1f1f1f] px-2 py-1 hover:bg-[#333]">{layer.visible ? "Hide" : "Show"}</button>
                    <button type="button" onClick={() => toggleLayerLock(layer.index)} className="rounded bg-[#1f1f1f] px-2 py-1 hover:bg-[#333]">{layer.locked ? "Unlock" : "Lock"}</button>
                    <button type="button" onClick={() => duplicateLayer(layer.index)} className="rounded bg-[#1f1f1f] px-2 py-1 hover:bg-[#333]">Copy</button>
                    <button type="button" onClick={() => bringLayerForward(layer.index)} className="rounded bg-[#1f1f1f] px-2 py-1 hover:bg-[#333]">Up</button>
                    <button type="button" onClick={() => sendLayerBackward(layer.index)} className="rounded bg-[#1f1f1f] px-2 py-1 hover:bg-[#333]">Down</button>
                    <button type="button" onClick={() => deleteLayer(layer.index)} className="col-span-2 rounded bg-[#2a1111] px-2 py-1 hover:bg-[#3b1616]">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Add text or artwork to build layers.</p>
          )}
        </div>

        <div className="mt-5 rounded border border-[#2b2b2b] bg-[#171717] p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-300">Crop / Trim</h2>
          <p className="mb-3 text-xs text-gray-400">
            {selectedObjectType === "image"
              ? "Trim the selected artwork using inch-based crop bounds."
              : "Select uploaded artwork to crop or reset trim."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label htmlFor="crop-width-input" className="text-xs text-gray-300">
              W (in)
              <input id="crop-width-input" name="cropWidth" type="number" min={0} step={0.05} value={Number(cropControls.width.toFixed(2))} onChange={(e) => updateCropControl("width", Number(e.target.value))} disabled={selectedObjectType !== "image"} className="mt-1 w-full rounded bg-[#1f1f1f] px-2 py-2 text-sm text-white disabled:opacity-50" />
            </label>
            <label htmlFor="crop-height-input" className="text-xs text-gray-300">
              H (in)
              <input id="crop-height-input" name="cropHeight" type="number" min={0} step={0.05} value={Number(cropControls.height.toFixed(2))} onChange={(e) => updateCropControl("height", Number(e.target.value))} disabled={selectedObjectType !== "image"} className="mt-1 w-full rounded bg-[#1f1f1f] px-2 py-2 text-sm text-white disabled:opacity-50" />
            </label>
            <label htmlFor="crop-x-input" className="text-xs text-gray-300">
              X (in)
              <input id="crop-x-input" name="cropX" type="number" min={0} step={0.05} value={Number(cropControls.x.toFixed(2))} onChange={(e) => updateCropControl("x", Number(e.target.value))} disabled={selectedObjectType !== "image"} className="mt-1 w-full rounded bg-[#1f1f1f] px-2 py-2 text-sm text-white disabled:opacity-50" />
            </label>
            <label htmlFor="crop-y-input" className="text-xs text-gray-300">
              Y (in)
              <input id="crop-y-input" name="cropY" type="number" min={0} step={0.05} value={Number(cropControls.y.toFixed(2))} onChange={(e) => updateCropControl("y", Number(e.target.value))} disabled={selectedObjectType !== "image"} className="mt-1 w-full rounded bg-[#1f1f1f] px-2 py-2 text-sm text-white disabled:opacity-50" />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <button type="button" onClick={applyCropToSelectedImage} disabled={selectedObjectType !== "image"} className="rounded bg-white px-3 py-2 font-semibold text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-500">Apply Crop</button>
            <button type="button" onClick={resetCropOnSelectedImage} disabled={selectedObjectType !== "image"} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50">Reset Crop</button>
          </div>
        </div>

        <div className="mt-5 rounded border border-[#2b2b2b] bg-[#171717] p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">Text & Font Customization</h2>
          <p className="mb-3 text-xs text-gray-400">Selected object: {selectedObjectType}</p>

          <label htmlFor="font-family-select" className="mb-1 block text-xs text-gray-300">Font</label>
          <select id="font-family-select" name="fontFamily" value={textControls.fontFamily} onChange={(e) => updateTextControls({ fontFamily: e.target.value })} className="mb-2 w-full rounded bg-[#1f1f1f] px-2 py-2 text-sm">
            {FONT_OPTIONS.map((font) => (
              <option key={font.label} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>

          <label htmlFor="font-size-range" className="mb-1 block text-xs text-gray-300">Font Size</label>
          <div className="mb-2 flex gap-2">
            <input id="font-size-range" name="fontSizeRange" type="range" min={10} max={220} value={textControls.fontSize} onChange={(e) => updateTextControls({ fontSize: Number(e.target.value) })} className="w-full" aria-label="Font Size Slider" />
            <label htmlFor="font-size-input" className="sr-only">Font Size Value</label>
            <input id="font-size-input" name="fontSize" type="number" min={10} max={220} value={textControls.fontSize} onChange={(e) => updateTextControls({ fontSize: Number(e.target.value) || 32 })} className="w-20 rounded bg-[#1f1f1f] px-2 py-1 text-sm" aria-label="Font Size" />
          </div>

          <div className="mb-2 grid grid-cols-2 gap-2">
            <label htmlFor="text-color-input" className="text-xs text-gray-300">Text Color
              <input id="text-color-input" name="textColor" type="color" value={textControls.textColor} onChange={(e) => updateTextControls({ textColor: e.target.value })} className="mt-1 h-9 w-full rounded bg-[#1f1f1f]" />
            </label>
            <label htmlFor="outline-color-input" className="text-xs text-gray-300">Outline Color
              <input id="outline-color-input" name="outlineColor" type="color" value={textControls.outlineColor} onChange={(e) => updateTextControls({ outlineColor: e.target.value })} className="mt-1 h-9 w-full rounded bg-[#1f1f1f]" />
            </label>
          </div>

          <label htmlFor="outline-width-range" className="mb-1 block text-xs text-gray-300">Outline Width</label>
          <input id="outline-width-range" name="outlineWidth" type="range" min={0} max={20} value={textControls.outlineWidth} onChange={(e) => updateTextControls({ outlineWidth: Number(e.target.value) })} className="mb-2 w-full" />

          <label htmlFor="letter-spacing-range" className="mb-1 block text-xs text-gray-300">Letter Spacing</label>
          <input id="letter-spacing-range" name="letterSpacing" type="range" min={-200} max={800} step={10} value={textControls.letterSpacing} onChange={(e) => updateTextControls({ letterSpacing: Number(e.target.value) })} className="mb-3 w-full" />

          <label htmlFor="line-height-range" className="mb-1 block text-xs text-gray-300">Line Height</label>
          <input id="line-height-range" name="lineHeight" type="range" min={0.8} max={2.2} step={0.02} value={textControls.lineHeight} onChange={(e) => updateTextControls({ lineHeight: Number(e.target.value) || 1.16 })} className="mb-3 w-full" />

          <label htmlFor="text-opacity-range" className="mb-1 block text-xs text-gray-300">Opacity</label>
          <input id="text-opacity-range" name="textOpacity" type="range" min={0.1} max={1} step={0.05} value={textControls.opacity} onChange={(e) => updateTextControls({ opacity: Number(e.target.value) || 1 })} className="mb-3 w-full" />

          <div className="mb-2 grid grid-cols-3 gap-2 text-xs">
            <button type="button" onClick={() => updateTextControls({ textAlign: "left" })} className={`rounded px-2 py-2 ${textControls.textAlign === "left" ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Left</button>
            <button type="button" onClick={() => updateTextControls({ textAlign: "center" })} className={`rounded px-2 py-2 ${textControls.textAlign === "center" ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Center</button>
            <button type="button" onClick={() => updateTextControls({ textAlign: "right" })} className={`rounded px-2 py-2 ${textControls.textAlign === "right" ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Right</button>
          </div>

          <div className="mb-2 grid grid-cols-3 gap-2 text-xs">
            <button type="button" onClick={() => updateTextControls({ bold: !textControls.bold })} className={`rounded px-2 py-2 ${textControls.bold ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Bold</button>
            <button type="button" onClick={() => updateTextControls({ italic: !textControls.italic })} className={`rounded px-2 py-2 ${textControls.italic ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Italic</button>
            <button type="button" onClick={() => updateTextControls({ uppercase: !textControls.uppercase })} className={`rounded px-2 py-2 ${textControls.uppercase ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Uppercase</button>
          </div>

          <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
            <button type="button" onClick={() => updateTextControls({ shadow: !textControls.shadow, glow: textControls.shadow ? textControls.glow : false })} className={`rounded px-2 py-2 ${textControls.shadow ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Shadow</button>
            <button type="button" onClick={() => updateTextControls({ glow: !textControls.glow, shadow: textControls.glow ? textControls.shadow : false })} className={`rounded px-2 py-2 ${textControls.glow ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Glow</button>
          </div>

          <div className="mb-2 grid grid-cols-3 gap-2 text-xs">
            <button type="button" onClick={() => updateTextControls({ curveMode: "arcUp" })} className={`rounded px-2 py-2 ${textControls.curveMode === "arcUp" ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Arc Up</button>
            <button type="button" onClick={() => updateTextControls({ curveMode: "arcDown" })} className={`rounded px-2 py-2 ${textControls.curveMode === "arcDown" ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Arc Down</button>
            <button type="button" onClick={() => updateTextControls({ curveMode: "wave" })} className={`rounded px-2 py-2 ${textControls.curveMode === "wave" ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Wave</button>
          </div>

          <label htmlFor="bend-curve-range" className="mb-1 block text-xs text-gray-300">Bend / Curve</label>
          <div className="mb-1 flex gap-2">
            <input id="bend-curve-range" name="bendCurveRange" type="range" min={5} max={200} value={textControls.bendCurve} onChange={(e) => updateTextControls({ bendCurve: Number(e.target.value) })} className="w-full" aria-label="Bend Curve Slider" />
            <label htmlFor="bend-curve-input" className="sr-only">Bend Curve Value</label>
            <input id="bend-curve-input" name="bendCurve" type="number" min={5} max={200} value={textControls.bendCurve} onChange={(e) => updateTextControls({ bendCurve: Number(e.target.value) || 25 })} className="w-20 rounded bg-[#1f1f1f] px-2 py-1 text-sm" aria-label="Bend Curve" />
          </div>
        </div>

        <div className="mt-5 rounded border border-[#2b2b2b] bg-[#171717] p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">AI Design Tools</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => runAiRouteAction("/api/ai/remove-background", "Remove Background")}
              disabled={Boolean(activeAiAction)}
              className="rounded bg-[#1f1f1f] px-2 py-2 text-left hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60"
              title="Remove any background from selected artwork"
            >
              {activeAiAction === "Remove Background" ? "Removing..." : "Remove Background"}
            </button>
          </div>

          <div className="mt-3 rounded border border-[#2b2b2b] bg-[#111] p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">Design Idea</h3>
            <label htmlFor="design-idea-input" className="sr-only">Design idea prompt</label>
            <input id="design-idea-input" name="designIdeaPrompt" type="text" value={designIdeaPrompt} onChange={(e) => setDesignIdeaPrompt(e.target.value)} placeholder="Describe your design style and key elements" className="mb-2 w-full rounded bg-[#1f1f1f] px-2 py-2 text-sm" />
            <button
              type="button"
              onClick={generateDesignIdea}
              disabled={Boolean(activeAiAction)}
              className="w-full rounded bg-[#1f1f1f] px-2 py-2 text-left text-xs hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-60"
              title="AI Generate Design Idea"
            >
              {activeAiAction === "Generate Idea" ? "Generating..." : "Generate Idea"}
            </button>
          </div>

          {aiStatus ? <p className="mt-3 text-xs text-gray-300">{aiStatus}</p> : null}
          {aiSuggestions.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-300">
              {aiSuggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
            </ul>
          ) : null}
        </div>

        {shouldShowTransferSizePreview ? (
          <div className="mt-5 rounded border border-[#2b2b2b] bg-[#171717] p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">Transfer Size Preview</h2>

            {isSmallLocation ? (
              <div className="rounded bg-[#1f1f1f] px-3 py-3">
                <p className="text-xs text-gray-400">
                  Live print area: <span className="font-semibold text-white">{safePrintAreaLabel}</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  This location is optimized for small logos, sleeve prints, and neck tag designs.
                </p>
              </div>
            ) : (
              <>
                <label htmlFor="transfer-size-select" className="sr-only">Transfer size</label>
                <select
                  id="transfer-size-select"
                  name="transferSize"
                  value={transferSize}
                  onChange={(e) => handleTransferSizeChange(e.target.value)}
                  className="mb-3 w-full rounded bg-[#1f1f1f] px-2 py-2 text-sm"
                >
                  {TRANSFER_SIZE_PRESETS.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
                <p className="text-xs text-gray-400">
                  Live transfer size: <span className="font-semibold text-white">{transferSize}</span>
                </p>
              </>
            )}

            {(maxPrintWidth || maxPrintHeight) ? (
              <p className="mt-2 text-xs text-gray-400">
                Max print size: <span className="font-semibold text-white">{maxPrintWidth ?? "—"} in × {maxPrintHeight ?? "—"} in</span>
              </p>
            ) : null}

            {exceedsPrintLimits ? (
              <p id="print-limit-warning" role="alert" aria-live="polite" className="mt-2 text-xs text-yellow-300">
                ⚠ Selected design exceeds this location&apos;s print size limit.
              </p>
            ) : null}

            {boundaryWarning ? <p className="mt-2 text-xs text-yellow-300">⚠ {boundaryWarning}</p> : null}
            {imageQualityWarning ? <p className="mt-2 text-xs text-yellow-300">{imageQualityWarning}</p> : null}
          </div>
        ) : null}

        <div className="mt-5">
          <button type="button" onClick={downloadDesign} className="w-full rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]">Download Print File</button>
        </div>

        <div className="mt-5 block rounded border border-[#2b2b2b] bg-[#171717] p-4 pb-8 opacity-100">
          <p className="mb-2 rounded bg-cyan-400 px-3 py-2 text-xs font-bold uppercase tracking-wide text-black">
            Checkout Panel
          </p>
          <h2 className="mb-2 text-lg font-semibold">Checkout</h2>
          {hasColorOptions ? (
            <>
              <label htmlFor="checkout-color-select" className="mb-2 block text-sm text-gray-300">Color</label>
              <select
                id="checkout-color-select"
                name="color"
                value={selectedColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="mb-3 w-full rounded bg-[#1f1f1f] px-3 py-2 text-white"
              >
                {availableColors.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          <label htmlFor="checkout-size-input" className="mb-2 block text-sm text-gray-300">Size</label>
          {hasSizeOptions ? (
            <select
              id="checkout-size-input"
              name="size"
              value={selectedSize}
              onChange={(e) => handleSizeChange(e.target.value)}
              className="mb-3 w-full rounded bg-[#1f1f1f] px-3 py-2 text-white"
            >
              {availableSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          ) : (
            <input id="checkout-size-input" name="size" type="text" value={selectedSize} onChange={(e) => handleSizeChange(e.target.value)} className="mb-3 w-full rounded bg-[#1f1f1f] px-3 py-2 text-white" />
          )}

          <label htmlFor="checkout-quantity-input" className="mb-2 block text-sm text-gray-300">Quantity</label>
          <input id="checkout-quantity-input" name="quantity" type="number" min="1" value={quantity} onChange={(e) => handleQuantityChange(Number(e.target.value))} className="mb-3 w-full rounded bg-[#1f1f1f] px-3 py-2 text-white" />

          <button type="button" onClick={handleAddToCart} disabled={isAddToCartDisabled} aria-describedby={addToCartDescriptionId} className="w-full rounded bg-white px-4 py-3 font-semibold text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-500">{isSubmitting ? "Uploading..." : "Add Custom Design to Cart"}</button>
          {cartStatus ? <p className="mt-3 text-sm text-gray-300">{cartStatus}</p> : null}
        </div>
        </aside>

        <main className="order-2 flex h-full min-h-0 min-w-0 overflow-hidden bg-[#181818]">
          <div
            ref={previewPaneRef}
            className="relative flex h-full min-h-0 w-full min-w-0 items-center justify-center overflow-hidden px-1 py-1 md:px-4 md:py-4"
          >
            <div
              className={`${getPreviewStageClassName(currentView)} relative shrink-0`}
              style={{
                width: `${CANVAS_DEFAULT_WIDTH}px`,
                height: `${CANVAS_DEFAULT_HEIGHT}px`,
                transform: `scale(${previewScale})`,
                transformOrigin: "center center",
              }}
            >
              <div
                className="pointer-events-none absolute z-30 overflow-hidden rounded-sm border border-[#2f3f46] bg-[#111]/90 text-[9px] font-semibold text-cyan-100 shadow-lg"
                style={{
                  left: `${resolvedPrintAreaBounds.left}px`,
                  top: `${Math.max(0, resolvedPrintAreaBounds.top - 20)}px`,
                  width: `${resolvedPrintAreaBounds.width}px`,
                  height: "18px",
                }}
              >
                {rulerInchTicksX.map((tick) => (
                  <div
                    key={`x-${tick.value}`}
                    className="absolute bottom-0 border-l border-cyan-200/70"
                    style={{
                      left: `${tick.left - resolvedPrintAreaBounds.left}px`,
                      height: tick.major ? "14px" : "7px",
                    }}
                  >
                    {tick.major ? (
                      <span className="absolute left-1 top-0 text-[9px] leading-none text-cyan-100">{Math.round(tick.value)}</span>
                    ) : null}
                  </div>
                ))}
              </div>
              <div
                className="pointer-events-none absolute z-30 overflow-hidden rounded-sm border border-[#2f3f46] bg-[#111]/90 text-[9px] font-semibold text-cyan-100 shadow-lg"
                style={{
                  left: `${Math.max(0, resolvedPrintAreaBounds.left - 22)}px`,
                  top: `${resolvedPrintAreaBounds.top}px`,
                  width: "20px",
                  height: `${resolvedPrintAreaBounds.height}px`,
                }}
              >
                {rulerInchTicksY.map((tick) => (
                  <div
                    key={`y-${tick.value}`}
                    className="absolute right-0 border-t border-cyan-200/70"
                    style={{
                      top: `${tick.top - resolvedPrintAreaBounds.top}px`,
                      width: tick.major ? "16px" : "8px",
                    }}
                  >
                    {tick.major ? (
                      <span className="absolute right-1 top-0 text-[9px] leading-none text-cyan-100">{Math.round(tick.value)}</span>
                    ) : null}
                  </div>
                ))}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mockupLoadFailed ? GENERIC_BLANK_MOCKUPS[currentView] : resolvedMockupUrl}
                alt={`${VIEW_LABELS[currentView]} mockup`}
                className={getMockupImageClassName()}
                style={{
                  width: `${mockupRender.renderedWidth}px`,
                  height: `${mockupRender.renderedHeight}px`,
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
                onLoad={(event) => {
                  const image = event.currentTarget;
                  const naturalWidth = image.naturalWidth || 0;
                  const naturalHeight = image.naturalHeight || 0;
                  setMockupNaturalSize((prev) =>
                    prev.width === naturalWidth && prev.height === naturalHeight
                      ? prev
                      : { width: naturalWidth, height: naturalHeight }
                  );
                }}
                onError={() => {
                  if (mockupLoadFailed) return;
                  setMockupLoadFailed(true);
                }}
              />
              <div
                className="pointer-events-none absolute z-20 border border-dashed border-cyan-400"
                style={{
                  left: `${resolvedPrintAreaBounds.left}px`,
                  top: `${resolvedPrintAreaBounds.top}px`,
                  width: `${resolvedPrintAreaBounds.width}px`,
                  height: `${resolvedPrintAreaBounds.height}px`,
                }}
              />
              <canvas ref={canvasElRef} className="relative z-10" />
              {selectedDesignMetrics ? (
                <div
                  className="pointer-events-none absolute z-40 rounded-full border border-cyan-300/70 bg-[#0b1114]/95 px-2 py-1 text-[10px] font-semibold text-cyan-100 shadow-xl"
                  style={{
                    left: `${Math.min(
                      CANVAS_DEFAULT_WIDTH - 150,
                      Math.max(4, selectedDesignMetrics.left + selectedDesignMetrics.widthCanvas / 2 - 70)
                    )}px`,
                    top: `${Math.max(4, selectedDesignMetrics.top - 28)}px`,
                  }}
                >
                  {formatInches(selectedDesignMetrics.widthIn)}&quot; x {formatInches(selectedDesignMetrics.heightIn)}&quot;
                </div>
              ) : null}
            </div>
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
