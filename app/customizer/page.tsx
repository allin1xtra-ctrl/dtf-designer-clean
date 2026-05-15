"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, FabricImage, Path, Shadow, Textbox } from "fabric";
import { normalizeVariantId } from "../lib/shopify";

const FALLBACK_VARIANT_ID = "47766570074286";
const CANVAS_DEFAULT_WIDTH = 500;
const CANVAS_DEFAULT_HEIGHT = 600;

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

const DEFAULT_TEXT_CONTROLS: TextControlsState = {
  fontFamily: "Arial",
  fontSize: 32,
  textColor: "#000000",
  outlineColor: "#000000",
  outlineWidth: 0,
  shadow: false,
  glow: false,
  letterSpacing: 0,
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

const VIEW_LABELS: Record<ViewName, string> = {
  front: "Front",
  back: "Back",
  leftSleeve: "Left Sleeve",
  rightSleeve: "Right Sleeve",
  neck: "Neck Label",
};

type CanvasSnapshot = ReturnType<Canvas["toJSON"]>;
type UploadResponse = {
  error?: string;
  url?: string;
};

type PrintArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PrintLocationData = {
  mockupUrl?: string;
  colorMockups?: Record<string, string>;
  sizeMockups?: Record<string, string>;
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
  imageDataUrl?: string;
  dataUrl?: string;
  imageUrl?: string;
  suggestions?: string[];
};

const SHOPIFY_PARENT_ORIGIN = "https://yourdtfplug.com";
const DEFAULT_DESIGN_AREA: PrintArea = { x: 10, y: 10, width: 80, height: 80 };
const MIN_CURVE_AMPLITUDE = 8;
const MAX_CURVE_AMPLITUDE = 220;
const TRANSFER_SIZE_PRESETS = ["3x3", "4x5", "8x8", "10x10", "12x12", "12x16", "14x16", "16x20"];
const BLANK_MOCKUP_SVG_WIDTH = 1000;
const BLANK_MOCKUP_SVG_HEIGHT = 1200;
// Expanded to leave a roughly 12% side margin and 6% top margin so fallback blank garments read larger in the preview.
const BLANK_MOCKUP_FRAME = { x: 120, y: 70, width: 760, height: 1060, radius: 24 };
const MOCKUP_FIT_RATIO = 0.9;
const MOCKUP_FIT_RATIO_SMALL_SCREEN = 0.92;
const PREVIEW_PADDING = 8;
const MIN_PREVIEW_SCALE = 0.01;
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
    front: { x: 33, y: 24, width: 34, height: 44 },
    back: { x: 31, y: 22, width: 38, height: 48 },
    neck: { x: 41, y: 13, width: 18, height: 12 },
    neck_tag: { x: 41, y: 13, width: 18, height: 12 },
    neckLabel: { x: 41, y: 13, width: 18, height: 12 },
    neck_label: { x: 41, y: 13, width: 18, height: 12 },
  },
};

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

function getPrintLocationDataForView(
  printLocations: PrintLocationsMap,
  view: ViewName,
  productHandle: string
): { activeLocation: string; activeLocationData: PrintLocationData } {
  const keys = VIEW_LOCATION_KEYS[view];
  const normalizedHandle = productHandle.trim().toLowerCase();
  const handleOverrides = normalizedHandle ? PRODUCT_PRINT_LOCATION_OVERRIDES[normalizedHandle] : undefined;

  for (const key of keys) {
    const location = printLocations[key];
    if (location && typeof location === "object") {
      const override = handleOverrides?.[key];
      return {
        activeLocation: key,
        activeLocationData: override ? { ...override, ...location } : location,
      };
    }
  }

  const fallbackKey = keys[0] || view;
  return {
    activeLocation: fallbackKey,
    activeLocationData: handleOverrides?.[fallbackKey] ? { ...handleOverrides[fallbackKey] } : {},
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

export default function CustomizerPage() {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewPaneRef = useRef<HTMLDivElement | null>(null);

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
  const [boundaryWarning, setBoundaryWarning] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [designIdeaPrompt, setDesignIdeaPrompt] = useState("");
  const [previewScale, setPreviewScale] = useState(1);
  const [mockupNaturalSize, setMockupNaturalSize] = useState({ width: 0, height: 0 });
  const [textControls, setTextControls] = useState<TextControlsState>(DEFAULT_TEXT_CONTROLS);
  const printableAreaRef = useRef({ left: 0, top: 0, width: 0, height: 0 });
  const shouldDebugAiLogRef = useRef(false);
  const lastSentIframeHeightRef = useRef(0);

  const viewsRef = useRef<Record<ViewName, CanvasSnapshot | null>>({
    front: null,
    back: null,
    leftSleeve: null,
    rightSleeve: null,
    neck: null,
  });

  const getCanvas = () => fabricCanvasRef.current;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const MIN_HEIGHT_CHANGE_THRESHOLD = 80;
    const HEIGHT_UPDATE_DEBOUNCE_MS = 250;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const sendHeight = () => {
      if (timer) clearTimeout(timer);

      timer = setTimeout(() => {
        const nextHeight = Math.ceil(
          Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight,
            document.documentElement.offsetHeight,
            document.body.offsetHeight
          )
        );

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
      selectedObject: activeObject,
      selectedObjectType: getObjectType(activeObject) || "none",
      aiActionRequested: action,
      ...details,
    });
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
  };

  const saveCurrentView = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    viewsRef.current[currentView] = canvas.toJSON();
  };

  const loadView = async (view: ViewName) => {
    const canvas = getCanvas();
    if (!canvas) return;

    saveCurrentView();
    canvas.clear();
    canvas.backgroundColor = "transparent";

    setCurrentView(view);
    setAiSuggestions([]);
    setBoundaryWarning("");

    if (isSmallPrintLocation(view)) {
      setTransferSize(getSafeTransferSizeForView(view));
    }

    const saved = viewsRef.current[view];
    if (saved?.objects?.length) {
      await canvas.loadFromJSON(saved);
    }

    canvas.renderAll();
    syncSelectedObject();
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
        fontWeight: next.bold ? "bold" : "normal",
        fontStyle: next.italic ? "italic" : "normal",
        shadow: nextShadow,
      });

      applyTextCurve(textObject, next.curveMode, next.bendCurve);
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
    return true;
  };

  const addImageToPrintableArea = async (nextDataUrl: string) => {
    const canvas = getCanvas();
    if (!canvas) return false;

    const nextImage = await FabricImage.fromURL(nextDataUrl);
    const { left: areaLeft, top: areaTop, width: areaWidth, height: areaHeight } = printableAreaRef.current;

    nextImage.scaleToWidth(areaWidth);
    if (nextImage.getScaledHeight() > areaHeight) {
      nextImage.scaleToHeight(areaHeight);
    }

    nextImage.set({
      left: areaLeft + (areaWidth - nextImage.getScaledWidth()) / 2,
      top: areaTop + (areaHeight - nextImage.getScaledHeight()) / 2,
    });

    canvas.add(nextImage);
    canvas.setActiveObject(nextImage);
    nextImage.setCoords();
    canvas.requestRenderAll();
    syncSelectedObject();
    return true;
  };

  const runAiRouteAction = async (route: string, actionName: string) => {
    const activeObject = getCanvas()?.getActiveObject();

    if (!isImageObject(activeObject)) {
      setAiStatus("Select an image first.");
      return;
    }

    try {
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
        setAiStatus(result.error || fallbackError);
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
      console.error(`${actionName} failed:`, error);
      setAiStatus(
        actionName === "Remove Background"
          ? "Background removal failed. Please try another image or upload a transparent PNG."
          : `${actionName} failed.`
      );
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
      setAiStatus("Describe your design idea first.");
      return;
    }

    try {
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
          result.error || "AI design generation is not configured. Add OPENAI_API_KEY in Vercel."
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
      console.error("AI design generation failed:", error);
      setAiStatus("AI design generation failed. Please try a different prompt.");
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
  const transferProduct = isTransferProduct(productHandle, productData?.title || "");
  const apparelProduct = isApparelProduct(productHandle, productData?.title || "");
  const shouldShowTransferSizePreview = transferProduct && !apparelProduct;

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
  };

  const handleSizeChange = (nextSize: string) => {
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
  const selectedColorOption = selectedVariant?.selectedOptions?.find((option) => {
    const optionName = normalizeOptionLabel(String(option?.name || ""));
    return COLOR_OPTION_NAMES.includes(optionName);
  });
  const selectedColorFromVariant = normalizeColorName(String(selectedColorOption?.value || ""));
  const normalizedSelectedColor = normalizeColorName(
    selectedColorFromVariant || selectedColor || DEFAULT_COLOR
  );
  const colorMockupUrl = resolveColorMockupUrl(activeLocationData, normalizedSelectedColor);
  const mockupUrl = colorMockupUrl || activeLocationData?.mockupUrl;
  const resolvedMockupUrl = resolveMockupUrl(mockupUrl, currentView, productHandle);
  const designArea = normalizeDesignArea(activeLocationData);
  const mockupFitRatio = previewScale < 1 ? MOCKUP_FIT_RATIO_SMALL_SCREEN : MOCKUP_FIT_RATIO;
  const mockupRender = getMockupRenderDimensions(
    mockupNaturalSize.width,
    mockupNaturalSize.height,
    mockupFitRatio
  );
  const resolvedPrintAreaBounds = getResolvedPrintAreaBounds(designArea, mockupRender);
  const maxPrintWidth = normalizePrintLimit(activeLocationData?.maxPrintWidth);
  const maxPrintHeight = normalizePrintLimit(activeLocationData?.maxPrintHeight);
  const availableViews = getAvailableViews(printLocations);
  const transferDimensions = parseTransferSize(transferSize);
  const isSmallLocation = isSmallPrintLocation(currentView);
  const safePrintAreaLabel = getSmallPrintAreaLabel(currentView);
  const hasSelectedDesign = selectedObjectType !== "none";

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
    if (!matchedSizeMockupKey) return;
    setTransferSize((currentTransferSize) =>
      currentTransferSize === matchedSizeMockupKey ? currentTransferSize : matchedSizeMockupKey
    );
  }, [matchedSizeMockupKey, setTransferSize]);
  const isAddToCartDisabled = isSubmitting || Boolean(printLocationsError);
  const addToCartDescriptionId = printLocationsError ? "print-locations-error" : undefined;

  useEffect(() => {
    if (!availableViews.length || availableViews.includes(currentView)) return;
    setCurrentView(availableViews[0]);
  }, [availableViews, currentView]);

  useEffect(() => {
    console.log("DTF selected variant:", selectedVariant);
    console.log("DTF selected color:", normalizedSelectedColor);
    console.log("DTF active location data:", activeLocationData);
    console.log("DTF resolved color mockup URL:", resolvedMockupUrl);
  }, [activeLocationData, normalizedSelectedColor, resolvedMockupUrl, selectedVariant]);

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
      const rect = previewPaneRef.current?.getBoundingClientRect();
      if (!rect) return;

      const widthScale = Math.max(
        (rect.width - PREVIEW_PADDING) / CANVAS_DEFAULT_WIDTH,
        MIN_PREVIEW_SCALE
      );
      const heightScale = Math.max(
        (rect.height - PREVIEW_PADDING) / CANVAS_DEFAULT_HEIGHT,
        MIN_PREVIEW_SCALE
      );
      const nextScale = Math.min(widthScale, heightScale, 1);
      // Ignore tiny float-only changes so ResizeObserver doesn't trigger unnecessary re-renders.
      setPreviewScale((prev) =>
        Math.abs(prev - nextScale) < SCALE_CHANGE_THRESHOLD ? prev : nextScale
      );
    };

    updateScale();
    const observer = new ResizeObserver(() => updateScale());
    observer.observe(previewPaneRef.current);
    window.addEventListener("resize", updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  useEffect(() => {
    setMockupNaturalSize({ width: 0, height: 0 });
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
  }, [resolvedPrintAreaBounds]);

  useEffect(() => {
    shouldDebugAiLogRef.current = shouldDebugAiLog;
  }, [shouldDebugAiLog]);

  useEffect(() => {
    if (!canvasElRef.current) return;

    const canvas = new Canvas(canvasElRef.current, {
      width: CANVAS_DEFAULT_WIDTH,
      height: CANVAS_DEFAULT_HEIGHT,
      backgroundColor: "transparent",
      allowTouchScrolling: true,
    });

    fabricCanvasRef.current = canvas;

    const handleSelection = () => {
      syncSelectedObject();
      if (shouldDebugAiLogRef.current) {
        const activeObject = canvas.getActiveObject();
        console.log("[AI DEBUG]", {
          selectedObject: activeObject,
          selectedObjectType: getObjectType(activeObject) || "none",
        });
      }
    };

    const handleObjectChange = () => {
      updateBoundaryWarning();
    };

    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", handleSelection);
    canvas.on("object:moving", handleObjectChange);
    canvas.on("object:scaling", handleObjectChange);
    canvas.on("object:modified", handleObjectChange);

    setIsReady(true);

    return () => {
      canvas.off("selection:created", handleSelection);
      canvas.off("selection:updated", handleSelection);
      canvas.off("selection:cleared", handleSelection);
      canvas.off("object:moving", handleObjectChange);
      canvas.off("object:scaling", handleObjectChange);
      canvas.off("object:modified", handleObjectChange);
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

        img.scaleToWidth(areaWidth);
        if (img.getScaledHeight() > areaHeight) {
          img.scaleToHeight(areaHeight);
        }

        img.set({
          left: areaLeft + (areaWidth - img.getScaledWidth()) / 2,
          top: areaTop + (areaHeight - img.getScaledHeight()) / 2,
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        syncSelectedObject();
      } catch (error) {
        console.error("Image upload failed:", error);
      }
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const addText = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const text = new Textbox("Your Design", {
      left: 100,
      top: 100,
      fill: textControls.textColor,
      stroke: textControls.outlineColor,
      strokeWidth: textControls.outlineWidth,
      fontSize: textControls.fontSize,
      fontFamily: textControls.fontFamily,
      width: 250,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    syncSelectedObject();
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
  };

  const removeSelected = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.renderAll();
    syncSelectedObject();
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
  };

  const centerSelected = () => {
    withActiveObject((obj) => {
      const canvas = getCanvas();
      if (!canvas) return;
      canvas.centerObject(obj);
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
  };

  const sendBackward = () => {
    const canvas = getCanvas();
    const activeObject = canvas?.getActiveObject();
    if (!canvas || !activeObject) return;
    canvas.sendObjectBackwards(activeObject);
    canvas.requestRenderAll();
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
    const blob = await exportCurrentViewBlob();
    if (!blob) throw new Error("Preview image could not be generated.");

    const formData = new FormData();
    formData.append("file", blob, `dtf-${currentView}.png`);

    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const result = (await response.json()) as UploadResponse;

    if (!response.ok || !result.url) {
      throw new Error(result.error || "Artwork upload failed.");
    }

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

      const uploadedArtworkUrl = await uploadPreviewImage();

      if (!isCloudinaryUrl(uploadedArtworkUrl)) {
        alert("Artwork upload is not complete. Please wait and try again.");
        setCartStatus("");
        return;
      }

      const lineItemProperties: Record<string, string> = {
        "Design ID": createDesignId(),
        Size: selectedSize || "Custom",
        Placement: VIEW_LABELS[currentView],
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
    <div className="min-h-dvh overflow-x-hidden bg-[#0e0e0e] text-white">
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

        @media (max-width: 768px) {
          html,
          body {
            overflow-x: hidden;
          }

          .canvas-container,
          .upper-canvas,
          .lower-canvas {
            transform-origin: top left !important;
          }
        }
      `}</style>
      <div className="border-b border-[#222] bg-[#111] px-4 py-4 md:hidden">
        <h1 className="text-xl font-bold">DTF Designer Pro</h1>
        <p className="mt-1 text-sm text-gray-400">
          Upload artwork, customize DTF transfers and gang sheets, place designs on custom
          t-shirts and hoodies, then send your order details to Shopify checkout.
        </p>
      </div>

      <div className="flex min-w-0 flex-col overflow-visible md:grid md:min-h-dvh md:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="order-2 w-full shrink-0 overflow-visible border-t border-[#222] bg-[#111] p-4 pb-12 md:order-1 md:h-dvh md:w-auto md:overflow-y-auto md:border-t-0 md:border-r md:p-5">
          <div className="hidden md:block">
            <h1 className="text-xl font-bold">DTF Designer Pro</h1>
            <p className="mt-1 text-sm text-gray-400">
              Upload artwork, customize DTF transfers and gang sheets, place designs on custom
              t-shirts and hoodies, then send your order details to Shopify checkout.
            </p>
          </div>

          <div className="mt-2 md:mt-5">
            <PrintLocationControls
              availableViews={availableViews}
              currentView={currentView}
              isReady={isReady}
              loadView={loadView}
              printLocationsError={printLocationsError}
            />
          </div>

        <div className="md:mt-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">Upload Artwork</h2>
          <input id="artwork-upload-input" name="artworkUpload" ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="block w-full cursor-pointer rounded bg-[#1f1f1f] p-2 text-sm text-white hover:bg-[#333]">Upload Artwork</button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
          <button type="button" onClick={addText} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Add Text</button>
          <button type="button" onClick={duplicateSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Duplicate</button>
          <button type="button" onClick={centerSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Center</button>
          <button type="button" onClick={toggleLockSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">{selectedLocked ? "Unlock" : "Lock"}</button>
          <button type="button" onClick={flipHorizontal} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Flip H</button>
          <button type="button" onClick={flipVertical} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Flip V</button>
          <button type="button" onClick={removeSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Delete</button>
          <button type="button" onClick={rotateSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Rotate</button>
          <button type="button" onClick={bringForward} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Bring Forward</button>
          <button type="button" onClick={sendBackward} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Send Backward</button>
        </div>

        <div className="sticky bottom-0 z-30 mt-5 rounded border border-[#2b2b2b] bg-[#171717] p-4 shadow-[0_-6px_16px_rgba(0,0,0,0.45)] md:static md:shadow-none">
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
            <button type="button" onClick={() => runAiRouteAction("/api/ai/remove-background", "Remove Background")} className="rounded bg-[#1f1f1f] px-2 py-2 text-left hover:bg-[#333]" title="Remove any background from selected artwork">Remove Background</button>
          </div>

          <div className="mt-3 rounded border border-[#2b2b2b] bg-[#111] p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">Design Idea</h3>
            <label htmlFor="design-idea-input" className="sr-only">Design idea prompt</label>
            <input id="design-idea-input" name="designIdeaPrompt" type="text" value={designIdeaPrompt} onChange={(e) => setDesignIdeaPrompt(e.target.value)} placeholder="Describe your design style and key elements" className="mb-2 w-full rounded bg-[#1f1f1f] px-2 py-2 text-sm" />
            <button type="button" onClick={generateDesignIdea} className="w-full rounded bg-[#1f1f1f] px-2 py-2 text-left text-xs hover:bg-[#333]" title="AI Generate Design Idea">Generate Idea</button>
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
                  onChange={(e) => setTransferSize(e.target.value)}
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
          <input id="checkout-quantity-input" name="quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mb-3 w-full rounded bg-[#1f1f1f] px-3 py-2 text-white" />

          <button type="button" onClick={handleAddToCart} disabled={isAddToCartDisabled} aria-describedby={addToCartDescriptionId} className="w-full rounded bg-white px-4 py-3 font-semibold text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-500">{isSubmitting ? "Uploading..." : "Add Custom Design to Cart"}</button>
          {cartStatus ? <p className="mt-3 text-sm text-gray-300">{cartStatus}</p> : null}
        </div>
      </aside>

        <main className="order-1 flex min-h-0 min-w-0 flex-col md:order-2 md:h-full md:overflow-hidden md:px-6 md:py-6">
          <div
            ref={previewPaneRef}
            className="order-1 flex h-[clamp(440px,62vh,640px)] min-h-[440px] w-full max-w-full items-center justify-center overflow-hidden bg-[#181818] px-2 py-3 md:h-auto md:min-h-0 md:flex-1 md:px-4 md:py-4"
          >
            <div
              className={getPreviewStageClassName(currentView)}
              style={{
                width: `${CANVAS_DEFAULT_WIDTH}px`,
                height: `${CANVAS_DEFAULT_HEIGHT}px`,
                transform: `scale(${previewScale})`,
                transformOrigin: "center center",
              }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolvedMockupUrl}
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
              </div>
            </div>
        </main>
      </div>
    </div>
  );
}
