"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

type PreviewMode = "apparel" | "transfer";
type PanelTab = "tools" | "assistant" | "order";
type ViewId = "front" | "back" | "leftSleeve" | "rightSleeve" | "neckTag";
type StagingUploadStatus = "idle" | "uploading" | "success" | "warning" | "error";
type StagingSaveStatus = "idle" | "saving" | "success" | "warning" | "error";
type MockupBlendMode = "normal" | "multiply" | "overlay" | "soft-light";
type ImageFitMode = "contain" | "cover" | "stretch" | "manual";
type FontCategory = "Serif" | "Sans Serif" | "Script" | "Display" | "Handwritten" | "Geometric / Modern";
type TemplateCategory =
  | "Logos"
  | "Streetwear"
  | "Jerseys"
  | "Business"
  | "Events"
  | "Family Reunion"
  | "Memorial"
  | "Sports"
  | "Boutique"
  | "Food / Restaurant"
  | "Barber / Beauty"
  | "Church / Ministry"
  | "School / Spirit"
  | "Birthday"
  | "Stickers"
  | "Gang Sheets"
  | "Labels"
  | "Transfers";

type ArtworkState = {
  url: string;
  name: string;
  file: File;
};

type EditableLayerType = "text" | "image" | "shape" | "placeholder" | "image-placeholder";

type EditableTemplateLayer = {
  id: string;
  type: EditableLayerType;
  name: string;
  text?: string;
  sourceUrl?: string;
  sourceName?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  color: string;
  fontId?: string;
  fontFamily: string;
  fontSize: number;
  fitMode?: ImageFitMode;
  cropX?: number;
  cropY?: number;
  cropZoom?: number;
  lockAspectRatio?: boolean;
  locked: boolean;
  hidden: boolean;
  zIndex: number;
};

type StagingUploadAsset = {
  id: string;
  purpose: string;
  filename: string;
  contentType: string;
  size: number;
  stagingOnly: boolean;
  url?: string;
};

type StagingUploadResult = {
  artworkName: string;
  asset?: StagingUploadAsset;
  errors: string[];
  warnings: string[];
};

type StagingGeneratedAssetResult = {
  asset?: StagingUploadAsset;
  errors: string[];
  warnings: string[];
};

type StagingSaveResult = {
  savedDesign?: {
    id: string;
    stagingOnly: boolean;
    createdAt: string;
    payload: unknown;
  };
  errors: string[];
  warnings: string[];
  lineItemPropertiesPreview?: Record<string, string>;
};

type TemplateLayerSeed = Partial<Omit<EditableTemplateLayer, "id">>;

type StarterTemplateCard = {
  id: string;
  name: string;
  category: TemplateCategory;
  mode: PreviewMode | "both";
  targetView?: ViewId;
  tags: string[];
  thumbnailUrl?: string;
  previewImage?: string;
  thumbnail: string;
  description: string;
  layers: TemplateLayerSeed[];
};

type TemplateDraftState = {
  template: StarterTemplateCard;
  mode: PreviewMode;
  targetView: ViewId;
  transferSize: string;
  layers: EditableTemplateLayer[];
  selectedLayerId: string | null;
  status: string;
};

type StagingPrintArea = { x: number; y: number; width: number; height: number };
type StagingPrintLocation = {
  id: string;
  label?: string;
  printArea?: StagingPrintArea;
  maxPrintWidth?: number;
  maxPrintHeight?: number;
  enabled?: boolean;
  mockupUrl?: string;
};
type StagingTransferSize = { id: string; label?: string; width: number; height: number; enabled?: boolean; isGangSheet?: boolean };
type StagingCustomizerConfig = {
  type?: string;
  editorMode?: string;
  label?: string;
  productHandle?: string;
  colors?: Array<{ id?: string; label?: string; hex?: string; enabled?: boolean; mockupUrl?: string }>;
  printLocations?: StagingPrintLocation[];
  transferSizes?: StagingTransferSize[];
  materialOptions?: Array<{ id?: string; label?: string; enabled?: boolean }>;
  fileRules?: {
    allowedExtensions?: string[];
    maxFileSizeMb?: number;
    minDpi?: number;
    recommendedDpi?: number;
    allowTransparentPng?: boolean;
  };
  stagingSettings?: {
    transferMockupUrl?: string;
    gangSheetMockupUrl?: string;
    defaultTransferSizeId?: string;
    inkOptions?: string[];
    lowResolutionWarningEnabled?: boolean;
    transparentBackgroundRecommended?: boolean;
    templateSettings?: {
      enabledForApparel?: boolean;
      enabledForTransfer?: boolean;
      enabledCategories?: string[];
      defaultCategory?: string;
    };
    realismDefaults?: {
      enabled?: boolean;
      fabricBlendEnabled?: boolean;
      defaultBlendMode?: MockupBlendMode;
      defaultInkOpacity?: number;
      textureOverlayEnabled?: boolean;
    };
    pricingPreview?: {
      basePrice?: number;
      pricePerSquareInch?: number;
      rushFee?: number;
      quantityBreaks?: string;
    };
  };
};

type MockupColorKey = "black" | "white" | "heatherGrey" | "regularGrey" | "royalBlue" | "red" | "offWhite";
type MockupAsset = { label: string; url: string; hasBakedPrintGuide: boolean };
type ApparelMockupOverrides = Partial<Record<MockupColorKey, Partial<Record<ViewId, MockupAsset>>>>;

type PreviewColorOption = {
  id: string;
  label: string;
  hex: string;
  mockupKey: MockupColorKey;
  mockupUrl?: string;
};

type EditorState = {
  mode: PreviewMode;
  activeView: ViewId;
  transferSize: string;
  artworkByView: Record<ViewId, ArtworkState | null>;
  transferArtwork: ArtworkState | null;
  zoom: number;
  rotation: number;
  scale: number;
  x: number;
  y: number;
  selectedTemplate: string;
  layersByView: Record<ViewId, EditableTemplateLayer[]>;
  transferLayersBySize: Record<string, EditableTemplateLayer[]>;
  selectedLayerId: string | null;
  selectedColorId: string;
  selectedColorHex: string;
  status: string;
  usingSafeDefaults: boolean;
};

const APPAREL_VIEWS: Array<{ id: ViewId; label: string; short: string }> = [
  { id: "front", label: "Front", short: "F" },
  { id: "back", label: "Back", short: "B" },
  { id: "leftSleeve", label: "Left Sleeve", short: "LS" },
  { id: "rightSleeve", label: "Right Sleeve", short: "RS" },
  { id: "neckTag", label: "Neck Tag", short: "N" },
];

const TRANSFER_SIZES = ["3x3", "5x5", "8x10", "11x17", "12x24", "13x24", "13x60", "Gang Sheet"];
const DEFAULT_PRODUCT_COLORS: PreviewColorOption[] = [
  { id: "black", label: "Black", hex: "#101316", mockupKey: "black" },
  { id: "white", label: "White", hex: "#f8fafc", mockupKey: "white" },
  { id: "heather-grey", label: "Heather Grey", hex: "#9ca3af", mockupKey: "heatherGrey" },
  { id: "regular-grey", label: "Regular Grey", hex: "#64748b", mockupKey: "regularGrey" },
  { id: "royal-blue", label: "Royal Blue", hex: "#075985", mockupKey: "royalBlue" },
  { id: "red", label: "Red", hex: "#991b1b", mockupKey: "red" },
  { id: "off-white", label: "Off White", hex: "#f5f1e8", mockupKey: "offWhite" },
];
const MATERIAL_OPTIONS = ["Hot Peel Film", "Cold Peel Film", "Matte Finish", "Gloss Finish"];
// Production fonts must be license-reviewed before launch; do not bundle font files unless the open license file is included.
const FONT_REGISTRY: Array<{
  id: string;
  label: string;
  category: FontCategory;
  cssFontFamily: string;
  license: string;
  source: string;
}> = [
  { id: "playfair-display", label: "Playfair Display", category: "Serif", cssFontFamily: "\"Playfair Display\", Georgia, serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "cormorant-garamond", label: "Cormorant Garamond", category: "Serif", cssFontFamily: "\"Cormorant Garamond\", Garamond, serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "libre-baskerville", label: "Libre Baskerville", category: "Serif", cssFontFamily: "\"Libre Baskerville\", Georgia, serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "lora", label: "Lora", category: "Serif", cssFontFamily: "Lora, Georgia, serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "merriweather", label: "Merriweather", category: "Serif", cssFontFamily: "Merriweather, Georgia, serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "inter", label: "Inter", category: "Sans Serif", cssFontFamily: "Inter, Arial, sans-serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "montserrat", label: "Montserrat", category: "Sans Serif", cssFontFamily: "Montserrat, Arial, sans-serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "poppins", label: "Poppins", category: "Sans Serif", cssFontFamily: "Poppins, Arial, sans-serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "open-sans", label: "Open Sans", category: "Sans Serif", cssFontFamily: "\"Open Sans\", Arial, sans-serif", license: "Apache License 2.0", source: "Google Fonts / open source" },
  { id: "roboto", label: "Roboto", category: "Sans Serif", cssFontFamily: "Roboto, Arial, sans-serif", license: "Apache License 2.0", source: "Google Fonts / open source" },
  { id: "great-vibes", label: "Great Vibes", category: "Script", cssFontFamily: "\"Great Vibes\", cursive", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "dancing-script", label: "Dancing Script", category: "Script", cssFontFamily: "\"Dancing Script\", cursive", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "pacifico", label: "Pacifico", category: "Script", cssFontFamily: "Pacifico, cursive", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "allura", label: "Allura", category: "Script", cssFontFamily: "Allura, cursive", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "sacramento", label: "Sacramento", category: "Script", cssFontFamily: "Sacramento, cursive", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "bebas-neue", label: "Bebas Neue", category: "Display", cssFontFamily: "\"Bebas Neue\", Impact, sans-serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "anton", label: "Anton", category: "Display", cssFontFamily: "Anton, Impact, sans-serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "oswald", label: "Oswald", category: "Display", cssFontFamily: "Oswald, Arial, sans-serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "abril-fatface", label: "Abril Fatface", category: "Display", cssFontFamily: "\"Abril Fatface\", Georgia, serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "bungee", label: "Bungee", category: "Display", cssFontFamily: "Bungee, Impact, sans-serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "caveat", label: "Caveat", category: "Handwritten", cssFontFamily: "Caveat, cursive", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "permanent-marker", label: "Permanent Marker", category: "Handwritten", cssFontFamily: "\"Permanent Marker\", cursive", license: "Apache License 2.0", source: "Google Fonts / open source" },
  { id: "indie-flower", label: "Indie Flower", category: "Handwritten", cssFontFamily: "\"Indie Flower\", cursive", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "patrick-hand", label: "Patrick Hand", category: "Handwritten", cssFontFamily: "\"Patrick Hand\", cursive", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "shadows-into-light", label: "Shadows Into Light", category: "Handwritten", cssFontFamily: "\"Shadows Into Light\", cursive", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "raleway", label: "Raleway", category: "Geometric / Modern", cssFontFamily: "Raleway, Arial, sans-serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "urbanist", label: "Urbanist", category: "Geometric / Modern", cssFontFamily: "Urbanist, Arial, sans-serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "outfit", label: "Outfit", category: "Geometric / Modern", cssFontFamily: "Outfit, Arial, sans-serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
  { id: "quicksand", label: "Quicksand", category: "Geometric / Modern", cssFontFamily: "Quicksand, Arial, sans-serif", license: "SIL Open Font License 1.1", source: "Google Fonts / open source" },
];
const FONT_CATEGORIES: FontCategory[] = ["Serif", "Sans Serif", "Script", "Display", "Handwritten", "Geometric / Modern"];
const MOCKUP_BLEND_MODES: MockupBlendMode[] = ["normal", "multiply", "overlay", "soft-light"];
const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Logos",
  "Streetwear",
  "Jerseys",
  "Business",
  "Events",
  "Family Reunion",
  "Memorial",
  "Sports",
  "Boutique",
  "Food / Restaurant",
  "Barber / Beauty",
  "Church / Ministry",
  "School / Spirit",
  "Birthday",
  "Stickers",
  "Gang Sheets",
  "Labels",
  "Transfers",
];

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createMockupSvg(label: string, variant: "front" | "back" | "sleeve" | "neck" | "transfer" | "gang") {
  const isTransfer = variant === "transfer" || variant === "gang";
  const sheetHeight = variant === "gang" ? 2140 : 1760;
  const garmentBody = variant === "neck"
    ? '<rect x="685" y="500" width="510" height="390" rx="58" fill="#101417"/><path d="M760 500 C850 660 1030 660 1120 500" fill="#06080a"/><rect x="815" y="610" width="360" height="150" rx="26" fill="#e8eef4" opacity=".92"/><rect x="855" y="648" width="280" height="64" rx="14" fill="#111827" opacity=".95"/>'
    : variant === "sleeve"
      ? '<path d="M760 390 C910 330 1080 330 1230 390 L1320 1260 C1120 1360 880 1360 680 1260 Z" fill="url(#shirt)"/><path d="M770 510 C910 560 1080 560 1220 510 L1190 1220 C1040 1280 960 1280 810 1220 Z" fill="url(#fabric)" opacity=".7"/>'
      : '<path d="M715 430 L520 560 L360 1280 C520 1390 650 1330 700 1210 L700 1800 L1180 1800 L1180 1210 C1230 1330 1360 1390 1520 1280 L1360 560 L1165 430 C1080 520 800 520 715 430 Z" fill="url(#shirt)"/><path d="M790 310 L1180 310 L1125 470 C1020 560 890 560 735 470 Z" fill="#080b0d"/><path d="M760 585 C850 655 1080 655 1220 585 L1160 1720 L740 1720 Z" fill="url(#fabric)" opacity=".72"/>';

  const transferBody = `<rect x="520" y="140" width="840" height="${sheetHeight}" rx="42" fill="url(#sheet)" filter="url(#shadow)"/><path d="M560 210 H1320 M560 320 H1320 M560 430 H1320" stroke="#d5e2ec" stroke-width="4" opacity=".55"/><path d="M620 220 V${sheetHeight + 80} M760 220 V${sheetHeight + 80} M900 220 V${sheetHeight + 80} M1040 220 V${sheetHeight + 80} M1180 220 V${sheetHeight + 80}" stroke="#edf5fb" stroke-width="3" opacity=".75"/>`;

  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="2400" viewBox="0 0 2000 2400">
    <defs>
      <radialGradient id="bg" cx="50%" cy="18%" r="78%"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#dfe8f1"/><stop offset="1" stop-color="#b9c6d1"/></radialGradient>
      <linearGradient id="shirt" x1="0" x2="1"><stop offset="0" stop-color="#20262a"/><stop offset=".52" stop-color="#080b0d"/><stop offset="1" stop-color="#1a2024"/></linearGradient>
      <linearGradient id="fabric" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".08"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".02"/><stop offset="1" stop-color="#000000" stop-opacity=".28"/></linearGradient>
      <linearGradient id="sheet" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f6fbff"/><stop offset="1" stop-color="#e8eef5"/></linearGradient>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="52" stdDeviation="44" flood-color="#0f172a" flood-opacity=".34"/></filter>
    </defs>
    <rect width="2000" height="2400" rx="0" fill="${isTransfer ? "url(#bg)" : "#070d10"}"/>
    ${isTransfer ? '<ellipse cx="1000" cy="2180" rx="610" ry="110" fill="#0f172a" opacity=".16"/>' : ""}
    ${isTransfer ? transferBody : garmentBody}
    <text x="1000" y="2260" text-anchor="middle" font-family="Inter, Arial" font-size="42" font-weight="800" fill="#50606b" opacity=".55">${label}</text>
  </svg>`);
}

function createTemplateThumbnail(name: string, category: string, layers: TemplateLayerSeed[]) {
  const layerMarkup = layers.map((layer, index) => {
    const x = layer.x ?? 50;
    const y = layer.y ?? 50;
    const width = layer.width ?? 44;
    const height = layer.height ?? 20;
    const color = layer.color || (layer.type === "shape" ? "#22d3ee" : "#e5faff");
    if (layer.type === "text") {
      return `<text x="${x * 4}" y="${y * 3}" text-anchor="middle" dominant-baseline="middle" font-family="${layer.fontFamily || "Inter"}" font-size="${Math.max(11, Math.min(34, layer.fontSize || 18))}" font-weight="800" fill="${color}">${escapeSvgText(layer.text || layer.name || "Text")}</text>`;
    }
    if (layer.type === "shape") {
      return `<rect x="${x * 4 - width * 2}" y="${y * 3 - height * 1.5}" width="${width * 4}" height="${height * 3}" rx="12" fill="${color}" opacity="${layer.opacity ?? 0.85}"/>`;
    }
    return `<rect x="${x * 4 - width * 2}" y="${y * 3 - height * 1.5}" width="${width * 4}" height="${height * 3}" rx="14" fill="#071015" stroke="#67e8f9" stroke-width="2" stroke-dasharray="7 7"/><text x="${x * 4}" y="${y * 3}" text-anchor="middle" dominant-baseline="middle" font-family="Inter, Arial" font-size="13" font-weight="900" fill="#cffafe">${escapeSvgText(layer.text || layer.name || `Slot ${index + 1}`)}</text>`;
  }).join("");

  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 400 300">
    <defs><radialGradient id="g" cx="50%" cy="20%" r="80%"><stop offset="0" stop-color="#24434d"/><stop offset="1" stop-color="#071015"/></radialGradient></defs>
    <rect width="400" height="300" rx="28" fill="url(#g)"/>
    <rect x="78" y="42" width="244" height="210" rx="18" fill="#0d171b" stroke="#22d3ee" stroke-width="2" stroke-dasharray="8 8"/>
    ${layerMarkup}
    <text x="28" y="34" font-family="Inter, Arial" font-size="12" font-weight="900" fill="#67e8f9">${escapeSvgText(category)}</text>
    <text x="200" y="278" text-anchor="middle" font-family="Inter, Arial" font-size="18" font-weight="900" fill="#ffffff">${escapeSvgText(name)}</text>
  </svg>`);
}

function getFontById(fontId?: string) {
  return FONT_REGISTRY.find((font) => font.id === fontId) || FONT_REGISTRY[0];
}

function getFontByFamily(fontFamily?: string) {
  if (!fontFamily) return getFontById("inter");
  const normalized = fontFamily.toLowerCase().replace(/["']/g, "");
  return (
    FONT_REGISTRY.find((font) => font.cssFontFamily.toLowerCase().includes(normalized) || font.label.toLowerCase() === normalized) ||
    getFontById(normalized.includes("impact") ? "anton" : normalized.includes("oswald") ? "oswald" : normalized.includes("montserrat") ? "montserrat" : "inter")
  );
}

const STAGING_APPAREL_MOCKUPS: Record<MockupColorKey, Record<ViewId, MockupAsset>> = {
  black: {
    front: { label: "Black T-Shirt Front Mockup", url: "/customizer-preview/mockups/black-front.png", hasBakedPrintGuide: false },
    back: { label: "Black T-Shirt Back Mockup", url: "/customizer-preview/mockups/black-back.png", hasBakedPrintGuide: false },
    leftSleeve: { label: "Black T-Shirt Left Sleeve Mockup", url: "/customizer-preview/mockups/black-left-sleeve.png", hasBakedPrintGuide: true },
    rightSleeve: { label: "Black T-Shirt Right Sleeve Mockup", url: "/customizer-preview/mockups/black-right-sleeve.png", hasBakedPrintGuide: true },
    neckTag: { label: "Black T-Shirt Neck Tag Mockup", url: "/customizer-preview/mockups/black-neck-tag.png", hasBakedPrintGuide: false },
  },
  white: {
    front: { label: "White T-Shirt Front Mockup", url: "/customizer-preview/mockups/white-front.png", hasBakedPrintGuide: false },
    back: { label: "White T-Shirt Back Mockup", url: "/customizer-preview/mockups/white-back.png", hasBakedPrintGuide: false },
    leftSleeve: { label: "White T-Shirt Left Sleeve Mockup", url: "/customizer-preview/mockups/white-left-sleeve.png", hasBakedPrintGuide: true },
    rightSleeve: { label: "White T-Shirt Right Sleeve Mockup", url: "/customizer-preview/mockups/white-right-sleeve.png", hasBakedPrintGuide: false },
    neckTag: { label: "White T-Shirt Neck Tag Mockup", url: "/customizer-preview/mockups/white-neck-tag.png", hasBakedPrintGuide: false },
  },
  heatherGrey: {
    front: { label: "Heather Gray T-Shirt Front Mockup", url: "/customizer-preview/mockups/heather-grey-front.png", hasBakedPrintGuide: false },
    back: { label: "Heather Gray T-Shirt Back Mockup", url: "/customizer-preview/mockups/heather-grey-back.png", hasBakedPrintGuide: false },
    leftSleeve: { label: "Heather Gray T-Shirt Left Sleeve Mockup", url: "/customizer-preview/mockups/heather-grey-left-sleeve.png", hasBakedPrintGuide: true },
    rightSleeve: { label: "Heather Gray T-Shirt Right Sleeve Mockup", url: "/customizer-preview/mockups/heather-grey-right-sleeve.png", hasBakedPrintGuide: true },
    neckTag: { label: "Heather Gray T-Shirt Neck Tag Mockup", url: "/customizer-preview/mockups/heather-grey-neck-tag.png", hasBakedPrintGuide: false },
  },
  regularGrey: {
    front: { label: "Regular Grey T-Shirt Front Mockup", url: "/customizer-preview/mockups/regular-grey-front.png", hasBakedPrintGuide: false },
    back: { label: "Regular Grey T-Shirt Back Mockup", url: "/customizer-preview/mockups/regular-grey-back.png", hasBakedPrintGuide: false },
    leftSleeve: { label: "Regular Grey T-Shirt Left Sleeve Mockup", url: "/customizer-preview/mockups/regular-grey-left-sleeve.png", hasBakedPrintGuide: false },
    rightSleeve: { label: "Regular Grey T-Shirt Right Sleeve Mockup", url: "/customizer-preview/mockups/regular-grey-right-sleeve.png", hasBakedPrintGuide: false },
    neckTag: { label: "Regular Grey T-Shirt Neck Tag Mockup", url: "/customizer-preview/mockups/regular-grey-neck-tag.png", hasBakedPrintGuide: false },
  },
  royalBlue: {
    front: { label: "Royal Blue T-Shirt Front Mockup", url: "/customizer-preview/mockups/royal-blue-front.png", hasBakedPrintGuide: false },
    back: { label: "Royal Blue T-Shirt Back Mockup", url: "/customizer-preview/mockups/royal-blue-back.png", hasBakedPrintGuide: false },
    leftSleeve: { label: "Royal Blue T-Shirt Left Sleeve Mockup", url: "/customizer-preview/mockups/royal-blue-left-sleeve.png", hasBakedPrintGuide: false },
    rightSleeve: { label: "Royal Blue T-Shirt Right Sleeve Mockup", url: "/customizer-preview/mockups/royal-blue-right-sleeve.png", hasBakedPrintGuide: false },
    neckTag: { label: "Royal Blue T-Shirt Neck Tag Mockup", url: "/customizer-preview/mockups/royal-blue-neck-tag.png", hasBakedPrintGuide: false },
  },
  red: {
    front: { label: "Red T-Shirt Front Mockup", url: "/customizer-preview/mockups/red-front.png", hasBakedPrintGuide: false },
    back: { label: "Red T-Shirt Back Mockup", url: "/customizer-preview/mockups/red-back.png", hasBakedPrintGuide: false },
    leftSleeve: { label: "Red T-Shirt Left Sleeve Mockup", url: "/customizer-preview/mockups/red-left-sleeve.png", hasBakedPrintGuide: false },
    rightSleeve: { label: "Red T-Shirt Right Sleeve Mockup", url: "/customizer-preview/mockups/red-right-sleeve.png", hasBakedPrintGuide: false },
    neckTag: { label: "Red T-Shirt Neck Tag Mockup", url: "/customizer-preview/mockups/red-neck-tag.png", hasBakedPrintGuide: false },
  },
  offWhite: {
    front: { label: "Off White T-Shirt Front Mockup", url: "/customizer-preview/mockups/off-white-front.png", hasBakedPrintGuide: false },
    back: { label: "Off White T-Shirt Back Mockup", url: "/customizer-preview/mockups/off-white-back.png", hasBakedPrintGuide: false },
    leftSleeve: { label: "Off White T-Shirt Left Sleeve Mockup", url: "/customizer-preview/mockups/off-white-left-sleeve.png", hasBakedPrintGuide: false },
    rightSleeve: { label: "Off White T-Shirt Right Sleeve Mockup", url: "/customizer-preview/mockups/off-white-right-sleeve.png", hasBakedPrintGuide: false },
    neckTag: { label: "Off White T-Shirt Neck Tag Mockup", url: "/customizer-preview/mockups/off-white-neck-tag.png", hasBakedPrintGuide: false },
  },
};

const STAGING_TRANSFER_MOCKUPS = {
  transferSheet: { label: "Blank Flat White Transfer Canvas", url: createMockupSvg("Blank transfer canvas", "transfer") },
  gangSheet: { label: "Gang Sheet Staging Mockup", url: createMockupSvg("Gang sheet staging mockup", "gang") },
};

const CLOUDINARY_TEMPLATE_THUMBNAIL_BASE =
  "https://res.cloudinary.com/dzh8appfs/image/upload/dtf-designer-pro/staging/customizer/templates/thumbs";

function getCloudinaryTemplateThumbnailUrl(templateId: string) {
  return `${CLOUDINARY_TEMPLATE_THUMBNAIL_BASE}/${templateId}.png`;
}

function templateDefinition(input: Omit<StarterTemplateCard, "thumbnail" | "tags"> & { tags?: string[] }): StarterTemplateCard {
  return {
    ...input,
    tags: input.tags || [],
    thumbnailUrl: input.thumbnailUrl || getCloudinaryTemplateThumbnailUrl(input.id),
    previewImage: input.previewImage || `/customizer-preview/templates/thumbs/${input.id}.png`,
    thumbnail: createTemplateThumbnail(input.name, input.category, input.layers),
  };
}

type TemplateSpec = {
  name: string;
  category: TemplateCategory;
  mode: PreviewMode;
  targetView?: ViewId;
  tags: string[];
};

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const textSeed = (name: string, text: string, x: number, y: number, width: number, height: number, color: string, fontSize: number, fontFamily = "Montserrat", zIndex = 2): TemplateLayerSeed =>
  ({ type: "text", name, text, x, y, width, height, color, fontSize, fontFamily, zIndex });
const placeholderSeed = (name: string, text: string, x: number, y: number, width: number, height: number, zIndex = 1): TemplateLayerSeed =>
  ({ type: "placeholder", name, text, x, y, width, height, color: "#0f172a", zIndex });
const shapeSeed = (name: string, x: number, y: number, width: number, height: number, color: string, opacity = 0.88, zIndex = 0): TemplateLayerSeed =>
  ({ type: "shape", name, x, y, width, height, color, opacity, zIndex });

function createPremiumTemplateLayers(spec: TemplateSpec): TemplateLayerSeed[] {
  const upperName = spec.name.toUpperCase();
  if (spec.targetView === "neckTag") {
    return [
      shapeSeed("Label Background", 50, 50, 86, 58, "#111827", 0.94, 0),
      textSeed("Brand Text", spec.category === "Labels" ? "YOUR BRAND" : upperName, 50, 45, 78, 16, "#ffffff", 12, "Montserrat", 2),
      textSeed("Detail Text", spec.category === "Labels" ? "DTF / WASH COLD" : "SIZE / CARE", 50, 61, 68, 10, "#67e8f9", 8, "Inter", 3),
    ];
  }
  if (spec.targetView === "leftSleeve" || spec.targetView === "rightSleeve") {
    return [
      placeholderSeed("Sleeve Mark", "Upload Logo", 50, 42, 58, 28, 1),
      textSeed("Sleeve Text", spec.category === "Sports" ? "TEAM" : "EST. 2026", 50, 68, 72, 12, "#67e8f9", 10, "Oswald", 2),
    ];
  }
  if (spec.targetView === "back") {
    return [
      textSeed("Top Statement", upperName, 50, 28, 86, 16, "#ffffff", 22, "Impact", 2),
      placeholderSeed("Back Artwork", "Your Design Here", 50, 52, 62, 32, 1),
      textSeed("Bottom Text", spec.category === "Memorial" ? "FOREVER IN OUR HEARTS" : spec.category === "Family Reunion" ? "EST. FAMILY LEGACY" : "CUSTOM BACK PRINT", 50, 74, 78, 11, "#67e8f9", 11, "Montserrat", 3),
    ];
  }
  if (spec.mode === "transfer") {
    if (spec.category === "Gang Sheets" || upperName.includes("SHEET")) {
      return [
        placeholderSeed("Artwork Slot 1", "Upload Art", 30, 28, 30, 18, 1),
        placeholderSeed("Artwork Slot 2", "Upload Art", 70, 28, 30, 18, 2),
        placeholderSeed("Artwork Slot 3", "Upload Art", 30, 57, 30, 18, 3),
        placeholderSeed("Artwork Slot 4", "Upload Art", 70, 57, 30, 18, 4),
        textSeed("Sheet Label", upperName, 50, 82, 82, 10, "#111827", 12, "Montserrat", 5),
      ];
    }
    if (spec.category === "Labels") {
      return [
        shapeSeed("Transfer Label", 50, 42, 78, 24, "#111827", 0.94, 0),
        textSeed("Label Text", upperName, 50, 42, 70, 12, "#ffffff", 14, "Montserrat", 2),
        textSeed("Small Detail", "WASH COLD / DTF", 50, 61, 70, 9, "#111827", 9, "Inter", 3),
      ];
    }
    return [
      placeholderSeed("Transfer Artwork", "Upload Logo", 50, 38, 54, 26, 1),
      textSeed("Transfer Text", upperName, 50, 62, 80, 14, "#111827", 18, spec.category === "Jerseys" ? "Impact" : "Montserrat", 2),
      textSeed("Detail Text", spec.category === "Jerseys" ? "NAME / NUMBER" : "READY TO PRESS", 50, 74, 66, 8, "#111827", 9, "Inter", 3),
    ];
  }

  const categoryText = spec.category === "Business" || spec.category === "Food / Restaurant" || spec.category === "Barber / Beauty"
    ? "LOCAL BUSINESS"
    : spec.category === "Church / Ministry"
      ? "SERVE TEAM"
      : spec.category === "School / Spirit" || spec.category === "Sports" || spec.category === "Jerseys"
        ? "TEAM SPIRIT"
        : spec.category === "Birthday"
          ? "CELEBRATION"
          : spec.category === "Memorial"
            ? "IN LOVING MEMORY"
            : "CUSTOM DESIGN";

  return [
    textSeed("Headline", upperName, 50, 32, 84, 16, "#ffffff", spec.category === "Jerseys" ? 26 : 20, spec.category === "Jerseys" ? "Impact" : "Montserrat", 2),
    placeholderSeed("Main Artwork", "Your Design Here", 50, 52, 54, 28, 1),
    textSeed("Support Text", categoryText, 50, 72, 76, 10, "#67e8f9", 10, "Inter", 3),
  ];
}

const PREMIUM_TEMPLATE_SPECS: TemplateSpec[] = [
  { name: "Premium Brand Logo", category: "Logos", mode: "apparel", targetView: "front", tags: ["brand", "logo", "premium"] },
  { name: "Minimal Chest Logo", category: "Logos", mode: "apparel", targetView: "front", tags: ["minimal", "chest", "logo"] },
  { name: "Oversized Streetwear Front", category: "Streetwear", mode: "apparel", targetView: "front", tags: ["oversized", "streetwear", "front"] },
  { name: "Vintage Wash Tee", category: "Streetwear", mode: "apparel", targetView: "front", tags: ["vintage", "wash", "tee"] },
  { name: "Back Neck Drop", category: "Streetwear", mode: "apparel", targetView: "back", tags: ["back", "neck", "drop"] },
  { name: "Left Chest + Back Print", category: "Streetwear", mode: "apparel", targetView: "back", tags: ["left chest", "back print", "streetwear"] },
  { name: "Construction Crew", category: "Business", mode: "apparel", targetView: "front", tags: ["construction", "crew", "business"] },
  { name: "Landscaping Business Tee", category: "Business", mode: "apparel", targetView: "front", tags: ["landscaping", "business", "tee"] },
  { name: "Cleaning Service Tee", category: "Business", mode: "apparel", targetView: "front", tags: ["cleaning", "service", "business"] },
  { name: "Barber Logo Tee", category: "Barber / Beauty", mode: "apparel", targetView: "front", tags: ["barber", "logo", "beauty"] },
  { name: "Beauty Salon Tee", category: "Barber / Beauty", mode: "apparel", targetView: "front", tags: ["beauty", "salon", "tee"] },
  { name: "Food Truck Promo", category: "Food / Restaurant", mode: "apparel", targetView: "front", tags: ["food truck", "promo", "restaurant"] },
  { name: "Restaurant Staff Tee", category: "Food / Restaurant", mode: "apparel", targetView: "front", tags: ["restaurant", "staff", "tee"] },
  { name: "Church Volunteer", category: "Church / Ministry", mode: "apparel", targetView: "front", tags: ["church", "volunteer", "ministry"] },
  { name: "Youth Ministry", category: "Church / Ministry", mode: "apparel", targetView: "front", tags: ["youth", "ministry", "church"] },
  { name: "School Spirit", category: "School / Spirit", mode: "apparel", targetView: "front", tags: ["school", "spirit", "team"] },
  { name: "Senior Class", category: "School / Spirit", mode: "apparel", targetView: "back", tags: ["senior", "class", "school"] },
  { name: "Football Team", category: "Sports", mode: "apparel", targetView: "front", tags: ["football", "team", "sports"] },
  { name: "Basketball Team", category: "Sports", mode: "apparel", targetView: "front", tags: ["basketball", "team", "sports"] },
  { name: "Baseball Jersey", category: "Jerseys", mode: "apparel", targetView: "front", tags: ["baseball", "jersey", "sports"] },
  { name: "Soccer Club", category: "Sports", mode: "apparel", targetView: "front", tags: ["soccer", "club", "sports"] },
  { name: "Birthday Squad", category: "Birthday", mode: "apparel", targetView: "front", tags: ["birthday", "squad", "party"] },
  { name: "Birthday Queen", category: "Birthday", mode: "apparel", targetView: "front", tags: ["birthday", "queen", "party"] },
  { name: "Family Reunion Classic", category: "Family Reunion", mode: "apparel", targetView: "front", tags: ["family", "reunion", "classic"] },
  { name: "Family Reunion Script", category: "Family Reunion", mode: "apparel", targetView: "front", tags: ["family", "reunion", "script"] },
  { name: "Memorial Wings", category: "Memorial", mode: "apparel", targetView: "front", tags: ["memorial", "wings", "portrait"] },
  { name: "Rest In Peace Portrait Placeholder", category: "Memorial", mode: "apparel", targetView: "front", tags: ["rest in peace", "portrait", "memorial"] },
  { name: "Car Club Tee", category: "Streetwear", mode: "apparel", targetView: "back", tags: ["car club", "automotive", "tee"] },
  { name: "Motorcycle Club Tee", category: "Streetwear", mode: "apparel", targetView: "back", tags: ["motorcycle", "club", "tee"] },
  { name: "Music Artist Merch", category: "Streetwear", mode: "apparel", targetView: "front", tags: ["music", "artist", "merch"] },
  { name: "DJ Event Tee", category: "Events", mode: "apparel", targetView: "front", tags: ["dj", "event", "music"] },
  { name: "Pop-Up Shop Tee", category: "Boutique", mode: "apparel", targetView: "front", tags: ["pop up", "shop", "boutique"] },
  { name: "Boutique Hang Tag", category: "Boutique", mode: "transfer", tags: ["boutique", "hang tag", "label"] },
  { name: "Neck Label Brand", category: "Labels", mode: "apparel", targetView: "neckTag", tags: ["neck label", "brand", "care"] },
  { name: "Sleeve Logo Mark", category: "Logos", mode: "apparel", targetView: "leftSleeve", tags: ["sleeve", "logo", "mark"] },
  { name: "Pocket Logo", category: "Logos", mode: "apparel", targetView: "front", tags: ["pocket", "left chest", "logo"] },
  { name: "Full Back Statement", category: "Streetwear", mode: "apparel", targetView: "back", tags: ["full back", "statement", "streetwear"] },
  { name: "Full Front Transfer", category: "Transfers", mode: "transfer", tags: ["full front", "transfer", "press"] },
  { name: "Small Chest Transfer", category: "Transfers", mode: "transfer", tags: ["small chest", "transfer", "logo"] },
  { name: "Gang Sheet Starter Premium", category: "Gang Sheets", mode: "transfer", tags: ["gang sheet", "starter", "multi"] },
  { name: "Sticker Sheet Layout", category: "Stickers", mode: "transfer", tags: ["sticker", "sheet", "layout"] },
  { name: "Product Label Sheet", category: "Labels", mode: "transfer", tags: ["product", "label", "sheet"] },
  { name: "DTF Care Label", category: "Labels", mode: "transfer", tags: ["dtf", "care", "label"] },
  { name: "Name Drop Transfer", category: "Transfers", mode: "transfer", tags: ["name", "drop", "transfer"] },
  { name: "Number Transfer", category: "Transfers", mode: "transfer", tags: ["number", "jersey", "transfer"] },
];

const PREMIUM_TEMPLATE_LIBRARY = PREMIUM_TEMPLATE_SPECS.map((spec) =>
  templateDefinition({
    id: slugify(spec.name),
    name: spec.name,
    category: spec.category,
    mode: spec.mode,
    targetView: spec.targetView,
    tags: spec.tags,
    description: `${spec.category} editable ${spec.mode} starter with replaceable artwork and live text layers.`,
    layers: createPremiumTemplateLayers(spec),
  })
);

const BASE_TEMPLATE_LIBRARY: StarterTemplateCard[] = [
  templateDefinition({ id: "centered-logo", name: "Centered Logo", category: "Logos", mode: "apparel", targetView: "front", description: "Simple logo and text layout.", layers: [
    { type: "placeholder", name: "Upload Logo", text: "Upload Logo", x: 50, y: 42, width: 48, height: 28, color: "#0f172a" },
    { type: "text", name: "Main Text", text: "YOUR LOGO", x: 50, y: 65, width: 62, height: 13, color: "#e5faff", fontSize: 18, fontFamily: "Montserrat" },
  ] }),
  templateDefinition({ id: "full-chest", name: "Full Chest", category: "Streetwear", mode: "apparel", targetView: "front", description: "Large apparel print with logo placeholder.", layers: [
    { type: "placeholder", name: "Upload Logo", text: "Upload Logo", x: 50, y: 42, width: 58, height: 30, color: "#0f172a" },
    { type: "text", name: "Main Text", text: "YOUR BRAND", x: 50, y: 66, width: 70, height: 14, color: "#e5faff", fontSize: 18, fontFamily: "Montserrat" },
  ] }),
  templateDefinition({ id: "back-statement", name: "Back Statement", category: "Streetwear", mode: "apparel", targetView: "back", description: "Bold back print with editable headline.", layers: [
    { type: "text", name: "Main Text", text: "MAKE A STATEMENT", x: 50, y: 34, width: 82, height: 18, color: "#ffffff", fontSize: 23, fontFamily: "Impact" },
    { type: "placeholder", name: "Your Design Here", text: "Your Design Here", x: 50, y: 58, width: 62, height: 28, color: "#0f172a" },
  ] }),
  templateDefinition({ id: "sleeve-mark", name: "Sleeve Mark", category: "Streetwear", mode: "apparel", targetView: "leftSleeve", description: "Compact sleeve badge layout.", layers: [
    { type: "placeholder", name: "Upload Logo", text: "Upload Logo", x: 50, y: 42, width: 70, height: 32, color: "#0f172a" },
    { type: "text", name: "Sleeve Text", text: "EST. 2026", x: 50, y: 68, width: 76, height: 12, color: "#67e8f9", fontSize: 12 },
  ] }),
  templateDefinition({ id: "neck-label", name: "Neck Label", category: "Labels", mode: "apparel", targetView: "neckTag", description: "Brand and size tag layout.", layers: [
    { type: "shape", name: "Background Badge", x: 50, y: 50, width: 82, height: 56, color: "#111827", opacity: 0.92 },
    { type: "text", name: "Brand Text", text: "YOUR BRAND", x: 50, y: 45, width: 74, height: 16, color: "#ffffff", fontSize: 12 },
    { type: "text", name: "Size Text", text: "SIZE L", x: 50, y: 61, width: 54, height: 12, color: "#67e8f9", fontSize: 9 },
  ] }),
  templateDefinition({ id: "logo-transfer", name: "Logo Transfer", category: "Transfers", mode: "transfer", description: "Logo-first transfer sheet.", layers: [
    { type: "placeholder", name: "Upload Logo", text: "Upload Logo", x: 50, y: 42, width: 54, height: 28, color: "#0f172a" },
    { type: "text", name: "Main Text", text: "CUSTOM TRANSFER", x: 50, y: 68, width: 70, height: 14, color: "#111827", fontSize: 18 },
  ] }),
  templateDefinition({ id: "text-transfer", name: "Text Transfer", category: "Transfers", mode: "transfer", description: "Editable text transfer layout.", layers: [
    { type: "text", name: "Main Text", text: "YOUR TEXT", x: 50, y: 45, width: 78, height: 22, color: "#071015", fontSize: 34, fontFamily: "Impact" },
    { type: "shape", name: "Accent Shape", x: 50, y: 63, width: 70, height: 8, color: "#22d3ee", opacity: 0.75 },
  ] }),
  templateDefinition({ id: "sticker-sheet", name: "Sticker Sheet", category: "Stickers", mode: "transfer", description: "Multiple editable sticker slots.", layers: [
    { type: "placeholder", name: "Sticker 1", text: "Your Design Here", x: 32, y: 34, width: 34, height: 22, color: "#0f172a" },
    { type: "placeholder", name: "Sticker 2", text: "Your Design Here", x: 68, y: 34, width: 34, height: 22, color: "#0f172a" },
    { type: "placeholder", name: "Sticker 3", text: "Your Design Here", x: 50, y: 64, width: 42, height: 24, color: "#0f172a" },
  ] }),
  templateDefinition({ id: "jersey-name-number", name: "Jersey Name/Number", category: "Jerseys", mode: "both", description: "Name and number design starter.", layers: [
    { type: "text", name: "Player Name", text: "NAME", x: 50, y: 26, width: 78, height: 15, color: "#111827", fontSize: 28, fontFamily: "Oswald" },
    { type: "text", name: "Number", text: "23", x: 50, y: 58, width: 60, height: 42, color: "#111827", fontSize: 58, fontFamily: "Impact" },
  ] }),
  templateDefinition({ id: "gang-sheet-starter", name: "Gang Sheet Starter", category: "Gang Sheets", mode: "transfer", description: "Multi-artwork gang sheet starter.", layers: [
    { type: "placeholder", name: "Logo Slot", text: "Upload Logo", x: 33, y: 28, width: 30, height: 18, color: "#0f172a" },
    { type: "placeholder", name: "Artwork Slot", text: "Your Design Here", x: 67, y: 28, width: 30, height: 18, color: "#0f172a" },
    { type: "text", name: "Label Text", text: "BRAND LABEL", x: 50, y: 62, width: 74, height: 16, color: "#111827", fontSize: 20 },
  ] }),
  templateDefinition({ id: "brand-label", name: "Brand Label", category: "Labels", mode: "transfer", description: "Small brand label layout.", layers: [
    { type: "shape", name: "Background Badge", x: 50, y: 50, width: 76, height: 42, color: "#111827", opacity: 0.92 },
    { type: "text", name: "Brand Text", text: "YOUR BRAND", x: 50, y: 48, width: 64, height: 16, color: "#ffffff", fontSize: 22, fontFamily: "Montserrat" },
    { type: "text", name: "Care Text", text: "DTF TRANSFER", x: 50, y: 62, width: 54, height: 10, color: "#67e8f9", fontSize: 10 },
  ] }),
  templateDefinition({ id: "boutique-logo", name: "Boutique Logo", category: "Business", mode: "both", description: "Clean boutique brand lockup.", layers: [
    { type: "shape", name: "Accent Shape", x: 50, y: 45, width: 64, height: 30, color: "#e5faff", opacity: 0.9 },
    { type: "text", name: "Brand Text", text: "BOUTIQUE", x: 50, y: 45, width: 58, height: 14, color: "#071015", fontSize: 21, fontFamily: "Montserrat" },
    { type: "text", name: "Tagline", text: "EST. 2026", x: 50, y: 61, width: 48, height: 10, color: "#67e8f9", fontSize: 10 },
  ] }),
  templateDefinition({ id: "barber-shop-badge", name: "Barber Shop Badge", category: "Business", mode: "both", description: "Badge layout for local brands.", layers: [
    { type: "shape", name: "Background Badge", x: 50, y: 50, width: 62, height: 46, color: "#111827", opacity: 0.94 },
    { type: "text", name: "Main Text", text: "BARBER SHOP", x: 50, y: 48, width: 56, height: 15, color: "#ffffff", fontSize: 18, fontFamily: "Oswald" },
    { type: "text", name: "Small Text", text: "PREMIUM CUTS", x: 50, y: 63, width: 48, height: 8, color: "#67e8f9", fontSize: 8 },
  ] }),
  templateDefinition({ id: "food-truck-tee", name: "Food Truck Tee", category: "Business", mode: "apparel", targetView: "front", description: "Menu-inspired shirt starter.", layers: [
    { type: "text", name: "Main Text", text: "FOOD TRUCK", x: 50, y: 36, width: 70, height: 16, color: "#ffffff", fontSize: 22, fontFamily: "Impact" },
    { type: "placeholder", name: "Upload Logo", text: "Upload Logo", x: 50, y: 55, width: 48, height: 24, color: "#0f172a" },
    { type: "text", name: "Menu Text", text: "LOCAL FAVORITE", x: 50, y: 72, width: 64, height: 10, color: "#67e8f9", fontSize: 10 },
  ] }),
  templateDefinition({ id: "event-staff", name: "Event Staff", category: "Events", mode: "apparel", targetView: "front", description: "Staff shirt with editable role text.", layers: [
    { type: "text", name: "Role Text", text: "STAFF", x: 50, y: 43, width: 78, height: 28, color: "#ffffff", fontSize: 42, fontFamily: "Impact" },
    { type: "text", name: "Event Text", text: "EVENT TEAM", x: 50, y: 64, width: 70, height: 12, color: "#67e8f9", fontSize: 14 },
  ] }),
  templateDefinition({ id: "birthday-crew", name: "Birthday Crew", category: "Events", mode: "apparel", targetView: "front", description: "Celebration layout with name text.", layers: [
    { type: "text", name: "Main Text", text: "BIRTHDAY CREW", x: 50, y: 42, width: 80, height: 18, color: "#ffffff", fontSize: 22, fontFamily: "Montserrat" },
    { type: "placeholder", name: "Photo Slot", text: "Your Design Here", x: 50, y: 60, width: 46, height: 24, color: "#0f172a" },
  ] }),
  templateDefinition({ id: "family-reunion-crest", name: "Family Reunion Crest", category: "Family Reunion", mode: "apparel", targetView: "front", description: "Family crest and year layout.", layers: [
    { type: "placeholder", name: "Family Crest", text: "Upload Crest", x: 50, y: 43, width: 52, height: 30, color: "#0f172a" },
    { type: "text", name: "Family Text", text: "FAMILY REUNION", x: 50, y: 67, width: 78, height: 14, color: "#e5faff", fontSize: 17 },
  ] }),
  templateDefinition({ id: "memorial-shirt", name: "Memorial Shirt", category: "Family Reunion", mode: "apparel", targetView: "front", description: "Respectful photo/logo placeholder layout.", layers: [
    { type: "placeholder", name: "Photo Placeholder", text: "Upload Photo", x: 50, y: 42, width: 46, height: 32, color: "#0f172a" },
    { type: "text", name: "Name Text", text: "IN LOVING MEMORY", x: 50, y: 67, width: 74, height: 13, color: "#ffffff", fontSize: 15 },
  ] }),
  templateDefinition({ id: "mascot-jersey", name: "Mascot Jersey", category: "Jerseys", mode: "apparel", targetView: "front", description: "Team mascot and number layout.", layers: [
    { type: "placeholder", name: "Mascot Logo", text: "Upload Mascot", x: 50, y: 36, width: 44, height: 22, color: "#0f172a" },
    { type: "text", name: "Number", text: "23", x: 50, y: 62, width: 52, height: 38, color: "#ffffff", fontSize: 54, fontFamily: "Impact" },
  ] }),
  templateDefinition({ id: "varsity-transfer-pack", name: "Varsity Transfer Pack", category: "Jerseys", mode: "transfer", description: "Numbers and name sheet.", layers: [
    { type: "text", name: "Player Name", text: "PLAYER", x: 50, y: 28, width: 76, height: 16, color: "#111827", fontSize: 26, fontFamily: "Oswald" },
    { type: "text", name: "Number", text: "23", x: 50, y: 58, width: 62, height: 42, color: "#111827", fontSize: 58, fontFamily: "Impact" },
  ] }),
  templateDefinition({ id: "streetwear-drop", name: "Streetwear Drop", category: "Streetwear", mode: "apparel", targetView: "front", description: "Bold brand drop composition.", layers: [
    { type: "text", name: "Top Text", text: "LIMITED DROP", x: 50, y: 33, width: 76, height: 14, color: "#67e8f9", fontSize: 16 },
    { type: "placeholder", name: "Main Artwork", text: "Your Design Here", x: 50, y: 54, width: 62, height: 28, color: "#0f172a" },
    { type: "text", name: "Bottom Text", text: "DTF COLLECTION", x: 50, y: 72, width: 70, height: 10, color: "#ffffff", fontSize: 10 },
  ] }),
  templateDefinition({ id: "logo-sticker-pack", name: "Logo Sticker Pack", category: "Stickers", mode: "transfer", description: "Repeat logo sticker placements.", layers: [
    { type: "placeholder", name: "Sticker Logo 1", text: "Logo", x: 30, y: 35, width: 30, height: 20, color: "#0f172a" },
    { type: "placeholder", name: "Sticker Logo 2", text: "Logo", x: 70, y: 35, width: 30, height: 20, color: "#0f172a" },
    { type: "placeholder", name: "Sticker Logo 3", text: "Logo", x: 50, y: 64, width: 36, height: 22, color: "#0f172a" },
  ] }),
  templateDefinition({ id: "care-label-set", name: "Care Label Set", category: "Labels", mode: "transfer", description: "Label pack for apparel brands.", layers: [
    { type: "shape", name: "Label Block", x: 50, y: 44, width: 72, height: 28, color: "#111827", opacity: 0.92 },
    { type: "text", name: "Care Text", text: "WASH COLD", x: 50, y: 44, width: 60, height: 12, color: "#ffffff", fontSize: 15 },
    { type: "text", name: "Brand Text", text: "YOUR BRAND", x: 50, y: 61, width: 58, height: 10, color: "#111827", fontSize: 10 },
  ] }),
  templateDefinition({ id: "small-business-pack", name: "Small Business Pack", category: "Business", mode: "transfer", description: "Logo plus contact transfer starter.", layers: [
    { type: "placeholder", name: "Business Logo", text: "Upload Logo", x: 50, y: 36, width: 48, height: 24, color: "#0f172a" },
    { type: "text", name: "Business Name", text: "SMALL BUSINESS", x: 50, y: 60, width: 72, height: 14, color: "#111827", fontSize: 18 },
    { type: "text", name: "Contact Text", text: "@YOURHANDLE", x: 50, y: 72, width: 60, height: 9, color: "#111827", fontSize: 9 },
  ] }),
];

const STARTER_TEMPLATE_LIBRARY: StarterTemplateCard[] = [...BASE_TEMPLATE_LIBRARY, ...PREMIUM_TEMPLATE_LIBRARY];
const STAGING_CUSTOMIZER_CONFIG_STORAGE_KEY = "dtf-staging-customizer-config";
const SAFE_TRANSFER_SIZE = "3x3";

const emptyArtworkByView: Record<ViewId, ArtworkState | null> = {
  front: null,
  back: null,
  leftSleeve: null,
  rightSleeve: null,
  neckTag: null,
};

const emptyLayersByView: Record<ViewId, EditableTemplateLayer[]> = {
  front: [],
  back: [],
  leftSleeve: [],
  rightSleeve: [],
  neckTag: [],
};

const emptyTransferLayersBySize = TRANSFER_SIZES.reduce<Record<string, EditableTemplateLayer[]>>((sizes, size) => {
  sizes[size] = [];
  return sizes;
}, {});

const initialState: EditorState = {
  mode: "apparel",
  activeView: "front",
  transferSize: SAFE_TRANSFER_SIZE,
  artworkByView: emptyArtworkByView,
  transferArtwork: null,
  zoom: 108,
  rotation: 0,
  scale: 56,
  x: 50,
  y: 45,
  selectedTemplate: "Centered Logo",
  layersByView: emptyLayersByView,
  transferLayersBySize: emptyTransferLayersBySize,
  selectedLayerId: null,
  selectedColorId: "black",
  selectedColorHex: "#101316",
  status: "Prototype ready. No live checkout connection.",
  usingSafeDefaults: false,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value: number, min: number, max: number, fallback: number) {
  return Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

function createLayerId(template: string, index: number) {
  return `${template.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}-${index}`;
}

function layerDefaults(layer: Partial<EditableTemplateLayer>): EditableTemplateLayer {
  const font = layer.fontId ? getFontById(layer.fontId) : getFontByFamily(layer.fontFamily);
  return {
    id: layer.id || createLayerId(layer.name || "layer", 0),
    type: layer.type || "text",
    name: layer.name || "Design Layer",
    text: layer.text,
    sourceUrl: layer.sourceUrl,
    sourceName: layer.sourceName,
    x: layer.x ?? 50,
    y: layer.y ?? 50,
    width: layer.width ?? 50,
    height: layer.height ?? 20,
    rotation: layer.rotation ?? 0,
    opacity: layer.opacity ?? 1,
    color: layer.color || "#67e8f9",
    fontId: font.id,
    fontFamily: font.cssFontFamily,
    fontSize: layer.fontSize ?? 28,
    fitMode: layer.fitMode || (layer.type === "image" ? "contain" : undefined),
    cropX: layer.cropX ?? 50,
    cropY: layer.cropY ?? 50,
    cropZoom: layer.cropZoom ?? 100,
    lockAspectRatio: layer.lockAspectRatio ?? true,
    locked: layer.locked ?? false,
    hidden: layer.hidden ?? false,
    zIndex: layer.zIndex ?? 0,
  };
}

function findTemplate(templateIdOrName: string, mode: PreviewMode, library: StarterTemplateCard[] = STARTER_TEMPLATE_LIBRARY) {
  const modeMatch = library.find(
    (template) =>
      (template.id === templateIdOrName || template.name === templateIdOrName) &&
      (template.mode === mode || template.mode === "both")
  );
  return modeMatch || library.find((template) => template.id === templateIdOrName || template.name === templateIdOrName);
}

function createTemplateLayers(templateIdOrName: string, mode: PreviewMode, library: StarterTemplateCard[] = STARTER_TEMPLATE_LIBRARY): EditableTemplateLayer[] {
  const template = findTemplate(templateIdOrName, mode, library) || findTemplate(mode === "transfer" ? "logo-transfer" : "centered-logo", mode, library);
  const templateKey = template?.id || templateIdOrName;
  const layers = template?.layers || [];

  return layers.map((layer, index) => layerDefaults({ ...layer, id: createLayerId(templateKey, index), zIndex: layer.zIndex ?? index }));
}

function getRecommendedViewForTemplate(template: string, currentView: ViewId, library: StarterTemplateCard[] = STARTER_TEMPLATE_LIBRARY): ViewId {
  const templateConfig = library.find((item) => item.id === template || item.name === template);
  if (templateConfig?.targetView) return templateConfig.targetView;
  return currentView;
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getUploadStatusClass(status: StagingUploadStatus | StagingSaveStatus) {
  if (status === "success") return "border-emerald-400/50 bg-emerald-950/40 text-emerald-200";
  if (status === "warning") return "border-yellow-400/50 bg-yellow-950/40 text-yellow-100";
  if (status === "error") return "border-red-400/50 bg-red-950/40 text-red-100";
  if (status === "uploading" || status === "saving") return "border-cyan-400/50 bg-cyan-950/40 text-cyan-100";
  return "border-[#2c424a] bg-[#081114] text-neutral-300";
}

function getAssetStatusClass(status: string) {
  if (status === "ready") return "text-emerald-300";
  if (status === "pending" || status === "uploading" || status === "saving") return "text-cyan-200";
  if (status === "future") return "text-neutral-400";
  return "text-yellow-200";
}

function getMockupColorKey(hexOrLabel: string): MockupColorKey {
  const normalized = hexOrLabel.trim().toLowerCase();
  if (
    normalized.includes("off white") ||
    normalized.includes("off-white") ||
    normalized === "#f5f1e8"
  ) return "offWhite";
  if (
    normalized.includes("royal") ||
    normalized.includes("blue") ||
    normalized === "#075985"
  ) return "royalBlue";
  if (
    normalized.includes("red") ||
    normalized === "#991b1b"
  ) return "red";
  if (
    normalized.includes("regular grey") ||
    normalized.includes("regular gray") ||
    normalized === "#64748b"
  ) return "regularGrey";
  if (
    normalized.includes("white") ||
    normalized === "#fff" ||
    normalized === "#ffffff" ||
    normalized === "#f8fafc" ||
    normalized === "#f4f7fb"
  ) return "white";
  if (
    normalized.includes("heather") ||
    normalized.includes("gray") ||
    normalized.includes("grey") ||
    normalized === "#334155" ||
    normalized === "#9ca3af"
  ) return "heatherGrey";
  return "black";
}

function normalizePreviewColorOption(color: { id?: string; label?: string; hex?: string; enabled?: boolean; mockupUrl?: string }): PreviewColorOption | null {
  if (color.enabled === false || !color.hex) return null;
  const label = color.label || color.id || color.hex;
  return {
    id: color.id || label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label,
    hex: color.hex,
    mockupKey: getMockupColorKey(`${label} ${color.hex}`),
    mockupUrl: color.mockupUrl,
  };
}

function getApparelMockupForColor(mockupKey: MockupColorKey, view: ViewId, overrides: ApparelMockupOverrides = {}) {
  return (
    overrides[mockupKey]?.[view] ||
    STAGING_APPAREL_MOCKUPS[mockupKey]?.[view] ||
    STAGING_APPAREL_MOCKUPS.black?.[view] ||
    { label: "Generated apparel staging mockup", url: createMockupSvg("Generated apparel staging mockup", view === "neckTag" ? "neck" : view.includes("Sleeve") ? "sleeve" : view === "back" ? "back" : "front") }
  );
}

function getTemplateCardImage(template: StarterTemplateCard, brokenPreviewImages: string[]) {
  const hostedThumbnail = template.thumbnailUrl || template.previewImage;
  return hostedThumbnail && !brokenPreviewImages.includes(hostedThumbnail)
    ? hostedThumbnail
    : template.thumbnail;
}

function getCurrentArtwork(state: EditorState) {
  return state.mode === "apparel" ? state.artworkByView[state.activeView] : state.transferArtwork;
}

function getActiveLayers(state: EditorState) {
  if (state.mode === "apparel") return state.layersByView[state.activeView] || [];
  return state.transferLayersBySize[getSafeTransferSize(state.transferSize)] || [];
}

function mapLayerToPayloadLayer(
  layer: EditableTemplateLayer,
  state: EditorState,
  safeTransferSize: string,
  hostedArtworkUrl: string
) {
  const safeSourceUrl = layer.sourceUrl?.startsWith("blob:") ? hostedArtworkUrl || undefined : layer.sourceUrl;

  return {
    id: layer.id,
    type: layer.type,
    label: layer.name,
    visible: !layer.hidden,
    locked: layer.locked,
    sourceUrl: safeSourceUrl,
    text: layer.text,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
    opacity: layer.opacity,
    fontId: layer.fontId,
    fontFamily: layer.fontFamily,
    fitMode: layer.fitMode,
    cropX: layer.cropX,
    cropY: layer.cropY,
    cropZoom: layer.cropZoom,
    lockAspectRatio: layer.lockAspectRatio,
    zIndex: layer.zIndex,
    printLocationId: state.mode === "apparel" ? state.activeView : undefined,
    transferSizeId: state.mode === "transfer" ? safeTransferSize : undefined,
    qualityStatus: "good_quality",
  };
}

function getCanvasLabel(state: EditorState) {
  if (state.mode === "transfer") return getSafeTransferSize(state.transferSize);
  return APPAREL_VIEWS.find((view) => view.id === state.activeView)?.label || "Front";
}

function getTransferSizeLabel(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const candidate = value as { label?: unknown; id?: unknown };
  const label = typeof candidate.label === "string" ? candidate.label : "";
  const id = typeof candidate.id === "string" ? candidate.id : "";
  if (label.toLowerCase().includes("gang")) return "Gang Sheet";
  return id && TRANSFER_SIZES.includes(id) ? id : TRANSFER_SIZES.includes(label.replace(/\s+x\s+/i, "x")) ? label.replace(/\s+x\s+/i, "x") : "";
}

function getConfiguredTransferSizeLabel(config: StagingCustomizerConfig | null, value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = normalizeTransferSizeId(value);
  const configured = getConfiguredTransferSizes(config);
  return configured.find((size) => size.id === normalized || size.label === normalized)?.label || "";
}

function resolvePreviewModeFromConfigType(type: unknown): PreviewMode {
  if (type === "apparel_customizer") return "apparel";
  if (type === "dtf_transfer_by_size" || type === "gang_sheet_size_variant" || type === "upload_only_transfer") return "transfer";
  return "apparel";
}

function getSafeTransferSize(value: unknown) {
  return typeof value === "string" && TRANSFER_SIZES.includes(value) ? value : SAFE_TRANSFER_SIZE;
}

function formatInches(value: number) {
  return `${value.toFixed(value >= 10 ? 1 : 2).replace(/\.0$/, "")} in`;
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeTransferSizeId(value: string) {
  if (value.toLowerCase().includes("gang")) return "Gang Sheet";
  return value.replace(/\s+/g, "").replace(/X/g, "x");
}

function getConfiguredTransferSizes(config: StagingCustomizerConfig | null) {
  const configured = config?.transferSizes
    ?.filter((size) => size.enabled !== false && Number.isFinite(size.width) && Number.isFinite(size.height))
    .map((size) => ({
      ...size,
      id: normalizeTransferSizeId(size.isGangSheet ? "Gang Sheet" : size.id || size.label || SAFE_TRANSFER_SIZE),
      label: normalizeTransferSizeId(size.isGangSheet ? "Gang Sheet" : size.id || size.label || SAFE_TRANSFER_SIZE),
    }));

  return configured?.length ? configured : TRANSFER_SIZES.map((size) => {
    if (size === "Gang Sheet") return { id: size, label: size, width: 22, height: 60, enabled: true, isGangSheet: true };
    const [width, height] = size.split("x").map(Number);
    return { id: size, label: size, width, height, enabled: true };
  });
}

function getActivePrintLocation(config: StagingCustomizerConfig | null, view: ViewId) {
  return config?.printLocations?.find((location) => location.id === view && location.enabled !== false) || null;
}

const FRONT_ALIGNED_PRINT_AREA: StagingPrintArea = { x: 50, y: 50.5, width: 38, height: 61 };

function getDefaultPrintAreaForView(state: EditorState): StagingPrintArea {
  if (state.mode === "transfer") return { x: 50, y: 50, width: 44, height: 66 };

  const defaults: Record<ViewId, StagingPrintArea> = {
    front: FRONT_ALIGNED_PRINT_AREA,
    back: { x: 49, y: 48.5, width: 48, height: 59 },
    leftSleeve: { x: 51, y: 50, width: 30, height: 42 },
    rightSleeve: { x: 49, y: 50, width: 30, height: 42 },
    neckTag: { x: 50, y: 43, width: 28, height: 17 },
  };

  return defaults[state.activeView];
}

function getFrontAlignedPrintArea(area: StagingPrintArea) {
  const isLegacyFrontArea = area.x === 50 && area.y === 56 && area.width === 38 && area.height === 50;
  return isLegacyFrontArea ? FRONT_ALIGNED_PRINT_AREA : area;
}

function getSafePrintArea(config: StagingCustomizerConfig | null, state: EditorState) {
  const location = state.mode === "apparel" ? getActivePrintLocation(config, state.activeView) : null;
  const area = location?.printArea;
  const fallback = getDefaultPrintAreaForView(state);

  if (!area) return { area: fallback, usingFallback: false };

  const width = safeNumber(area.width, 6, state.mode === "apparel" && state.activeView === "neckTag" ? 34 : 94, fallback.width);
  const height = safeNumber(area.height, 6, state.mode === "apparel" && state.activeView === "neckTag" ? 24 : 94, fallback.height);
  const x = safeNumber(area.x, width / 2, 100 - width / 2, fallback.x);
  const y = safeNumber(area.y, height / 2, 100 - height / 2, fallback.y);
  const invalid = x !== area.x || y !== area.y || width !== area.width || height !== area.height;

  const safeArea = { x, y, width, height };
  return { area: state.mode === "apparel" && state.activeView === "front" ? getFrontAlignedPrintArea(safeArea) : safeArea, usingFallback: invalid };
}

function getPrintAreaStyle(area: StagingPrintArea) {
  return {
    left: `${area.x}%`,
    top: `${area.y}%`,
    width: `${area.width}%`,
    height: `${area.height}%`,
  };
}

function getLayerAspectRatio(layer: EditableTemplateLayer | null) {
  if (!layer || !Number.isFinite(layer.width) || !Number.isFinite(layer.height) || layer.height <= 0) return 1;
  return layer.width / layer.height;
}

function getProportionalFitSize(layer: EditableTemplateLayer | null) {
  const aspectRatio = getLayerAspectRatio(layer);
  const maxWidth = 100;
  const maxHeight = 100;
  if (aspectRatio >= 1) {
    return { width: maxWidth, height: clamp(maxWidth / aspectRatio, 6, maxHeight) };
  }
  return { width: clamp(maxHeight * aspectRatio, 6, maxWidth), height: maxHeight };
}

function getProportionalScaleSize(layer: EditableTemplateLayer, nextScale: number) {
  const width = safeNumber(layer.width, 1, 100, 54);
  const height = safeNumber(layer.height, 1, 100, 32);
  const currentLongEdge = Math.max(width, height, 1);
  const factor = nextScale / currentLongEdge;
  return {
    width: clamp(width * factor, 1, 100),
    height: clamp(height * factor, 1, 100),
  };
}

function getTextScaleUpdate(layer: EditableTemplateLayer, previousScale: number, nextScale: number) {
  const width = safeNumber(layer.width, 1, 100, 54);
  const height = safeNumber(layer.height, 1, 100, 14);
  const fontSize = safeNumber(layer.fontSize, 8, 120, 24);
  const factor = nextScale / Math.max(previousScale, 1);
  const nextFontSize = clamp(Math.round(fontSize * factor), 8, 120);
  const nextHeight = clamp(Math.max(height * factor, nextFontSize / 1.5), 4, 100);

  return {
    width: clamp(width * factor, 4, 100),
    height: nextHeight,
    fontSize: nextFontSize,
  };
}

function clampLayerInsidePrintArea(layer: EditableTemplateLayer) {
  const width = safeNumber(layer.width, 1, 100, 54);
  const height = safeNumber(layer.height, 1, 100, 32);
  return {
    ...layer,
    width,
    height,
    x: safeNumber(layer.x, width / 2, 100 - width / 2, 50),
    y: safeNumber(layer.y, height / 2, 100 - height / 2, 50),
  };
}

function getLayerCenterBounds(layer: EditableTemplateLayer | null) {
  const width = safeNumber(layer?.width ?? 54, 1, 100, 54);
  const height = safeNumber(layer?.height ?? 32, 1, 100, 32);

  return {
    minX: width / 2,
    maxX: 100 - width / 2,
    minY: height / 2,
    maxY: 100 - height / 2,
  };
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-cyan-300 bg-cyan-300 text-neutral-950"
          : "border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-cyan-400"
      }`}
    >
      {children}
    </button>
  );
}

function QuickActionCard({
  title,
  detail,
  icon,
  accent,
  onClick,
  children,
}: {
  title: string;
  detail: string;
  icon: string;
  accent: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-[58px] rounded-lg border border-[#2e454f] bg-[linear-gradient(135deg,#101b20_0%,#071015_58%,#12242b_100%)] p-2 text-left shadow-[0_14px_34px_rgba(0,0,0,0.24)] transition hover:border-cyan-300/90 hover:bg-[#101c20]"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 text-[10px] font-black text-cyan-100">
          {icon}
        </span>
        <span className={`block h-1 w-10 rounded-full ${accent}`} />
      </span>
      <span className="mt-1 block text-sm font-semibold leading-4 text-white">{title}</span>
      <span className="mt-0.5 block text-xs leading-4 text-neutral-400">{detail}</span>
      {children}
    </button>
  );
}

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#223037] bg-[#0d1316] p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-300">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function ToolButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-[#2c424a] bg-[#081114] px-2.5 py-1.5 text-left text-xs font-semibold text-neutral-200 transition hover:border-cyan-400 hover:text-cyan-100"
    >
      {label}
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const displayValue = Number.isFinite(value) ? Math.round(value) : value;

  return (
    <label className="block min-h-[44px]">
      <span className="grid grid-cols-[minmax(0,1fr)_3.25rem] items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        <span className="min-w-0 truncate">{label}</span>
        <span className="inline-flex h-5 min-w-[3.25rem] justify-end text-right tabular-nums text-neutral-300">
          {displayValue}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 block h-5 w-full accent-cyan-300"
      />
    </label>
  );
}

export default function CustomizerPrototype() {
  const [state, setState] = useState<EditorState>(initialState);
  const [mobilePanel, setMobilePanel] = useState<PanelTab>("tools");
  const [isSaving, setIsSaving] = useState(false);
  const [isCarting, setIsCarting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPreviewOrderOpen, setIsPreviewOrderOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [stagingUploadStatus, setStagingUploadStatus] = useState<StagingUploadStatus>("idle");
  const [stagingUploadResult, setStagingUploadResult] = useState<StagingUploadResult | null>(null);
  const [stagingSaveStatus, setStagingSaveStatus] = useState<StagingSaveStatus>("idle");
  const [stagingSaveResult, setStagingSaveResult] = useState<StagingSaveResult | null>(null);
  const [designJsonStatus, setDesignJsonStatus] = useState<StagingUploadStatus>("idle");
  const [designJsonResult, setDesignJsonResult] = useState<StagingGeneratedAssetResult | null>(null);
  const [previewImageStatus, setPreviewImageStatus] = useState<StagingUploadStatus>("idle");
  const [previewImageResult, setPreviewImageResult] = useState<StagingGeneratedAssetResult | null>(null);
  const [fabricBlendEnabled, setFabricBlendEnabled] = useState(false);
  const [mockupBlendMode, setMockupBlendMode] = useState<MockupBlendMode>("multiply");
  const [artworkOpacity, setArtworkOpacity] = useState(95);
  const [textureOverlayEnabled, setTextureOverlayEnabled] = useState(true);
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [activeTemplateCategory, setActiveTemplateCategory] = useState<TemplateCategory | "All">("All");
  const [brokenTemplatePreviewImages, setBrokenTemplatePreviewImages] = useState<string[]>([]);
  const [templateDraft, setTemplateDraft] = useState<TemplateDraftState | null>(null);
  const [adminTemplateLibrary, setAdminTemplateLibrary] = useState<StarterTemplateCard[]>([]);
  const [adminMockupOverrides, setAdminMockupOverrides] = useState<ApparelMockupOverrides>({});
  const [stagingConfig, setStagingConfig] = useState<StagingCustomizerConfig | null>(null);
  const [stagingConfigWarning, setStagingConfigWarning] = useState("");
  const [brokenMockupUrls, setBrokenMockupUrls] = useState<string[]>([]);
  const currentArtwork = getCurrentArtwork(state);
  const currentStagingUploadResult =
    currentArtwork && stagingUploadResult?.artworkName === currentArtwork.name ? stagingUploadResult : null;
  const hostedArtworkUrl = currentStagingUploadResult?.asset?.url?.startsWith("http")
    ? currentStagingUploadResult.asset.url
    : "";
  const hostedArtworkStatus = hostedArtworkUrl ? "ready" : "missing";
  const hostedDesignJsonUrl = designJsonResult?.asset?.url?.startsWith("http") ? designJsonResult.asset.url : "";
  const hostedPreviewImageUrl = previewImageResult?.asset?.url?.startsWith("http") ? previewImageResult.asset.url : "";
  const hostedDesignJsonStatus = hostedDesignJsonUrl ? "ready" : designJsonStatus === "uploading" ? "pending" : "missing";
  const hostedPreviewImageStatus = hostedPreviewImageUrl ? "ready" : previewImageStatus === "uploading" ? "pending" : "missing";
  const safeTransferSize = getSafeTransferSize(state.transferSize);
  const configuredTransferSizes = getConfiguredTransferSizes(stagingConfig);
  const selectedTransferConfig = configuredTransferSizes.find((size) => size.id === safeTransferSize) || configuredTransferSizes[0];
  const configuredColors =
    stagingConfig?.colors
      ?.map(normalizePreviewColorOption)
      .filter((color): color is PreviewColorOption => Boolean(color)) || DEFAULT_PRODUCT_COLORS;
  const selectedColor =
    configuredColors.find((color) => color.id === state.selectedColorId) ||
    configuredColors.find((color) => color.hex.toLowerCase() === state.selectedColorHex.toLowerCase()) ||
    configuredColors[0] ||
    DEFAULT_PRODUCT_COLORS[0];
  const printAreaGuideColor = state.mode === "apparel" ? selectedColor.hex : "#67e8f9";
  const selectedMockupColorKey = selectedColor.mockupKey;
  const configuredMaterials = stagingConfig?.materialOptions?.filter((material) => material.enabled !== false).map((material) => material.label || material.id || "Material") || MATERIAL_OPTIONS;
  const templateSettings = stagingConfig?.stagingSettings?.templateSettings;
  const enabledTemplateCategories = templateSettings?.enabledCategories?.length ? templateSettings.enabledCategories : TEMPLATE_CATEGORIES;
  const templateLibrary = adminTemplateLibrary.length ? adminTemplateLibrary : STARTER_TEMPLATE_LIBRARY;
  const printAreaResult = getSafePrintArea(stagingConfig, state);
  const activePrintLocation = state.mode === "apparel" ? getActivePrintLocation(stagingConfig, state.activeView) : null;
  const activeMockupUrl =
    state.mode === "apparel"
      ? ""
      : safeTransferSize === "Gang Sheet"
        ? stagingConfig?.stagingSettings?.gangSheetMockupUrl || stagingConfig?.stagingSettings?.transferMockupUrl
        : stagingConfig?.stagingSettings?.transferMockupUrl;
  const safeMockupUrl = activeMockupUrl && !brokenMockupUrls.includes(activeMockupUrl) ? activeMockupUrl : "";
  const requestedColorMockup = getApparelMockupForColor(selectedMockupColorKey, state.activeView, adminMockupOverrides);
  const blackFallbackMockup = getApparelMockupForColor("black", state.activeView, adminMockupOverrides);
  const colorFallbackMockup =
    brokenMockupUrls.includes(requestedColorMockup.url) && requestedColorMockup.url !== blackFallbackMockup.url
      ? blackFallbackMockup
      : requestedColorMockup;
  const fallbackMockupUrl =
    state.mode === "apparel"
      ? colorFallbackMockup.url
      : safeTransferSize === "Gang Sheet"
        ? STAGING_TRANSFER_MOCKUPS.gangSheet.url
        : STAGING_TRANSFER_MOCKUPS.transferSheet.url;
  const displayMockupUrl = safeMockupUrl || fallbackMockupUrl;
  const displayMockupLabel =
    state.mode === "apparel"
      ? colorFallbackMockup.label
      : safeTransferSize === "Gang Sheet"
        ? STAGING_TRANSFER_MOCKUPS.gangSheet.label
        : STAGING_TRANSFER_MOCKUPS.transferSheet.label;
  const hasBakedPrintGuide = state.mode === "apparel" ? colorFallbackMockup.hasBakedPrintGuide : false;
  const mockupLoadFailed = Boolean(activeMockupUrl && brokenMockupUrls.includes(activeMockupUrl));
  const activeLayers = getActiveLayers(state);
  const selectedLayer = activeLayers.find((layer) => layer.id === state.selectedLayerId) || null;
  const selectedImageLayer = selectedLayer?.type === "image" ? selectedLayer : null;
  const templateDraftSelectedLayer = templateDraft?.layers.find((layer) => layer.id === templateDraft.selectedLayerId) || null;
  const templateDraftSelectedBounds = getLayerCenterBounds(templateDraftSelectedLayer);
  const selectedTemplateConfig = templateLibrary.find((template) => template.name === state.selectedTemplate);
  const safeZoom = safeNumber(state.zoom, 55, 110, 82);
  const previewMaxHeight = Math.round(760 * (safeZoom / 100));
  const safeScale = safeNumber(state.scale, 8, 100, 56);
  const selectedLayerBounds = getLayerCenterBounds(selectedLayer);
  const safeX = safeNumber(selectedLayer?.x ?? state.x, selectedLayerBounds.minX, selectedLayerBounds.maxX, 50);
  const safeY = safeNumber(selectedLayer?.y ?? state.y, selectedLayerBounds.minY, selectedLayerBounds.maxY, 45);
  const safeRotation = safeNumber(selectedLayer?.rotation ?? state.rotation, -30, 30, 0);
  const safeArtworkOpacity = safeNumber(artworkOpacity, 45, 100, 95);
  const effectiveBlendMode = state.mode === "apparel" && fabricBlendEnabled ? mockupBlendMode : "normal";
  const measurementReference = useMemo(
    () =>
      state.mode === "apparel"
        ? {
            width: safeNumber(activePrintLocation?.maxPrintWidth || 12, 1, 40, 12),
            height: safeNumber(activePrintLocation?.maxPrintHeight || 16, 1, 80, 16),
          }
        : {
            width: safeNumber(selectedTransferConfig?.width || 3, 1, 80, 3),
            height: safeNumber(selectedTransferConfig?.height || 3, 1, 120, 3),
          },
    [
      activePrintLocation?.maxPrintHeight,
      activePrintLocation?.maxPrintWidth,
      selectedTransferConfig?.height,
      selectedTransferConfig?.width,
      state.mode,
    ]
  );
  const selectedWidthInches = selectedLayer ? (selectedLayer.width / 100) * measurementReference.width : 0;
  const selectedHeightInches = selectedLayer ? (selectedLayer.height / 100) * measurementReference.height : 0;
  const printReadyPlan = useMemo(() => {
    const dpiTarget = safeNumber(stagingConfig?.fileRules?.recommendedDpi || stagingConfig?.fileRules?.minDpi || 300, 72, 1200, 300);
    const printWidthInches = selectedLayer ? Math.max(0.1, Number(selectedWidthInches.toFixed(2))) : measurementReference.width;
    const printHeightInches = selectedLayer ? Math.max(0.1, Number(selectedHeightInches.toFixed(2))) : measurementReference.height;
    const warnings = [
      !hostedArtworkUrl ? "Hosted artworkOriginalUrl is missing. Run Test Staging Upload before production handoff." : "",
      !hostedPreviewImageUrl ? "Hosted previewImageUrl is pending. Run Test Generate Preview Image before production handoff." : "",
      !hostedDesignJsonUrl ? "Hosted designJsonUrl is pending. Run Test Save Design JSON before production handoff." : "",
      dpiTarget < 300 ? "DPI target is below the recommended 300 DPI print target." : "",
      stagingConfig?.stagingSettings?.transparentBackgroundRecommended === false
        ? "Transparent background recommendation is disabled in staging config."
        : "",
    ].filter(Boolean);

    return {
      stagingOnly: true,
      status: "planned",
      printWidthInches,
      printHeightInches,
      dpiTarget,
      transparentBackgroundRequired: true,
      warnings,
      futurePrintReadyFileUrl: "",
    };
  }, [
    hostedArtworkUrl,
    hostedDesignJsonUrl,
    hostedPreviewImageUrl,
    measurementReference.height,
    measurementReference.width,
    selectedHeightInches,
    selectedLayer,
    selectedWidthInches,
    stagingConfig?.fileRules?.minDpi,
    stagingConfig?.fileRules?.recommendedDpi,
    stagingConfig?.stagingSettings?.transparentBackgroundRecommended,
  ]);
  const filteredTemplateLibrary = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();

    return templateLibrary.filter((template) => {
      const categoryEnabled = enabledTemplateCategories.includes(template.category);
      const templateModeEnabled =
        template.mode === "both"
          ? templateSettings?.enabledForApparel !== false || templateSettings?.enabledForTransfer !== false
          : template.mode === "apparel"
            ? templateSettings?.enabledForApparel !== false
            : templateSettings?.enabledForTransfer !== false;
      const categoryMatch = activeTemplateCategory === "All" || template.category === activeTemplateCategory;
      const queryMatch =
        !query ||
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.id.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query) ||
        template.tags.some((tag) => tag.toLowerCase().includes(query));

      return templateModeEnabled && categoryEnabled && categoryMatch && queryMatch;
    });
  }, [activeTemplateCategory, enabledTemplateCategories, templateLibrary, templateSearch, templateSettings?.enabledForApparel, templateSettings?.enabledForTransfer]);

  const previewPayload = useMemo(
    () => ({
      mode: state.mode,
      view: state.mode === "apparel" ? state.activeView : null,
      transferSize: state.mode === "transfer" ? safeTransferSize : null,
      artworkName: currentArtwork?.name || null,
      template: state.selectedTemplate,
      layers: activeLayers.map((layer) => ({
        ...layer,
        sourceUrl: layer.sourceUrl?.startsWith("blob:") ? undefined : layer.sourceUrl,
      })),
      transform: {
        x: safeX,
        y: safeY,
        scale: safeScale,
        rotation: safeRotation,
        opacity: state.mode === "apparel" ? safeArtworkOpacity : 100,
        blendMode: state.mode === "apparel" ? effectiveBlendMode : "normal",
      },
    }),
    [activeLayers, currentArtwork?.name, effectiveBlendMode, safeArtworkOpacity, safeRotation, safeScale, safeTransferSize, safeX, safeY, state.activeView, state.mode, state.selectedTemplate]
  );

  const designJson = useMemo(() => {
    const selectedViewLabel = APPAREL_VIEWS.find((view) => view.id === state.activeView)?.label || "Front";
    const selectedColorLabel = selectedColor?.label || selectedColor?.hex || "Black";
    const selectedMaterial = configuredMaterials[0] || "Hot Peel Film";
    const selectedInkOption = stagingConfig?.stagingSettings?.inkOptions?.[0] || "CMYK";

    return {
      editorMode: state.mode,
      productHandle: stagingConfig?.productHandle || "custom-t-shirt-upload-customize",
      productTitle: stagingConfig?.label || "Customizer Preview Product",
      selectedColor: state.mode === "apparel" ? selectedColorLabel : undefined,
      selectedView: state.mode === "apparel" ? selectedViewLabel : undefined,
      printLocation: state.mode === "apparel" ? state.activeView : undefined,
      selectedTransferSize: state.mode === "transfer" ? safeTransferSize : undefined,
      selectedMaterial: state.mode === "transfer" ? selectedMaterial : undefined,
      selectedInkOption: state.mode === "transfer" ? selectedInkOption : undefined,
      printArea: printAreaResult.area,
      canvasSize: measurementReference,
      printReadyPlan,
      layers: activeLayers.map((layer) => ({
        ...layer,
        sourceUrl: layer.sourceUrl?.startsWith("blob:") ? undefined : layer.sourceUrl,
      })),
      activeLayerId: selectedLayer?.id || null,
      realismSettings: {
        fabricBlendEnabled,
        blendMode: effectiveBlendMode,
        inkOpacity: safeArtworkOpacity,
        textureOverlayEnabled,
      },
      templateId: selectedTemplateConfig?.id || state.selectedTemplate.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      templateName: state.selectedTemplate,
      qualityStatus: "good_quality",
      createdAt: new Date().toISOString(),
      stagingOnly: true,
    };
  }, [
    activeLayers,
    configuredMaterials,
    effectiveBlendMode,
    fabricBlendEnabled,
    measurementReference,
    printReadyPlan,
    printAreaResult.area,
    safeArtworkOpacity,
    safeTransferSize,
    selectedLayer?.id,
    selectedTemplateConfig?.id,
    selectedColor?.hex,
    selectedColor?.label,
    stagingConfig?.label,
    stagingConfig?.productHandle,
    stagingConfig?.stagingSettings?.inkOptions,
    state.activeView,
    state.mode,
    state.selectedTemplate,
    textureOverlayEnabled,
  ]);

  const stagingDesignPayload = useMemo(() => {
    const selectedViewLabel = APPAREL_VIEWS.find((view) => view.id === state.activeView)?.label || "Front";
    const selectedTarget = state.mode === "apparel" ? selectedViewLabel : safeTransferSize;
    const selectedColorLabel = selectedColor?.label || selectedColor?.hex || "Black";

    return {
      configId: "customizer-preview-staging",
      type: state.mode === "apparel" ? "apparel_customizer" : "dtf_transfer_by_size",
      editorMode: state.mode,
      productHandle: "custom-t-shirt-upload-customize",
      productTitle: "Customizer Preview Product",
      quantity: 1,
      templateId: selectedTemplateConfig?.id || state.selectedTemplate.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      templateName: state.selectedTemplate,
      selectedColor: state.mode === "apparel" ? selectedColorLabel : undefined,
      selectedSize: state.mode === "apparel" ? "Custom" : undefined,
      selectedView: state.mode === "apparel" ? selectedTarget : undefined,
      selectedPrintLocationId: state.mode === "apparel" ? state.activeView : undefined,
      selectedTransferSizeId: state.mode === "transfer" ? safeTransferSize : undefined,
      selectedMaterialOptionId: state.mode === "transfer" ? configuredMaterials[0] : undefined,
      artworkOriginalUrl: hostedArtworkUrl,
      previewImageUrl: hostedPreviewImageUrl,
      designJsonUrl: hostedDesignJsonUrl,
      printReadyFileUrl: "",
      printReadyPlan,
      layers: activeLayers.length > 0
        ? activeLayers.map((layer) => mapLayerToPayloadLayer(layer, state, safeTransferSize, hostedArtworkUrl))
        : [
            {
              id: "preview-layer-1",
              type: "image",
              label: currentArtwork?.name || "Preview artwork placeholder",
              visible: true,
              locked: false,
              sourceUrl: hostedArtworkUrl || undefined,
              x: safeX,
              y: safeY,
              width: safeScale,
              height: safeScale,
              rotation: safeRotation,
              opacity: state.mode === "apparel" ? safeArtworkOpacity / 100 : 1,
              printLocationId: state.mode === "apparel" ? state.activeView : undefined,
              transferSizeId: state.mode === "transfer" ? safeTransferSize : undefined,
              qualityStatus: "good_quality",
            },
          ],
      qualityStatus: "good_quality",
      stagingOnly: true,
    };
  }, [
    currentArtwork?.name,
    activeLayers,
    configuredMaterials,
    hostedDesignJsonUrl,
    hostedArtworkUrl,
    hostedPreviewImageUrl,
    printReadyPlan,
    selectedTemplateConfig?.id,
    selectedColor?.hex,
    selectedColor?.label,
    safeRotation,
    safeScale,
    safeArtworkOpacity,
    safeTransferSize,
    safeX,
    safeY,
    state,
  ]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadAdminTemplates() {
      try {
        const response = await fetch("/api/customizer/templates", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        const templates: Array<Partial<StarterTemplateCard> & { productType?: string; previewImageUrl?: string; active?: boolean }> =
          Array.isArray(result.templates) ? result.templates : [];
        if (!isActive || !response.ok || templates.length === 0) return;
        const normalizedTemplates = templates
          .filter((template) => template && typeof template === "object" && template.active !== false)
          .map((template) => {
            const item = template;
            return templateDefinition({
              id: String(item.id || item.name || "admin-template"),
              name: String(item.name || "Admin Template"),
              category: TEMPLATE_CATEGORIES.includes(item.category as TemplateCategory) ? item.category as TemplateCategory : "Logos",
              mode: item.mode === "transfer" || item.mode === "both" ? item.mode : "apparel",
              targetView: item.targetView,
              description: String(item.description || "Admin-managed editable template."),
              thumbnailUrl: item.thumbnailUrl || item.previewImageUrl,
              previewImage: item.previewImage || item.previewImageUrl,
              tags: Array.isArray(item.tags) ? item.tags.map(String) : [String(item.productType || "customizer")],
              layers: Array.isArray(item.layers) ? item.layers : [],
            });
          })
          .filter((template) => template.layers.length > 0);
        if (normalizedTemplates.length) setAdminTemplateLibrary(normalizedTemplates);
      } catch {
        if (isActive) setAdminTemplateLibrary([]);
      }
    }

    void loadAdminTemplates();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadAdminMockups() {
      try {
        const response = await fetch("/api/customizer/mockups", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        const variants: Array<{
          colorName?: string;
          colorSlug?: string;
          frontImageUrl?: string;
          backImageUrl?: string;
          leftSleeveImageUrl?: string;
          rightSleeveImageUrl?: string;
          neckTagImageUrl?: string;
          hasBakedPrintGuide?: Partial<Record<ViewId, boolean>>;
          active?: boolean;
        }> = Array.isArray(result.variants) ? result.variants : [];
        if (!isActive || !response.ok || variants.length === 0) return;

        const nextOverrides: ApparelMockupOverrides = {};
        variants
          .filter((variant) => variant.active !== false)
          .forEach((variant) => {
            const mockupKey = getMockupColorKey(`${variant.colorName || ""} ${variant.colorSlug || ""}`);
            const viewUrls: Partial<Record<ViewId, string | undefined>> = {
              front: variant.frontImageUrl,
              back: variant.backImageUrl,
              leftSleeve: variant.leftSleeveImageUrl,
              rightSleeve: variant.rightSleeveImageUrl,
              neckTag: variant.neckTagImageUrl,
            };
            APPAREL_VIEWS.forEach(({ id }) => {
              const url = viewUrls[id];
              if (!url) return;
              nextOverrides[mockupKey] = {
                ...nextOverrides[mockupKey],
                [id]: {
                  label: `${variant.colorName || mockupKey} admin ${id} mockup`,
                  url,
                  hasBakedPrintGuide: Boolean(variant.hasBakedPrintGuide?.[id]),
                },
              };
            });
          });

        if (Object.keys(nextOverrides).length) setAdminMockupOverrides(nextOverrides);
      } catch {
        if (isActive) setAdminMockupOverrides({});
      }
    }

    void loadAdminMockups();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      const isTypingTarget =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        Boolean(target?.isContentEditable);

      if (isTypingTarget || !state.selectedLayerId) return;

      event.preventDefault();
      setState((current) => {
        const layers =
          current.mode === "apparel"
            ? current.layersByView[current.activeView] || []
            : current.transferLayersBySize[getSafeTransferSize(current.transferSize)] || [];
        const selectedIndex = layers.findIndex((layer) => layer.id === current.selectedLayerId);

        if (selectedIndex < 0) return current;

        const selected = layers[selectedIndex];
        const remainingLayers = layers.filter((layer) => layer.id !== selected.id);
        const nextSelected = remainingLayers[Math.min(selectedIndex, remainingLayers.length - 1)] || null;
        const status = event.key === "Backspace" ? "Selected layer deleted with Backspace." : "Selected layer deleted.";

        if (current.mode === "apparel") {
          return {
            ...current,
            layersByView: {
              ...current.layersByView,
              [current.activeView]: remainingLayers,
            },
            selectedLayerId: nextSelected?.id || null,
            status,
          };
        }

        const size = getSafeTransferSize(current.transferSize);
        return {
          ...current,
          transferLayersBySize: {
            ...current.transferLayersBySize,
            [size]: remainingLayers,
          },
          selectedLayerId: nextSelected?.id || null,
          status,
        };
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.selectedLayerId]);

  if (!isMounted) {
    return (
      <main className="grid min-h-screen place-items-center overflow-hidden bg-[#071015] text-neutral-100 xl:h-[100dvh]">
        <div className="rounded-xl border border-[#18313a] bg-[#0b1519] px-5 py-4 text-sm font-semibold text-cyan-100 shadow-[0_14px_50px_rgba(0,0,0,0.35)]">
          Loading staging customizer preview...
        </div>
      </main>
    );
  }

  const setMode = (mode: PreviewMode) => {
    setState((current) => ({
      ...current,
      mode,
      selectedTemplate: mode === "apparel" ? "Centered Logo" : "Logo Transfer",
      status:
        mode === "apparel"
          ? "Apparel preview mode active. View-specific artwork is isolated."
          : "DTF transfer preview mode active. Apparel locations are hidden.",
    }));
  };

  const updateActiveLayers = (
    current: EditorState,
    updater: (layers: EditableTemplateLayer[]) => EditableTemplateLayer[]
  ): EditorState => {
    if (current.mode === "apparel") {
      return {
        ...current,
        layersByView: {
          ...current.layersByView,
          [current.activeView]: updater(current.layersByView[current.activeView] || []),
        },
      };
    }

    const size = getSafeTransferSize(current.transferSize);
    return {
      ...current,
      transferLayersBySize: {
        ...current.transferLayersBySize,
        [size]: updater(current.transferLayersBySize[size] || []),
      },
    };
  };

  const updateSelectedLayer = (updates: Partial<EditableTemplateLayer>, status?: string) => {
    setState((current) => {
      if (!current.selectedLayerId) return { ...current, status: status || "Select a layer before editing." };
      return {
        ...updateActiveLayers(current, (layers) =>
          layers.map((layer) =>
            layer.id === current.selectedLayerId && (!layer.locked || Object.prototype.hasOwnProperty.call(updates, "locked"))
              ? clampLayerInsidePrintArea({ ...layer, ...updates })
              : layer
          )
        ),
        status: status || "Selected layer updated.",
      };
    });
  };

  const updateSelectedLayerFields = (updates: Partial<EditableTemplateLayer>, status: string, clampGeometry = true) => {
    setState((current) => {
      if (!current.selectedLayerId) return { ...current, status: "Select a layer before editing." };

      return {
        ...updateActiveLayers(current, (layers) =>
          layers.map((layer) => {
            if (layer.id !== current.selectedLayerId) return layer;
            if (layer.locked && !Object.prototype.hasOwnProperty.call(updates, "locked")) return layer;
            const nextLayer = { ...layer, ...updates };
            return clampGeometry ? clampLayerInsidePrintArea(nextLayer) : nextLayer;
          })
        ),
        status,
      };
    });
  };

  const updateLayerScale = (scale: number) => {
    setState((current) => {
      if (!current.selectedLayerId) return { ...current, scale, status: "Scale staged for the next selected layer." };
      let didUpdate = false;
      const previousScale = safeNumber(current.scale, 8, 100, 56);

      const nextState = updateActiveLayers(current, (layers) =>
        layers.map((layer) => {
          if (layer.id !== current.selectedLayerId || layer.locked) return layer;
          didUpdate = true;
          if (layer.type === "text") {
            return { ...layer, ...getTextScaleUpdate(layer, previousScale, scale) };
          }
          return { ...layer, ...getProportionalScaleSize(layer, scale) };
        })
      );

      return {
        ...nextState,
        scale,
        status: didUpdate ? "Selected layer scaled." : "Select an unlocked layer before scaling.",
      };
    });
  };

  const updateLayerWidth = (width: number) => {
    updateSelectedLayerFields({ width, fitMode: selectedImageLayer ? "manual" : selectedLayer?.fitMode }, "Image width updated.");
  };

  const updateLayerHeight = (height: number) => {
    updateSelectedLayerFields({ height, fitMode: selectedImageLayer ? "manual" : selectedLayer?.fitMode }, "Image height updated.");
  };

  const updateLayerX = (x: number) => {
    setState((current) => {
      const selected = getActiveLayers(current).find((layer) => layer.id === current.selectedLayerId);
      if (!selected || selected.locked) return { ...current, status: "Select an unlocked layer before moving horizontally." };
      const bounds = getLayerCenterBounds(selected);
      return {
        ...updateActiveLayers(current, (layers) =>
          layers.map((layer) => (layer.id === selected.id ? { ...layer, x: clamp(x, bounds.minX, bounds.maxX) } : layer))
        ),
        x: clamp(x, bounds.minX, bounds.maxX),
        status: "Selected layer moved horizontally.",
      };
    });
  };

  const updateLayerY = (y: number) => {
    setState((current) => {
      const selected = getActiveLayers(current).find((layer) => layer.id === current.selectedLayerId);
      if (!selected || selected.locked) return { ...current, status: "Select an unlocked layer before moving vertically." };
      const bounds = getLayerCenterBounds(selected);
      return {
        ...updateActiveLayers(current, (layers) =>
          layers.map((layer) => (layer.id === selected.id ? { ...layer, y: clamp(y, bounds.minY, bounds.maxY) } : layer))
        ),
        y: clamp(y, bounds.minY, bounds.maxY),
        status: "Selected layer moved vertically.",
      };
    });
  };

  const updateLayerRotation = (rotation: number) => {
    updateSelectedLayerFields({ rotation }, "Selected layer rotation updated.", false);
  };

  const deleteSelectedLayer = (status = "Selected layer deleted from the staging design.") => {
    setState((current) => {
      const layers = getActiveLayers(current);
      const selectedIndex = layers.findIndex((layer) => layer.id === current.selectedLayerId);

      if (selectedIndex < 0) {
        return { ...current, status: "Select a layer before deleting." };
      }

      const selected = layers[selectedIndex];
      const remainingLayers = layers.filter((layer) => layer.id !== selected.id);
      const nextSelected = remainingLayers[Math.min(selectedIndex, remainingLayers.length - 1)] || null;

      return {
        ...updateActiveLayers(current, () => remainingLayers),
        selectedLayerId: nextSelected?.id || null,
        status,
      };
    });
  };

  const updateSelectedImageFit = (mode: ImageFitMode) => {
    setState((current) => {
      const layers = getActiveLayers(current);
      const selected = layers.find((layer) => layer.id === current.selectedLayerId);
      if (!selected || selected.type !== "image") {
        return { ...current, status: "Select an uploaded image layer before changing image fit." };
      }

      const proportionalSize = getProportionalFitSize(selected);
      const updates: Partial<EditableTemplateLayer> =
        mode === "stretch"
          ? { fitMode: "stretch", x: 50, y: 50, width: 100, height: 100, cropX: 50, cropY: 50, cropZoom: 100, lockAspectRatio: false }
        : mode === "cover"
            ? { fitMode: "cover", x: 50, y: 50, width: 100, height: 100, cropX: 50, cropY: 50, cropZoom: Math.max(selected.cropZoom || 100, 100), lockAspectRatio: true }
            : mode === "manual"
              ? { fitMode: "manual", lockAspectRatio: false }
              : { fitMode: "contain", x: 50, y: 50, width: proportionalSize.width, height: proportionalSize.height, cropX: 50, cropY: 50, cropZoom: 100, lockAspectRatio: true };

      return {
        ...updateActiveLayers(current, (currentLayers) =>
          currentLayers.map((layer) => (layer.id === selected.id ? clampLayerInsidePrintArea({ ...layer, ...updates }) : layer))
        ),
        x: updates.x ?? current.x,
        y: updates.y ?? current.y,
        scale: updates.width ?? current.scale,
        status:
          mode === "stretch"
            ? "Selected image stretched to the full print area."
            : mode === "cover"
              ? "Selected image set to fill/crop inside the print area."
              : mode === "manual"
                ? "Manual image sizing enabled."
                : "Selected image fit proportionally inside the print area.",
      };
    });
  };

  const resetSelectedImageCrop = () => {
    updateSelectedLayer(
      { cropX: 50, cropY: 50, cropZoom: 100 },
      "Image crop reset. Source artwork was not changed."
    );
  };
  void resetSelectedImageCrop;

  const selectProductColor = (color: PreviewColorOption) => {
    setState((current) => ({
      ...current,
      selectedColorId: color.id,
      selectedColorHex: color.hex,
      status: `${color.label || color.hex} mockup selected for staging preview.`,
    }));
    setIsColorPickerOpen(false);
  };

  const loadEditableTemplate = (templateIdOrName: string) => {
    setState((current) => {
      const template = findTemplate(templateIdOrName, current.mode, templateLibrary);
      const templateName = template?.name || templateIdOrName;
      const nextMode: PreviewMode = template?.mode === "transfer" ? "transfer" : template?.mode === "apparel" ? "apparel" : current.mode;
      const layers = createTemplateLayers(templateIdOrName, nextMode, templateLibrary);
      const targetView = nextMode === "apparel" ? getRecommendedViewForTemplate(templateIdOrName, current.activeView, templateLibrary) : current.activeView;
      const targetTransferSize = nextMode === "transfer" ? getSafeTransferSize(current.transferSize) : current.transferSize;
      const nextState = { ...current, mode: nextMode, activeView: targetView, transferSize: targetTransferSize };
      return {
        ...updateActiveLayers(nextState, () => layers),
        selectedTemplate: templateName,
        selectedLayerId: layers[0]?.id || null,
        status: nextMode === "apparel"
          ? `${templateName} editable starter template loaded for ${getCanvasLabel(nextState)}.`
          : `${templateName} editable starter template loaded. Edit layers in the left panel.`,
      };
    });
  };
  void loadEditableTemplate;

  const openTemplateDraft = (template: StarterTemplateCard) => {
    const nextMode: PreviewMode = template.mode === "transfer" ? "transfer" : template.mode === "apparel" ? "apparel" : state.mode;
    const layers = createTemplateLayers(template.id, nextMode, templateLibrary);
    const targetView = nextMode === "apparel" ? getRecommendedViewForTemplate(template.id, state.activeView, templateLibrary) : state.activeView;
    const transferSize = nextMode === "transfer" ? getSafeTransferSize(state.transferSize) : state.transferSize;
    setTemplateDraft({
      template,
      mode: nextMode,
      targetView,
      transferSize,
      layers,
      selectedLayerId: layers[0]?.id || null,
      status: `${template.name} opened as a draft. Main design is unchanged.`,
    });
  };

  const closeTemplateLibrary = () => {
    setTemplateDraft(null);
    setIsTemplateLibraryOpen(false);
  };

  const backToTemplateGrid = () => {
    setTemplateDraft(null);
  };

  const updateTemplateDraftLayer = (updates: Partial<EditableTemplateLayer>, status: string, clampGeometry = true) => {
    setTemplateDraft((current) => {
      if (!current?.selectedLayerId) return current ? { ...current, status: "Select a layer in the template preview first." } : current;
      let didUpdate = false;
      const nextLayers = current.layers.map((layer) => {
        if (layer.id !== current.selectedLayerId || layer.locked) return layer;
        didUpdate = true;
        const nextLayer = { ...layer, ...updates };
        return clampGeometry ? clampLayerInsidePrintArea(nextLayer) : nextLayer;
      });

      return {
        ...current,
        layers: nextLayers,
        status: didUpdate ? status : "Select an unlocked layer in the template preview first.",
      };
    });
  };

  const updateTemplateDraftLayerScale = (scale: number) => {
    setTemplateDraft((current) => {
      const selected = current?.layers.find((layer) => layer.id === current.selectedLayerId);
      if (!current || !selected || selected.locked) {
        return current ? { ...current, status: "Select an unlocked layer in the template preview first." } : current;
      }
      const previousScale = Math.max(selected.width, selected.height, 1);
      const updates = selected.type === "text" ? getTextScaleUpdate(selected, previousScale, scale) : getProportionalScaleSize(selected, scale);
      return {
        ...current,
        layers: current.layers.map((layer) => (layer.id === selected.id ? clampLayerInsidePrintArea({ ...layer, ...updates }) : layer)),
        status: "Draft template layer resized.",
      };
    });
  };

  const updateTemplateDraftLayerX = (x: number) => {
    setTemplateDraft((current) => {
      const selected = current?.layers.find((layer) => layer.id === current.selectedLayerId);
      if (!current || !selected || selected.locked) {
        return current ? { ...current, status: "Select an unlocked layer in the template preview first." } : current;
      }
      const bounds = getLayerCenterBounds(selected);
      return {
        ...current,
        layers: current.layers.map((layer) => (layer.id === selected.id ? { ...layer, x: clamp(x, bounds.minX, bounds.maxX) } : layer)),
        status: "Draft template layer moved horizontally.",
      };
    });
  };

  const updateTemplateDraftLayerY = (y: number) => {
    setTemplateDraft((current) => {
      const selected = current?.layers.find((layer) => layer.id === current.selectedLayerId);
      if (!current || !selected || selected.locked) {
        return current ? { ...current, status: "Select an unlocked layer in the template preview first." } : current;
      }
      const bounds = getLayerCenterBounds(selected);
      return {
        ...current,
        layers: current.layers.map((layer) => (layer.id === selected.id ? { ...layer, y: clamp(y, bounds.minY, bounds.maxY) } : layer)),
        status: "Draft template layer moved vertically.",
      };
    });
  };

  const deleteTemplateDraftLayer = () => {
    setTemplateDraft((current) => {
      if (!current?.selectedLayerId) return current ? { ...current, status: "Select a layer before deleting." } : current;
      const selectedIndex = current.layers.findIndex((layer) => layer.id === current.selectedLayerId);
      const selected = current.layers[selectedIndex];
      if (!selected || selected.locked) return { ...current, status: "Locked draft layers cannot be deleted." };
      const nextLayers = current.layers.filter((layer) => layer.id !== selected.id);
      const nextSelected = nextLayers[Math.min(selectedIndex, nextLayers.length - 1)] || null;
      return {
        ...current,
        layers: nextLayers,
        selectedLayerId: nextSelected?.id || null,
        status: "Draft template layer deleted.",
      };
    });
  };

  const handleTemplateDraftUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      event.target.value = "";
      setTemplateDraft((current) => current ? { ...current, status: "Choose an image file for the draft template placeholder." } : current);
      return;
    }

    const artwork = {
      url: URL.createObjectURL(file),
      name: file.name,
    };

    setTemplateDraft((current) => {
      if (!current) return current;
      const selectedIndex = current.layers.findIndex((layer) => layer.id === current.selectedLayerId);
      const placeholderIndex =
        selectedIndex >= 0 && ["placeholder", "image-placeholder", "image"].includes(current.layers[selectedIndex].type)
          ? selectedIndex
          : current.layers.findIndex((layer) => (layer.type === "placeholder" || layer.type === "image-placeholder") && !layer.locked);
      if (placeholderIndex < 0 || current.layers[placeholderIndex].locked) {
        return { ...current, status: "Select an unlocked logo/image placeholder before uploading." };
      }
      const target = current.layers[placeholderIndex];
      const uploadedLayer = layerDefaults({
        ...target,
        type: "image",
        sourceUrl: artwork.url,
        sourceName: artwork.name,
        fitMode: "contain",
        cropX: 50,
        cropY: 50,
        cropZoom: 100,
        lockAspectRatio: true,
      });
      return {
        ...current,
        layers: current.layers.map((layer, index) => (index === placeholderIndex ? uploadedLayer : layer)),
        selectedLayerId: uploadedLayer.id,
        status: `${artwork.name} replaced the draft template placeholder.`,
      };
    });
    event.target.value = "";
  };

  const applyTemplateDraft = () => {
    if (!templateDraft) return;
    setState((current) => {
      const targetTransferSize = templateDraft.mode === "transfer" ? getSafeTransferSize(templateDraft.transferSize) : current.transferSize;
      const nextState = {
        ...current,
        mode: templateDraft.mode,
        activeView: templateDraft.targetView,
        transferSize: targetTransferSize,
      };
      return {
        ...updateActiveLayers(nextState, () => templateDraft.layers),
        selectedTemplate: templateDraft.template.name,
        selectedLayerId: templateDraft.selectedLayerId || templateDraft.layers[0]?.id || null,
        status:
          templateDraft.mode === "apparel"
            ? `${templateDraft.template.name} customized template applied to ${APPAREL_VIEWS.find((view) => view.id === templateDraft.targetView)?.label || templateDraft.targetView}.`
            : `${templateDraft.template.name} customized template applied to ${targetTransferSize}.`,
      };
    });
    closeTemplateLibrary();
  };

  const addTextLayer = () => {
    setState((current) => {
      const layers = getActiveLayers(current);
      const textLayer = layerDefaults({
        id: createLayerId("custom-text", layers.length),
        type: "text",
        name: "Main Text",
        text: "Edit Text",
        x: 50,
        y: 50,
        width: 58,
        height: 16,
        color: "#e5faff",
        fontSize: 24,
        fontId: "montserrat",
        fontFamily: getFontById("montserrat").cssFontFamily,
      });

      return {
        ...updateActiveLayers(current, (currentLayers) => [...currentLayers, textLayer]),
        selectedLayerId: textLayer.id,
        status: "Editable text layer added to the staging canvas.",
      };
    });
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setStatusOnly("No artwork file selected.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      event.target.value = "";
      setStatusOnly("Unsupported file type. Please choose an image file for this staging preview.");
      return;
    }

    const fileRules = stagingConfig?.fileRules;
    const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
    const allowedExtensions = fileRules?.allowedExtensions?.map((item) => item.toLowerCase()) || [".png", ".jpg", ".jpeg", ".svg", ".webp"];
    const maxSizeMb = safeNumber(fileRules?.maxFileSizeMb || 25, 1, 500, 25);
    const sizeMb = file.size / (1024 * 1024);
    if (!allowedExtensions.includes(extension)) {
      event.target.value = "";
      setStatusOnly(`File type ${extension} is not allowed by the loaded staging file rules.`);
      return;
    }
    if (sizeMb > maxSizeMb) {
      event.target.value = "";
      setStatusOnly(`File is ${sizeMb.toFixed(2)} MB, above the loaded staging max of ${maxSizeMb} MB.`);
      return;
    }

    if (currentArtwork?.url.startsWith("blob:")) {
      URL.revokeObjectURL(currentArtwork.url);
    }

    const artwork = {
      url: URL.createObjectURL(file),
      name: file.name,
      file,
    };

    setStagingUploadStatus("idle");
    setStagingUploadResult(null);

    setState((current) => {
      const replaceOrAddArtworkLayer = (layers: EditableTemplateLayer[]) => {
        const placeholderIndex = layers.findIndex((layer) => (layer.type === "placeholder" || layer.type === "image-placeholder") && !layer.locked);
        const uploadedLayer = layerDefaults({
          id: placeholderIndex >= 0 ? layers[placeholderIndex].id : createLayerId("customer-artwork", layers.length),
          type: "image",
          name: placeholderIndex >= 0 ? layers[placeholderIndex].name : "Customer Artwork",
          sourceUrl: artwork.url,
          sourceName: artwork.name,
          x: placeholderIndex >= 0 ? layers[placeholderIndex].x : 50,
          y: placeholderIndex >= 0 ? layers[placeholderIndex].y : 50,
          width: placeholderIndex >= 0 ? layers[placeholderIndex].width : 54,
          height: placeholderIndex >= 0 ? layers[placeholderIndex].height : 32,
          rotation: placeholderIndex >= 0 ? layers[placeholderIndex].rotation : 0,
          opacity: placeholderIndex >= 0 ? layers[placeholderIndex].opacity : 1,
          color: "#ffffff",
          fitMode: "contain",
          cropX: 50,
          cropY: 50,
          cropZoom: 100,
          lockAspectRatio: true,
          zIndex: placeholderIndex >= 0 ? layers[placeholderIndex].zIndex : layers.length,
        });

        if (placeholderIndex >= 0) {
          return layers.map((layer, index) => (index === placeholderIndex ? uploadedLayer : layer));
        }

        return [...layers, uploadedLayer];
      };

      if (current.mode === "apparel") {
        const nextLayers = replaceOrAddArtworkLayer(current.layersByView[current.activeView] || []);
        return {
          ...current,
          artworkByView: {
            ...current.artworkByView,
            [current.activeView]: artwork,
          },
          layersByView: {
            ...current.layersByView,
            [current.activeView]: nextLayers,
          },
          selectedLayerId: nextLayers.find((layer) => layer.sourceUrl === artwork.url)?.id || null,
          x: 50,
          y: 50,
          status: `Uploaded ${file.name} to ${getCanvasLabel(current)} and replaced the editable placeholder when available.`,
        };
      }

      const size = getSafeTransferSize(current.transferSize);
      const nextLayers = replaceOrAddArtworkLayer(current.transferLayersBySize[size] || []);
      return {
        ...current,
        transferArtwork: artwork,
        transferLayersBySize: {
          ...current.transferLayersBySize,
          [size]: nextLayers,
        },
        selectedLayerId: nextLayers.find((layer) => layer.sourceUrl === artwork.url)?.id || null,
        x: 50,
        y: 50,
        status: `Uploaded ${file.name} to ${current.transferSize} preview.`,
      };
    });

    event.target.value = "";
  };

  const removeArtwork = () => {
    deleteSelectedLayer();
  };

  const testStagingUpload = async () => {
    if (!currentArtwork?.file) {
      setStagingUploadStatus("error");
      setStagingUploadResult({
        artworkName: currentArtwork?.name || "No artwork",
        errors: ["Select artwork before testing staging upload."],
        warnings: [],
      });
      setStatusOnly("Select artwork before testing staging upload.");
      return;
    }

    setStagingUploadStatus("uploading");
    setStagingUploadResult({
      artworkName: currentArtwork.name,
      errors: [],
      warnings: ["Uploading to staging validation route. Local preview remains active."],
    });

    const formData = new FormData();
    formData.append("file", currentArtwork.file, currentArtwork.file.name);
    formData.append("purpose", "artwork_original");

    try {
      const response = await fetch("/api/customizer/staging-upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        errors?: string[];
        warnings?: string[];
        asset?: StagingUploadAsset;
      } | null;

      const errors = Array.isArray(result?.errors) ? result.errors : [];
      const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
      const nextStatus: StagingUploadStatus =
        !response.ok || !result?.ok || errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "success";

      setStagingUploadStatus(nextStatus);
      setStagingUploadResult({
        artworkName: currentArtwork.name,
        asset: result?.asset,
        errors: errors.length > 0 ? errors : response.ok ? [] : ["Staging upload failed."],
        warnings,
      });
      const hasHostedUrl = typeof result?.asset?.url === "string" && result.asset.url.startsWith("http");
      setStatusOnly(
        hasHostedUrl
          ? "Hosted staging artwork URL ready."
          : nextStatus === "error"
          ? "Staging upload test failed. Local preview remains active."
          : nextStatus === "warning"
            ? "Staging upload test returned warnings. Local preview remains active."
            : "Staging upload test succeeded. Local preview remains active."
      );
    } catch {
      setStagingUploadStatus("error");
      setStagingUploadResult({
        artworkName: currentArtwork.name,
        errors: ["Could not reach staging upload API. Local preview remains active."],
        warnings: [],
      });
      setStatusOnly("Could not reach staging upload API. Local preview remains active.");
    }
  };

  const saveDesign = () => {
    setIsSaving(true);
    window.setTimeout(() => {
      try {
        window.localStorage.setItem("dtf-customizer-preview-design", JSON.stringify(previewPayload));
        setState((current) => ({
          ...current,
          status: "Preview design saved locally. No live store data was changed.",
        }));
      } catch {
        setState((current) => ({
          ...current,
          status: "Local staging save failed. Browser storage may be unavailable.",
        }));
      } finally {
        setIsSaving(false);
      }
    }, 450);
  };

  const addToPreviewCart = () => {
    setIsCarting(true);
    window.setTimeout(() => {
      setIsCarting(false);
      setMobilePanel("order");
      setIsPreviewOrderOpen(true);
      setState((current) => ({
        ...current,
        status: "Test cart payload prepared locally and shown in Preview Order. Live checkout is not connected.",
      }));
    }, 450);
  };

  const uploadGeneratedStagingAsset = async (file: File, purpose: "design_json" | "preview_image") => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("purpose", purpose);

    const response = await fetch("/api/customizer/staging-upload", {
      method: "POST",
      body: formData,
    });
    const result = await response.json().catch(() => null) as {
      ok?: boolean;
      errors?: string[];
      warnings?: string[];
      asset?: StagingUploadAsset;
    } | null;
    const errors = Array.isArray(result?.errors) ? result.errors : [];
    const warnings = Array.isArray(result?.warnings) ? result.warnings : [];

    return {
      ok: response.ok && Boolean(result?.ok) && errors.length === 0,
      asset: result?.asset,
      errors: errors.length > 0 ? errors : response.ok ? [] : ["Staging asset upload failed."],
      warnings,
    };
  };

  const testSaveDesignJson = async () => {
    setDesignJsonStatus("uploading");
    setMobilePanel("order");
    setIsPreviewOrderOpen(true);
    setDesignJsonResult({
      errors: [],
      warnings: ["Saving design JSON to staging upload route only. Shopify and checkout remain disconnected."],
    });

    try {
      const json = JSON.stringify(designJson, null, 2);
      const file = new File([new Blob([json], { type: "application/json" })], `dtf-design-${Date.now()}.json`, {
        type: "application/json",
      });
      const result = await uploadGeneratedStagingAsset(file, "design_json");
      const hostedUrl = result.asset?.url?.startsWith("http") ? result.asset.url : "";

      setDesignJsonStatus(!result.ok ? "error" : hostedUrl ? result.warnings.length ? "warning" : "success" : "warning");
      setDesignJsonResult({
        asset: result.asset,
        errors: result.errors,
        warnings: hostedUrl
          ? result.warnings
          : [
              ...result.warnings,
              "Design JSON was validated for staging, but no hosted designJsonUrl was created because storage is not configured.",
            ],
      });
      setStatusOnly(hostedUrl ? "Hosted staging design JSON URL ready." : "Design JSON generation staged. Hosted URL is missing until staging storage is configured.");
    } catch {
      setDesignJsonStatus("error");
      setDesignJsonResult({
        errors: ["Could not generate or upload design JSON staging asset."],
        warnings: [],
      });
      setStatusOnly("Could not generate design JSON staging asset. Checkout and Shopify remain disconnected.");
    }
  };

  const createPreviewSvg = () => {
    const visibleLayers = activeLayers.filter((layer) => !layer.hidden).sort((a, b) => a.zIndex - b.zIndex);
    const layerMarkup = visibleLayers.map((layer) => {
      const x = 120 + layer.x * 3.6;
      const y = 120 + layer.y * 4.8;
      const width = Math.max(12, layer.width * 3.6);
      const height = Math.max(12, layer.height * 4.8);
      const opacity = safeNumber(layer.opacity, 0, 1, 1);

      if (layer.type === "text") {
        return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="${layer.fontFamily}" font-size="${Math.max(12, layer.fontSize)}" fill="${layer.color}" opacity="${opacity}">${escapeSvgText(layer.text || layer.name)}</text>`;
      }
      if (layer.type === "shape") {
        return `<rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}" rx="18" fill="${layer.color}" opacity="${opacity}" />`;
      }
      return `<rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}" rx="10" fill="#0f172a" stroke="#67e8f9" stroke-width="2" opacity="${opacity}" /><text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="Inter, Arial" font-size="18" fill="#cffafe">${escapeSvgText(layer.sourceName || layer.text || layer.name)}</text>`;
    }).join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1200" viewBox="0 0 960 1200">
      <rect width="960" height="1200" fill="#071015"/>
      <rect x="180" y="120" width="600" height="920" rx="42" fill="#e8f0f7"/>
      <rect x="300" y="250" width="360" height="720" rx="34" fill="${state.mode === "apparel" ? "#111827" : "#ffffff"}" opacity="0.96"/>
      <rect x="${120 + printAreaResult.area.x * 3.6 - printAreaResult.area.width * 1.8}" y="${120 + printAreaResult.area.y * 4.8 - printAreaResult.area.height * 2.4}" width="${printAreaResult.area.width * 3.6}" height="${printAreaResult.area.height * 4.8}" fill="none" stroke="#22d3ee" stroke-width="3" stroke-dasharray="8 8"/>
      ${layerMarkup}
      <text x="480" y="1120" text-anchor="middle" font-family="Inter, Arial" font-size="24" fill="#cffafe">Staging preview image</text>
    </svg>`;
  };

  const testGeneratePreviewImage = async () => {
    setPreviewImageStatus("uploading");
    setMobilePanel("order");
    setIsPreviewOrderOpen(true);
    setPreviewImageResult({
      errors: [],
      warnings: ["Generating a frontend-only staging preview image. No production rendering service is called."],
    });

    try {
      const svg = createPreviewSvg();
      const file = new File([new Blob([svg], { type: "image/svg+xml" })], `dtf-preview-${Date.now()}.svg`, {
        type: "image/svg+xml",
      });
      const result = await uploadGeneratedStagingAsset(file, "preview_image");
      const hostedUrl = result.asset?.url?.startsWith("http") ? result.asset.url : "";

      setPreviewImageStatus(!result.ok ? "error" : hostedUrl ? result.warnings.length ? "warning" : "success" : "warning");
      setPreviewImageResult({
        asset: result.asset,
        errors: result.errors,
        warnings: hostedUrl
          ? result.warnings
          : [
              ...result.warnings,
              "Preview image generation is staged. No hosted previewImageUrl was created because storage is not configured.",
            ],
      });
      setStatusOnly(hostedUrl ? "Hosted staging preview image URL ready." : "Preview image generation staged. Hosted URL is missing until staging storage is configured.");
    } catch {
      setPreviewImageStatus("error");
      setPreviewImageResult({
        errors: ["Could not generate or upload staging preview image."],
        warnings: [],
      });
      setStatusOnly("Could not generate staging preview image. Checkout and Shopify remain disconnected.");
    }
  };

  const testSavePayload = async () => {
    setStagingSaveStatus("saving");
    setMobilePanel("order");
    setIsPreviewOrderOpen(true);
    setStagingSaveResult({
      errors: [],
      warnings: ["Sending staging design payload for validation only. Checkout and Shopify remain disconnected."],
    });

    try {
      const response = await fetch("/api/customizer/staging-save-design", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: stagingDesignPayload }),
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        errors?: string[];
        warnings?: string[];
        savedDesign?: StagingSaveResult["savedDesign"];
        lineItemPropertiesPreview?: Record<string, string>;
      } | null;
      const errors = Array.isArray(result?.errors) ? result.errors : [];
      const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
      const nextStatus: StagingSaveStatus =
        !response.ok || !result?.ok || errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "success";

      setStagingSaveStatus(nextStatus);
      setStagingSaveResult({
        savedDesign: result?.savedDesign,
        errors: errors.length > 0 ? errors : response.ok ? [] : ["Staging save payload failed."],
        warnings,
        lineItemPropertiesPreview: result?.lineItemPropertiesPreview,
      });
      setStatusOnly(
        nextStatus === "error"
          ? "Staging save payload failed. Checkout and Shopify remain disconnected."
          : nextStatus === "warning"
            ? "Staging save payload returned warnings. Checkout and Shopify remain disconnected."
            : "Staging save payload accepted. Checkout and Shopify remain disconnected."
      );
    } catch {
      setStagingSaveStatus("error");
      setStagingSaveResult({
        errors: ["Could not reach staging save design API."],
        warnings: [],
      });
      setStatusOnly("Could not reach staging save design API. Checkout and Shopify remain disconnected.");
    }
  };

  const runAiPlaceholder = (action: "Background Remover" | "Image Enhancer" | "Vectorizer" | "Generate Idea") => {
    const artworkRequired = action !== "Generate Idea";
    if (artworkRequired && !currentArtwork?.file) {
      setStatusOnly("Upload artwork first.");
      return;
    }

    const statusByAction = {
      "Background Remover": "Staging only: background remover queued / no production endpoint connected.",
      "Image Enhancer": "Staging only: image enhancer queued / no production endpoint connected.",
      Vectorizer: "Staging only: vectorizer queued / no production endpoint connected.",
      "Generate Idea": "Staging only: design idea generated / no production endpoint connected.",
    };

    setIsAiLoading(true);
    window.setTimeout(() => {
      setIsAiLoading(false);
      setStatusOnly(statusByAction[action]);
    }, 300);
  };

  const loadStagingConfig = () => {
    try {
      const rawConfig = window.localStorage.getItem(STAGING_CUSTOMIZER_CONFIG_STORAGE_KEY);
      if (!rawConfig) {
        setStagingConfig(null);
        setStagingConfigWarning("Using safe preview defaults.");
        setState((current) => ({
          ...current,
          mode: "apparel",
          transferSize: SAFE_TRANSFER_SIZE,
          selectedTemplate: "Centered Logo",
          usingSafeDefaults: true,
          status: "Using safe preview defaults. Validate a config in /admin/customizer-setup to load setup values.",
        }));
        return;
      }

      const parsedConfig = JSON.parse(rawConfig) as StagingCustomizerConfig & {
        type?: unknown;
        label?: unknown;
      };
      const nextMode = resolvePreviewModeFromConfigType(parsedConfig.type);
      const firstTransferSize = Array.isArray(parsedConfig.transferSizes)
        ? parsedConfig.transferSizes.map(getTransferSizeLabel).find(Boolean)
        : "";
      const defaultTransferSize = getConfiguredTransferSizeLabel(parsedConfig, parsedConfig.stagingSettings?.defaultTransferSizeId);
      const nextTransferSize = nextMode === "transfer" ? getSafeTransferSize(defaultTransferSize || firstTransferSize) : SAFE_TRANSFER_SIZE;
      const usedFallback = nextMode === "transfer" && !firstTransferSize;
      const label = typeof parsedConfig.label === "string" ? parsedConfig.label : "staging setup";
      const realismDefaults = parsedConfig.stagingSettings?.realismDefaults;

      setStagingConfig(parsedConfig);
      setStagingConfigWarning(usedFallback ? "Invalid staging config, using safe defaults." : "");
      if (realismDefaults) {
        setFabricBlendEnabled(Boolean(realismDefaults.fabricBlendEnabled));
        setMockupBlendMode(realismDefaults.defaultBlendMode || "multiply");
        setArtworkOpacity(safeNumber(realismDefaults.defaultInkOpacity || 95, 45, 100, 95));
        setTextureOverlayEnabled(realismDefaults.textureOverlayEnabled !== false);
      }
      if (parsedConfig.stagingSettings?.templateSettings?.defaultCategory) {
        const defaultCategory = parsedConfig.stagingSettings.templateSettings.defaultCategory;
        setActiveTemplateCategory(TEMPLATE_CATEGORIES.includes(defaultCategory as TemplateCategory) ? defaultCategory as TemplateCategory : "All");
      }
      setState((current) => ({
        ...current,
        mode: nextMode,
        transferSize: nextTransferSize,
        selectedTemplate: nextMode === "apparel" ? "Centered Logo" : "Logo Transfer",
        usingSafeDefaults: usedFallback,
        status: usedFallback
          ? `Loaded ${label}, but transfer size was invalid. Using safe preview defaults.`
          : "Loaded staging setup config. Production remains disconnected.",
      }));
    } catch {
      setStagingConfig(null);
      setStagingConfigWarning("Invalid staging config, using safe defaults.");
      setState((current) => ({
        ...current,
        mode: "apparel",
        transferSize: SAFE_TRANSFER_SIZE,
        selectedTemplate: "Centered Logo",
        usingSafeDefaults: true,
        status: "Unable to load staging setup config. Using safe preview defaults.",
      }));
    }
  };

  const setStatusOnly = (status: string) => {
    setState((current) => ({ ...current, status }));
  };

  const duplicateDesign = () => {
    setState((current) => {
      const layers = getActiveLayers(current);
      const selected = layers.find((layer) => layer.id === current.selectedLayerId);

      if (!selected) return { ...current, status: "Select a layer before duplicating." };

      const duplicate = {
        ...selected,
        id: createLayerId(selected.name, layers.length),
        name: `${selected.name} Copy`,
        x: clamp(selected.x + 5, 0, 100),
        y: clamp(selected.y + 5, 0, 100),
      };

      return {
        ...updateActiveLayers(current, (currentLayers) => [...currentLayers, duplicate]),
        selectedLayerId: duplicate.id,
        status: `${selected.name} duplicated for staging.`,
      };
    });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#071015] pb-14 text-neutral-100 lg:pb-0 xl:fixed xl:inset-0 xl:z-50 xl:h-[100dvh] xl:overflow-hidden">
      <header className="border-b border-[#18313a] bg-[#09151a]/95 px-4 py-2 shadow-[0_14px_50px_rgba(0,0,0,0.35)] md:px-5 xl:h-14 xl:py-1.5">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-3 xl:h-full xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-400/40 bg-cyan-300 text-sm font-black text-[#061015] shadow-[0_0_24px_rgba(103,232,249,0.25)]">
              DTF
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Preview / Staging</p>
              <h1 className="text-base font-semibold text-white">DTF Designer Pro</h1>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm text-neutral-300">
            {["Home", "Customize", "Gang Sheets", "DTF Transfers", "Apparel", "Rewards"].map((item) => (
              <span key={item} className="rounded-md px-3 py-1.5 hover:bg-white/5">{item}</span>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <ModeButton active={state.mode === "apparel"} onClick={() => setMode("apparel")}>Apparel</ModeButton>
            <ModeButton active={state.mode === "transfer"} onClick={() => setMode("transfer")}>Transfers</ModeButton>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1840px] gap-0 xl:h-[calc(100dvh-56px)] xl:overflow-hidden xl:grid-cols-[286px_minmax(0,1fr)_300px]">
        <aside className={`${mobilePanel === "tools" ? "block" : "hidden"} bg-[#0b1519] p-2.5 pt-3 xl:block xl:h-full xl:min-h-0 xl:overflow-y-auto xl:border-r xl:border-[#18313a] xl:[scrollbar-color:#27515d_#081114] xl:[scrollbar-width:thin]`}>
          <div className="space-y-2.5">
            <PanelCard title="Layers">
              <div className="space-y-2 text-sm text-neutral-300">
                <div className="rounded-md bg-[#081114] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-neutral-100">{selectedLayer ? selectedLayer.name : "No editable layer"}</span>
                    <span className="text-cyan-300">{state.mode === "apparel" ? getCanvasLabel(state) : safeTransferSize}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{selectedLayer ? `${selectedLayer.type} layer selected` : "Choose an editable starter template or upload artwork."}</p>
                </div>
                {activeLayers.length > 0 ? (
                  <div className="grid gap-1.5">
                    {activeLayers.map((layer) => (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => setState((current) => ({ ...current, selectedLayerId: layer.id, status: `${layer.name} selected.` }))}
                        className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs font-semibold ${
                          layer.id === selectedLayer?.id
                            ? "border-cyan-300 bg-cyan-300 text-neutral-950"
                            : "border-[#2c424a] bg-[#071015] text-neutral-200"
                        }`}
                      >
                        <span className="truncate">{layer.name}</span>
                        <span className="shrink-0 uppercase opacity-70">{layer.hidden ? "hidden" : layer.locked ? "locked" : layer.type}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <ToolButton label="Duplicate Selected" onClick={duplicateDesign} />
                  <ToolButton
                    label="Hide / Show"
                    onClick={() => updateSelectedLayer({ hidden: !selectedLayer?.hidden }, selectedLayer ? "Selected layer visibility updated." : "Select a layer before changing visibility.")}
                  />
                  <ToolButton
                    label="Lock / Unlock"
                    onClick={() => updateSelectedLayer({ locked: !selectedLayer?.locked }, selectedLayer ? "Selected layer lock updated." : "Select a layer before locking.")}
                  />
                  <ToolButton label="Delete Selected" onClick={removeArtwork} />
                </div>
                {currentArtwork ? (
                  <div className="rounded-lg border border-[#20343b] bg-[#071015] p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${getUploadStatusClass(stagingUploadStatus)}`}>
                        {stagingUploadStatus === "idle" ? "Staging upload idle" : `Staging upload ${stagingUploadStatus}`}
                      </span>
                      <button
                        type="button"
                        onClick={testStagingUpload}
                        disabled={stagingUploadStatus === "uploading"}
                        className="rounded-md border border-cyan-400/60 px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {stagingUploadStatus === "uploading" ? "Testing..." : "Test Staging Upload"}
                      </button>
                    </div>
                    {currentStagingUploadResult ? (
                      <div className="mt-2 space-y-2 text-xs">
                        {currentStagingUploadResult.asset ? (
                          <dl className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-2 gap-y-1 text-neutral-400">
                            <dt>Filename</dt>
                            <dd className="truncate text-neutral-200">{currentStagingUploadResult.asset.filename}</dd>
                            <dt>Type</dt>
                            <dd className="truncate text-neutral-200">{currentStagingUploadResult.asset.contentType}</dd>
                            <dt>Size</dt>
                            <dd className="text-neutral-200">{formatFileSize(currentStagingUploadResult.asset.size)}</dd>
                            <dt>Purpose</dt>
                            <dd className="text-neutral-200">{currentStagingUploadResult.asset.purpose}</dd>
                            <dt>Staging</dt>
                            <dd className="text-neutral-200">{String(currentStagingUploadResult.asset.stagingOnly)}</dd>
                            {currentStagingUploadResult.asset.url ? (
                              <>
                                <dt>URL</dt>
                                <dd className="truncate text-cyan-200">{currentStagingUploadResult.asset.url}</dd>
                              </>
                            ) : null}
                          </dl>
                        ) : null}
                        {currentStagingUploadResult.warnings.length > 0 ? (
                          <ul className="space-y-1 rounded-md border border-yellow-400/30 bg-yellow-950/20 p-2 text-yellow-100">
                            {currentStagingUploadResult.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        ) : null}
                        {currentStagingUploadResult.errors.length > 0 ? (
                          <ul className="space-y-1 rounded-md border border-red-400/30 bg-red-950/20 p-2 text-red-100">
                            {currentStagingUploadResult.errors.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </PanelCard>

            <PanelCard title="AI Tools">
              <div className="grid grid-cols-2 gap-2">
                {(["Background Remover", "Image Enhancer", "Vectorizer", "Generate Idea"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => runAiPlaceholder(item)}
                    className="rounded-md border border-cyan-500/60 px-2.5 py-1.5 text-left text-xs font-semibold text-cyan-100"
                  >
                    {isAiLoading ? "Checking..." : item}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs leading-5 text-neutral-400">
                AI actions are staging placeholders only. No production endpoints are called.
              </p>
            </PanelCard>

            <PanelCard title="Add Content">
              <div className="grid grid-cols-2 gap-2">
                <ToolButton label="Add Text" onClick={addTextLayer} />
                <ToolButton label="Shapes" onClick={() => setStatusOnly("Shapes are a staging placeholder.")} />
                <ToolButton label="Graphics" onClick={() => setStatusOnly("Graphics are a staging placeholder.")} />
              </div>
            </PanelCard>

            <PanelCard title="Text Editing">
              <div className="space-y-2 text-sm">
                {selectedLayer?.type === "text" ? (
                  <input
                    aria-label="Edit selected text layer"
                    value={selectedLayer.text || ""}
                    onChange={(event) => updateSelectedLayer({ text: event.target.value }, "Selected text updated.")}
                    className="w-full rounded-md border border-[#2c424a] bg-[#081114] px-2 py-1.5 text-xs text-neutral-200"
                  />
                ) : (
                  <p className="rounded-md border border-[#2c424a] bg-[#081114] px-2 py-1.5 text-xs text-neutral-500">
                    Select a text layer to edit copy.
                  </p>
                )}
                <div className="grid grid-cols-[1fr_76px] gap-2">
                  <select
                    aria-label="Font"
                    value={selectedLayer?.fontId || getFontByFamily(selectedLayer?.fontFamily).id}
                    onChange={(event) => {
                      const font = getFontById(event.target.value);
                      updateSelectedLayer({ fontId: font.id, fontFamily: font.cssFontFamily }, `${font.label} applied to selected layer.`);
                    }}
                    className="min-w-0 rounded-md border border-[#2c424a] bg-[#081114] px-2 py-1.5 text-xs text-neutral-200"
                  >
                    {FONT_CATEGORIES.map((category) => (
                      <optgroup key={category} label={category}>
                        {FONT_REGISTRY.filter((font) => font.category === category).map((font) => (
                          <option key={font.id} value={font.id}>{font.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <input
                    aria-label="Font size"
                    type="number"
                    min="8"
                    max="120"
                    value={selectedLayer?.fontSize || 42}
                    onChange={(event) => updateSelectedLayer({ fontSize: Number(event.target.value), height: clamp(Number(event.target.value) / 1.5, 8, 60) }, `Font size ${event.target.value} applied.`)}
                    className="rounded-md border border-[#2c424a] bg-[#081114] px-2 py-1.5 text-xs text-neutral-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Text color swatch"
                    value={selectedLayer?.color || "#67e8f9"}
                    onChange={(event) => updateSelectedLayer({ color: event.target.value }, "Selected layer color updated.")}
                    className="h-8 w-10 rounded-md border border-cyan-300 bg-cyan-300 p-0.5"
                  />
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    {["Bold", "Italic"].map((item) => (
                      <ToolButton key={item} label={item} onClick={() => setStatusOnly(`${item} text control is staged.`)} />
                    ))}
                  </div>
                </div>
              </div>
            </PanelCard>

            <PanelCard title="Image Tools">
              <div className="space-y-3">
                <div className="rounded-md border border-[#263d45] bg-[#081114] p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Image Fit</p>
                    <span className="text-[10px] uppercase tracking-wide text-neutral-500">
                      {selectedImageLayer?.fitMode || "select image"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ToolButton label="Fit Proportional" onClick={() => updateSelectedImageFit("contain")} />
                    <ToolButton label="Fill / Crop" onClick={() => updateSelectedImageFit("cover")} />
                    <ToolButton label="Stretch to Area" onClick={() => updateSelectedImageFit("stretch")} />
                  </div>
                </div>
              </div>
            </PanelCard>

            <PanelCard title="Positioning">
              <div className="min-h-[344px] space-y-3 [font-variant-numeric:tabular-nums]">
                <Slider
                  label="Scale"
                  value={safeScale}
                  min={8}
                  max={100}
                  onChange={updateLayerScale}
                />
                {selectedImageLayer ? (
                  <div className="min-h-[104px] rounded-md border border-[#263d45] bg-[#081114] p-2">
                    <Slider
                      label="Image Width"
                      value={safeNumber(selectedImageLayer.width, 6, 100, 56)}
                      min={6}
                      max={100}
                      onChange={updateLayerWidth}
                    />
                    <Slider
                      label="Image Height"
                      value={safeNumber(selectedImageLayer.height, 6, 100, 42)}
                      min={6}
                      max={100}
                      onChange={updateLayerHeight}
                    />
                  </div>
                ) : null}
                <Slider
                  label="X Position"
                  value={safeX}
                  min={selectedLayerBounds.minX}
                  max={selectedLayerBounds.maxX}
                  onChange={updateLayerX}
                />
                <Slider
                  label="Y Position"
                  value={safeY}
                  min={selectedLayerBounds.minY}
                  max={selectedLayerBounds.maxY}
                  onChange={updateLayerY}
                />
                <Slider
                  label="Rotation"
                  value={safeRotation}
                  min={-30}
                  max={30}
                  onChange={updateLayerRotation}
                />
              </div>
            </PanelCard>

            <PanelCard title="Design Info">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">Canvas</dt><dd className="text-neutral-200">{state.mode === "apparel" ? "12 x 16 in" : safeTransferSize}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">DPI</dt><dd className="text-neutral-200">300 preview</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">Mode</dt><dd className="text-neutral-200">{state.mode}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-neutral-500">Quality</dt><dd className="text-emerald-300">Good Quality / Print Ready</dd></div>
              </dl>
            </PanelCard>
          </div>
        </aside>

        <section className="flex min-h-[620px] flex-col bg-[#121a1f] p-2 xl:h-full xl:min-h-0 xl:overflow-hidden">
          <div className="mb-1 grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
            <label className="min-h-[58px] cursor-pointer rounded-lg border border-cyan-400/50 bg-cyan-300 p-2 text-left text-[#061015] shadow-[0_10px_24px_rgba(34,211,238,0.18)] transition hover:bg-cyan-200">
              <span className="flex items-center justify-between gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-[#061015] text-[10px] font-black text-cyan-200">UP</span>
                <span className="h-1 w-10 rounded-full bg-[#061015]/40" />
              </span>
              <span className="mt-1 block text-sm font-black leading-4">Upload Artwork</span>
              <span className="mt-0.5 block text-xs font-semibold leading-4">PNG, JPG, SVG</span>
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
            <QuickActionCard title={isCarting ? "Preparing..." : "Add to Cart"} detail="Preview payload only" icon="ATC" accent="bg-emerald-300" onClick={addToPreviewCart} />
            <div className="relative">
              <QuickActionCard
                title={state.mode === "apparel" ? "Color Variants" : "Size Variants"}
                detail={state.mode === "apparel" ? `${selectedColor.label || selectedColor.hex} / ${configuredColors.length} colors` : safeTransferSize}
                icon={state.mode === "apparel" ? "CLR" : "SZ"}
                accent="bg-violet-300"
                onClick={() => {
                  if (state.mode !== "apparel") {
                    setStatusOnly("Transfer sizes are selected in the transfer size controls.");
                    return;
                  }
                  setIsColorPickerOpen((open) => !open);
                }}
              />
              {state.mode === "apparel" && isColorPickerOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-lg border border-cyan-300/40 bg-[#071015] p-2 shadow-[0_18px_48px_rgba(0,0,0,0.5)]">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">Product Color</p>
                    <button
                      type="button"
                      onClick={() => setIsColorPickerOpen(false)}
                      className="rounded border border-[#2c424a] px-1.5 py-0.5 text-[10px] font-semibold text-neutral-300 transition hover:border-cyan-300"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {configuredColors.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => selectProductColor(color)}
                        title={color.label || color.hex}
                        className={`grid h-8 place-items-center rounded-full border transition ${
                          selectedColor?.hex === color.hex ? "border-cyan-200 ring-2 ring-cyan-300/70" : "border-white/20 hover:border-cyan-300/70"
                        }`}
                        style={{ backgroundColor: color.hex }}
                      >
                        <span className="sr-only">{color.label || color.hex}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 truncate text-xs font-semibold text-neutral-300">{selectedColor.label || selectedColor.hex}</p>
                </div>
              ) : null}
            </div>
            <QuickActionCard title={isSaving ? "Saving..." : "Save Design"} detail="Local staging save" icon="SV" accent="bg-yellow-300" onClick={saveDesign} />
          </div>

          <div className="mb-1 flex shrink-0 justify-end">
            <button
              type="button"
              onClick={loadStagingConfig}
              className="rounded-md border border-cyan-400/50 bg-[#081114] px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300"
            >
              Load Setup Config
            </button>
          </div>

          <div className="mb-1.5 shrink-0 rounded-xl border border-[#26343b] bg-[#0b1215] p-2">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">{state.mode === "apparel" ? "Current View" : "Choose Transfer Size"}</p>
                <p className="mt-0.5 text-base font-semibold text-white">{state.mode === "apparel" ? getCanvasLabel(state) : `${safeTransferSize} Transfer`}</p>
              </div>
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                {(state.mode === "apparel" ? APPAREL_VIEWS.map((view) => view.label) : configuredTransferSizes.map((size) => size.id)).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      if (state.mode === "apparel") {
                        const match = APPAREL_VIEWS.find((view) => view.label === item);
                        if (match) setState((current) => ({ ...current, activeView: match.id, status: `${match.label} preview active.` }));
                      } else {
                        setState((current) => ({ ...current, transferSize: item, status: `${item} transfer preview active.` }));
                      }
                    }}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                      (state.mode === "apparel" && item === getCanvasLabel(state)) || (state.mode === "transfer" && item === safeTransferSize)
                        ? "border-cyan-300 bg-cyan-300 text-neutral-950"
                        : "border-[#2c424a] bg-[#081114] text-neutral-200"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`relative grid min-h-[390px] min-w-0 flex-1 place-items-center overflow-hidden rounded-xl border border-[#2d454f] p-1.5 xl:min-h-0 ${
              state.mode === "apparel"
                ? "bg-[#070d10]"
                : "bg-[radial-gradient(circle_at_50%_42%,rgba(86,166,188,0.3)_0%,rgba(22,36,43,0.82)_34%,#070d10_75%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_28px_90px_rgba(0,0,0,0.42)]"
            }`}
          >
            {state.usingSafeDefaults ? (
              <div className="absolute left-3 top-3 z-30 rounded-full border border-yellow-400/40 bg-yellow-950/80 px-3 py-1 text-xs font-semibold text-yellow-100">
                Using safe preview defaults.
              </div>
            ) : null}
            {stagingConfigWarning ? (
              <div className="absolute right-3 top-3 z-30 rounded-full border border-yellow-400/40 bg-yellow-950/80 px-3 py-1 text-xs font-semibold text-yellow-100">
                {stagingConfigWarning}
              </div>
            ) : null}
            {printAreaResult.usingFallback ? (
              <div className="absolute right-3 top-10 z-30 rounded-full border border-yellow-400/40 bg-yellow-950/80 px-3 py-1 text-xs font-semibold text-yellow-100">
                Print area clamped to safe bounds.
              </div>
            ) : null}
            {mockupLoadFailed ? (
              <div className="absolute left-3 top-10 z-30 rounded-full border border-yellow-400/40 bg-yellow-950/80 px-3 py-1 text-xs font-semibold text-yellow-100">
                Staged mockup failed to load. Using fallback.
              </div>
            ) : null}
            <div
              className={`relative aspect-[5/6] min-h-[360px] max-w-full shrink-0 overflow-visible rounded-2xl ${
                state.mode === "apparel"
                  ? "border border-transparent bg-transparent shadow-none"
                  : "border border-white/20 bg-[linear-gradient(145deg,#f8fbff_0%,#dce6ef_46%,#ffffff_100%)] shadow-[0_38px_100px_rgba(0,0,0,0.58),0_0_0_1px_rgba(103,232,249,0.12),inset_0_1px_0_rgba(255,255,255,0.85)]"
              }`}
              style={{
                height: `min(calc(100% - 2px), ${previewMaxHeight}px)`,
                maxWidth: "min(100%, 900px)",
              }}
            >
              {displayMockupUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayMockupUrl}
                  alt={safeMockupUrl ? "Configured staging mockup" : displayMockupLabel}
                  className="absolute inset-0 z-0 h-full w-full rounded-2xl object-contain"
                  onError={() => {
                    setBrokenMockupUrls((current) => current.includes(displayMockupUrl) ? current : [...current, displayMockupUrl]);
                  }}
                />
              ) : null}
              {state.mode === "apparel" ? (
                <div className={`absolute inset-0 grid place-items-center overflow-hidden ${displayMockupUrl ? "opacity-0" : ""}`}>
                  <div className="relative h-[90%] w-[72%]">
                    <div className="absolute left-[21%] top-[3%] h-[15%] w-[58%] rounded-b-[46%] bg-[linear-gradient(180deg,#1b2024_0%,#080b0d_82%)] shadow-[inset_0_-10px_18px_rgba(0,0,0,0.55)]" />
                    <div className="absolute left-[-19%] top-[18%] h-[26%] w-[40%] -rotate-[18deg] rounded-[20px_24px_18px_16px] bg-[linear-gradient(145deg,#1d2428_0%,#07090a_76%)] shadow-[inset_10px_0_22px_rgba(255,255,255,0.03),0_16px_20px_rgba(0,0,0,0.28)]" />
                    <div className="absolute right-[-19%] top-[18%] h-[26%] w-[40%] rotate-[18deg] rounded-[24px_20px_16px_18px] bg-[linear-gradient(215deg,#1d2428_0%,#07090a_76%)] shadow-[inset_-10px_0_22px_rgba(255,255,255,0.03),0_16px_20px_rgba(0,0,0,0.28)]" />
                    <div className="absolute inset-x-[7%] top-[12%] h-[82%] rounded-[48px_48px_20px_20px] bg-[linear-gradient(115deg,#20272b_0%,#090c0e_48%,#151c20_100%)] shadow-[inset_34px_0_56px_rgba(255,255,255,0.045),inset_-38px_0_58px_rgba(0,0,0,0.42),inset_0_20px_26px_rgba(255,255,255,0.04),0_24px_34px_rgba(0,0,0,0.3)]" />
                    <div className="absolute inset-x-[16%] top-[18%] h-[72%] rounded-[36px_36px_18px_18px] bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.11),transparent_28%),repeating-linear-gradient(90deg,rgba(255,255,255,0.028)_0_1px,transparent_1px_6px),linear-gradient(90deg,rgba(255,255,255,0.045),transparent_22%,rgba(0,0,0,0.2)_70%,rgba(255,255,255,0.03))] opacity-90" />
                    <div className="absolute inset-x-[11%] bottom-[7%] h-px bg-white/8" />
                  </div>
                </div>
              ) : (
                <div className={`absolute inset-0 grid place-items-center overflow-hidden bg-[linear-gradient(145deg,#eef6fb_0%,#dce6ef_100%)] ${displayMockupUrl ? "opacity-0" : ""}`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.7),transparent_30%)]" />
                  <div className="h-[90%] w-[66%] rounded-md border border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] shadow-[0_28px_60px_rgba(15,23,42,0.22),inset_0_0_0_1px_rgba(255,255,255,0.8)]" />
                </div>
              )}

              <div
                className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 ${
                  hasBakedPrintGuide
                    ? "border border-transparent bg-transparent"
                    : "border border-dashed bg-transparent"
                }`}
                style={{
                  ...getPrintAreaStyle(printAreaResult.area),
                  borderColor: printAreaGuideColor,
                  boxShadow: state.mode === "apparel" ? "none" : "0 0 0 1px rgba(8,47,73,0.35), 0 0 32px rgba(34,211,238,0.16)",
                  opacity: state.mode === "apparel" ? 0.72 : 1,
                }}
              >
                <span className="absolute -right-1 -top-5 text-[10px] font-semibold uppercase tracking-wide text-cyan-100/80">
                  {state.mode === "apparel"
                    ? `${measurementReference.width}" x ${measurementReference.height}"`
                    : `${measurementReference.width} x ${measurementReference.height}`}
                </span>
                {selectedLayer ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute z-30"
                    style={{
                      left: `${selectedLayer.x}%`,
                      top: `${selectedLayer.y}%`,
                      width: `${selectedLayer.width}%`,
                      height: `${selectedLayer.height}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="absolute -top-4 left-0 h-px w-full bg-cyan-200/90 shadow-[0_0_12px_rgba(103,232,249,0.45)]">
                      <span className="absolute left-1/2 top-[-18px] -translate-x-1/2 rounded-sm border border-cyan-200/40 bg-[#071015]/90 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-50">
                        {formatInches(selectedWidthInches)}
                      </span>
                    </div>
                    <div className="absolute -left-4 top-0 h-full w-px bg-cyan-200/90 shadow-[0_0_12px_rgba(103,232,249,0.45)]">
                      <span className="absolute left-[-28px] top-1/2 -translate-y-1/2 -rotate-90 rounded-sm border border-cyan-200/40 bg-[#071015]/90 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-50">
                        {formatInches(selectedHeightInches)}
                      </span>
                    </div>
                  </div>
                ) : null}
                <div className="absolute inset-0 overflow-hidden">
                  {activeLayers.length > 0 ? (
                    activeLayers.filter((layer) => !layer.hidden).sort((a, b) => a.zIndex - b.zIndex).map((layer) => {
                      const isSelected = layer.id === selectedLayer?.id;
                      const commonStyle = {
                        left: `${layer.x}%`,
                        top: `${layer.y}%`,
                        width: `${layer.width}%`,
                        height: `${layer.height}%`,
                        transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                        opacity: layer.opacity,
                        zIndex: layer.zIndex,
                      };

                      if (layer.type === "image" && layer.sourceUrl) {
                        const fitMode = layer.fitMode || "contain";
                        const cropZoom = safeNumber(layer.cropZoom || 100, fitMode === "cover" ? 100 : 60, 220, 100);
                        const cropX = safeNumber(layer.cropX || 50, 0, 100, 50);
                        const cropY = safeNumber(layer.cropY || 50, 0, 100, 50);
                        const imageObjectFit =
                          fitMode === "contain" ? "contain" : fitMode === "cover" ? "cover" : "fill";
                        return (
                          <button
                            key={layer.id}
                            type="button"
                            onClick={() => setState((current) => ({ ...current, selectedLayerId: layer.id, status: `${layer.name} selected.` }))}
                            className={`absolute cursor-pointer overflow-hidden rounded-sm border border-transparent shadow-[0_10px_18px_rgba(0,0,0,0.22)] ${isSelected ? "ring-2 ring-cyan-200" : ""}`}
                            style={{
                              ...commonStyle,
                              mixBlendMode: state.mode === "apparel" ? effectiveBlendMode : "normal",
                            }}
                            aria-label={layer.sourceName || layer.name}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={layer.sourceUrl}
                              alt={layer.sourceName || layer.name}
                              className="pointer-events-none absolute inset-0 h-full w-full max-w-none"
                              style={{
                                transform: fitMode === "cover" ? `scale(${cropZoom / 100})` : "none",
                                transformOrigin: `${cropX}% ${cropY}%`,
                                objectFit: imageObjectFit,
                                objectPosition: fitMode === "cover" ? `${cropX}% ${cropY}%` : "50% 50%",
                              }}
                              draggable={false}
                            />
                          </button>
                        );
                      }

                      if (layer.type === "shape") {
                        return (
                          <button
                            key={layer.id}
                            type="button"
                            onClick={() => setState((current) => ({ ...current, selectedLayerId: layer.id, status: `${layer.name} selected.` }))}
                            className={`absolute cursor-pointer rounded-lg border border-white/20 shadow-[0_8px_18px_rgba(0,0,0,0.18)] ${isSelected ? "ring-2 ring-cyan-200" : ""}`}
                            style={{ ...commonStyle, backgroundColor: layer.color }}
                            aria-label={layer.name}
                          />
                        );
                      }

                      if (layer.type === "placeholder" || layer.type === "image-placeholder") {
                        return (
                          <button
                            key={layer.id}
                            type="button"
                            onClick={() => setState((current) => ({ ...current, selectedLayerId: layer.id, status: `${layer.name} selected. Upload artwork to replace it.` }))}
                            className={`absolute grid cursor-pointer place-items-center rounded-lg border border-dashed border-cyan-200/80 bg-[#071015]/78 px-2 text-center text-[10px] font-black uppercase tracking-wide text-cyan-100 shadow-[0_8px_18px_rgba(0,0,0,0.22)] ${isSelected ? "ring-2 ring-cyan-200" : ""}`}
                            style={commonStyle}
                          >
                            {layer.text || "Upload Logo"}
                          </button>
                        );
                      }

                      return (
                        <button
                          key={layer.id}
                          type="button"
                          onClick={() => setState((current) => ({ ...current, selectedLayerId: layer.id, status: `${layer.name} selected.` }))}
                          className={`absolute grid cursor-pointer place-items-center overflow-visible px-1 text-center font-black leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] ${isSelected ? "ring-2 ring-cyan-200" : ""}`}
                          style={{
                            ...commonStyle,
                            color: layer.color,
                            fontFamily: layer.fontFamily,
                            fontSize: `${layer.fontSize}px`,
                            lineHeight: 1.08,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {layer.text || "Edit Text"}
                        </button>
                      );
                    })
                  ) : (
                    <div className="grid h-full place-items-center px-4 text-center text-xs font-semibold uppercase tracking-wide text-cyan-100/70">
                      Upload artwork
                    </div>
                  )}
                  {state.mode === "apparel" && textureOverlayEnabled ? (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(105deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.025) 28%, rgba(0,0,0,0.18) 62%, rgba(255,255,255,0.05) 100%), repeating-linear-gradient(88deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 5px), radial-gradient(circle at 42% 18%, rgba(255,255,255,0.13), transparent 38%)",
                        mixBlendMode: "soft-light",
                        opacity: fabricBlendEnabled ? 0.5 : 0.22,
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>

        </section>

        <section className={`${mobilePanel === "assistant" || mobilePanel === "order" ? "block" : "hidden"} border-t border-[#1e2a2f] bg-[#11181c] p-2.5 pt-3 lg:block lg:border-l lg:border-t-0 xl:h-full xl:min-h-0 xl:overflow-y-auto xl:[scrollbar-color:#27515d_#081114] xl:[scrollbar-width:thin]`}>
          <div className="space-y-3">
            {state.mode === "transfer" ? (
              <PanelCard title="How It Works">
                <ol className="space-y-2 text-sm text-neutral-400">
                  <li>1. Choose a transfer size.</li>
                  <li>2. Upload artwork and fit it to the sheet.</li>
                  <li>3. Save or prepare a preview cart payload.</li>
                </ol>
              </PanelCard>
            ) : null}

            <div className={`${mobilePanel === "assistant" ? "block" : "hidden"} lg:block`}>
              <PanelCard title="Editable Templates">
              <p className="text-xs leading-5 text-neutral-400">
                Choose from premade editable designs, then customize text, artwork, colors, and placement.
              </p>
              <p className="mt-1 text-xs font-semibold text-cyan-200">Hundreds of editable templates available.</p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setIsTemplateLibraryOpen(true)}
                  className="w-full rounded-lg border border-cyan-300 bg-cyan-300 px-3 py-2.5 text-left text-sm font-black text-neutral-950 shadow-[0_12px_28px_rgba(34,211,238,0.18)] transition hover:bg-cyan-200"
                >
                  Browse Editable Templates
                  <span className="mt-1 block text-xs font-semibold text-neutral-800">
                    Search logos, jerseys, labels, transfers, and more.
                  </span>
                </button>
              </div>
              </PanelCard>
            </div>

            <div className={`${mobilePanel === "assistant" ? "block" : "hidden"} lg:block`}>
              <PanelCard title="Mockup Realism">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Realistic Mockup Preview</p>
                      <p className="text-xs text-neutral-400">{state.mode === "apparel" ? "Fabric effects on apparel only" : "Transfer preview stays clean"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFabricBlendEnabled((enabled) => !enabled);
                        setStatusOnly("Fabric blend preview updated. No production behavior was changed.");
                      }}
                      disabled={state.mode !== "apparel"}
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        fabricBlendEnabled && state.mode === "apparel"
                          ? "border-cyan-300 bg-cyan-300 text-neutral-950"
                          : "border-[#2c424a] bg-[#071015] text-neutral-200"
                      }`}
                    >
                      {fabricBlendEnabled ? "On" : "Off"}
                    </button>
                  </div>
                  <div className="grid grid-cols-[1fr_96px] gap-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      Blend Mode
                      <select
                        value={mockupBlendMode}
                        onChange={(event) => {
                          setMockupBlendMode(event.target.value as MockupBlendMode);
                          setStatusOnly("Blend mode preview updated. Apparel artwork only.");
                        }}
                        disabled={state.mode !== "apparel"}
                        className="mt-1.5 w-full rounded-md border border-[#2c424a] bg-[#081114] px-2 py-1.5 text-xs text-neutral-200 disabled:opacity-50"
                      >
                        {MOCKUP_BLEND_MODES.map((mode) => (
                          <option key={mode} value={mode}>{mode}</option>
                        ))}
                      </select>
                    </label>
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      Opacity
                      <div className="mt-1.5 rounded-md border border-[#2c424a] bg-[#081114] px-2 py-1.5 text-right text-neutral-200">
                        {safeArtworkOpacity}%
                      </div>
                    </div>
                  </div>
                  <Slider
                    label="Ink Opacity"
                    value={safeArtworkOpacity}
                    min={45}
                    max={100}
                    onChange={(opacity) => {
                      setArtworkOpacity(opacity);
                      setStatusOnly("Ink opacity preview updated. Source artwork was not changed.");
                    }}
                  />
                </div>
              </PanelCard>
            </div>

            {state.mode === "apparel" ? (
              <PanelCard title="Get Started in 3 Easy Steps">
                <ol className="space-y-2 text-sm text-neutral-400">
                  <li>1. Upload artwork to a garment view.</li>
                  <li>2. Adjust placement and choose a template.</li>
                  <li>3. Save locally or prepare a test cart payload.</li>
                </ol>
              </PanelCard>
            ) : (
              <PanelCard title="Product / Material Options">
                <div className="grid gap-2">
                  {configuredMaterials.map((option) => (
                    <button key={option} type="button" onClick={() => setStatusOnly(`${option} selected for preview.`)} className="rounded-md border border-[#2c424a] px-3 py-2 text-left text-sm text-neutral-200">
                      {option}
                    </button>
                  ))}
                </div>
              </PanelCard>
            )}

            <div className={`${mobilePanel === "order" ? "block" : "hidden"} lg:block`}>
              <PanelCard title="Preview Order">
                <details open={isPreviewOrderOpen} onToggle={(event) => setIsPreviewOrderOpen(event.currentTarget.open)}>
                  <summary className="cursor-pointer text-sm font-semibold text-cyan-100">Preview order status</summary>
                  <dl className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-neutral-500">Mode</dt>
                      <dd className="text-neutral-200">{state.mode}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-neutral-500">Target</dt>
                      <dd className="text-neutral-200">{getCanvasLabel(state)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-neutral-500">Template</dt>
                      <dd className="text-neutral-200">{state.selectedTemplate}</dd>
                    </div>
                  </dl>
                  {stagingConfig?.stagingSettings?.pricingPreview ? (
                    <div className="mt-3 rounded-md border border-[#263d45] bg-[#081114] p-3 text-xs text-neutral-300">
                      <div className="font-semibold uppercase tracking-wide text-cyan-200">Staging Pricing Preview</div>
                      <dl className="mt-2 grid grid-cols-2 gap-2">
                        <dt className="text-neutral-500">Base</dt>
                        <dd className="text-right">${Number(stagingConfig.stagingSettings.pricingPreview.basePrice || 0).toFixed(2)}</dd>
                        <dt className="text-neutral-500">Per sq in</dt>
                        <dd className="text-right">${Number(stagingConfig.stagingSettings.pricingPreview.pricePerSquareInch || 0).toFixed(2)}</dd>
                        <dt className="text-neutral-500">Rush</dt>
                        <dd className="text-right">${Number(stagingConfig.stagingSettings.pricingPreview.rushFee || 0).toFixed(2)}</dd>
                      </dl>
                      <p className="mt-2 text-neutral-500">{stagingConfig.stagingSettings.pricingPreview.quantityBreaks || "Quantity breaks staged only."}</p>
                    </div>
                  ) : null}
                  <div className="mt-3 rounded-md border border-[#263d45] bg-[#081114] p-2.5 text-xs text-neutral-300">
                    <div className="font-semibold uppercase tracking-wide text-cyan-200">Staging Asset URLs</div>
                    <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5">
                      <dt className="text-neutral-500">Hosted Artwork URL</dt>
                      <dd className={getAssetStatusClass(hostedArtworkStatus)}>
                        {hostedArtworkStatus}
                      </dd>
                      <dt className="text-neutral-500">Preview Image URL</dt>
                      <dd className={getAssetStatusClass(hostedPreviewImageStatus)}>
                        {hostedPreviewImageStatus}
                      </dd>
                      <dt className="text-neutral-500">Design JSON URL</dt>
                      <dd className={getAssetStatusClass(hostedDesignJsonStatus)}>
                        {hostedDesignJsonStatus}
                      </dd>
                      <dt className="text-neutral-500">Print Ready File URL</dt>
                      <dd className={getAssetStatusClass("future")}>future</dd>
                    </dl>
                    <details className="mt-2">
                      <summary className="cursor-pointer font-semibold text-cyan-100">Show hosted URL details</summary>
                      <div className="mt-2 max-h-28 space-y-1 overflow-auto rounded-md bg-[#05090b] p-2 [scrollbar-color:#27515d_#081114] [scrollbar-width:thin]">
                        <p className="break-all text-cyan-200">Artwork: {hostedArtworkUrl || "missing"}</p>
                        <p className="break-all text-cyan-200">Preview: {hostedPreviewImageUrl || "pending"}</p>
                        <p className="break-all text-cyan-200">Design JSON: {hostedDesignJsonUrl || "pending"}</p>
                      </div>
                    </details>
                  </div>
                  <div className="mt-3 rounded-md border border-[#263d45] bg-[#081114] p-2.5 text-xs text-neutral-300">
                    <div className="font-semibold uppercase tracking-wide text-cyan-200">Print-Ready Plan</div>
                    <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5">
                      <dt className="text-neutral-500">Status</dt>
                      <dd className="text-cyan-200">{printReadyPlan.status}</dd>
                      <dt className="text-neutral-500">Print Size</dt>
                      <dd className="text-neutral-200">
                        {printReadyPlan.printWidthInches}&quot; x {printReadyPlan.printHeightInches}&quot;
                      </dd>
                      <dt className="text-neutral-500">DPI Target</dt>
                      <dd className="text-neutral-200">{printReadyPlan.dpiTarget}</dd>
                      <dt className="text-neutral-500">Transparent BG</dt>
                      <dd className="text-neutral-200">{printReadyPlan.transparentBackgroundRequired ? "required" : "optional"}</dd>
                      <dt className="text-neutral-500">Print Ready URL</dt>
                      <dd className={getAssetStatusClass("future")}>future</dd>
                    </dl>
                    {printReadyPlan.warnings.length > 0 ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-semibold text-yellow-100">Show print-ready warnings</summary>
                        <ul className="mt-2 max-h-24 space-y-1 overflow-auto rounded-md bg-[#05090b] p-2 text-yellow-100 [scrollbar-color:#27515d_#081114] [scrollbar-width:thin]">
                          {printReadyPlan.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </div>
                  <div className="mt-3 rounded-lg border border-[#20343b] bg-[#071015] p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${getUploadStatusClass(designJsonStatus)}`}>
                        Design JSON {designJsonStatus}
                      </span>
                      <button
                        type="button"
                        onClick={testSaveDesignJson}
                        disabled={designJsonStatus === "uploading"}
                        className="rounded-md border border-cyan-400/60 px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {designJsonStatus === "uploading" ? "Saving..." : "Test Save Design JSON"}
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${getUploadStatusClass(previewImageStatus)}`}>
                        Preview Image {previewImageStatus}
                      </span>
                      <button
                        type="button"
                        onClick={testGeneratePreviewImage}
                        disabled={previewImageStatus === "uploading"}
                        className="rounded-md border border-cyan-400/60 px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {previewImageStatus === "uploading" ? "Generating..." : "Test Generate Preview Image"}
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${getUploadStatusClass(stagingSaveStatus === "saving" ? "uploading" : stagingSaveStatus)}`}>
                        {stagingSaveStatus === "idle" ? "Staging save idle" : `Staging save ${stagingSaveStatus}`}
                      </span>
                      <button
                        type="button"
                        onClick={testSavePayload}
                        disabled={stagingSaveStatus === "saving"}
                        className="rounded-md border border-cyan-400/60 px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {stagingSaveStatus === "saving" ? "Testing..." : "Test Save Payload"}
                      </button>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-cyan-100">Show local payload JSON</summary>
                      <pre className="mt-2 max-h-28 overflow-auto rounded-md bg-[#080c0e] p-2 text-xs text-neutral-400 [scrollbar-color:#27515d_#081114] [scrollbar-width:thin]">
                        {JSON.stringify(previewPayload, null, 2)}
                      </pre>
                    </details>
                    <div className="mt-2 max-h-64 overflow-auto pr-1 [scrollbar-color:#27515d_#081114] [scrollbar-width:thin]">
                      {designJsonResult ? (
                      <div className="rounded-md border border-[#263d45] bg-[#081114] p-2 text-xs">
                        <div className="font-semibold text-cyan-100">Design JSON Asset</div>
                        {designJsonResult.asset?.url ? <p className="mt-1 break-all text-emerald-200">{designJsonResult.asset.url}</p> : null}
                        {designJsonResult.warnings.length > 0 ? <p className="mt-1 text-yellow-100">{designJsonResult.warnings[0]}</p> : null}
                        {designJsonResult.errors.length > 0 ? <p className="mt-1 text-red-100">{designJsonResult.errors[0]}</p> : null}
                      </div>
                      ) : null}
                      {previewImageResult ? (
                      <div className="mt-2 rounded-md border border-[#263d45] bg-[#081114] p-2 text-xs">
                        <div className="font-semibold text-cyan-100">Preview Image Asset</div>
                        {previewImageResult.asset?.url ? <p className="mt-1 break-all text-emerald-200">{previewImageResult.asset.url}</p> : null}
                        {previewImageResult.warnings.length > 0 ? <p className="mt-1 text-yellow-100">{previewImageResult.warnings[0]}</p> : null}
                        {previewImageResult.errors.length > 0 ? <p className="mt-1 text-red-100">{previewImageResult.errors[0]}</p> : null}
                      </div>
                      ) : null}
                      {stagingSaveResult ? (
                      <div className="mt-2 space-y-2 text-xs">
                        {stagingSaveResult.savedDesign ? (
                          <dl className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-2 gap-y-1 text-neutral-400">
                            <dt>Saved ID</dt>
                            <dd className="truncate text-neutral-200">{stagingSaveResult.savedDesign.id}</dd>
                            <dt>Created</dt>
                            <dd className="truncate text-neutral-200">{stagingSaveResult.savedDesign.createdAt}</dd>
                            <dt>Staging</dt>
                            <dd className="text-neutral-200">{String(stagingSaveResult.savedDesign.stagingOnly)}</dd>
                          </dl>
                        ) : null}
                        {stagingSaveResult.lineItemPropertiesPreview ? (
                          <details>
                            <summary className="cursor-pointer font-semibold text-cyan-100">Line item preview</summary>
                            <pre className="mt-2 max-h-28 overflow-auto rounded-md bg-[#080c0e] p-2 text-neutral-400">
                              {JSON.stringify(stagingSaveResult.lineItemPropertiesPreview, null, 2)}
                            </pre>
                          </details>
                        ) : null}
                        {stagingSaveResult.warnings.length > 0 ? (
                          <ul className="space-y-1 rounded-md border border-yellow-400/30 bg-yellow-950/20 p-2 text-yellow-100">
                            {stagingSaveResult.warnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        ) : null}
                        {stagingSaveResult.errors.length > 0 ? (
                          <ul className="space-y-1 rounded-md border border-red-400/30 bg-red-950/20 p-2 text-red-100">
                            {stagingSaveResult.errors.map((error) => (
                              <li key={error}>{error}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      ) : null}
                    </div>
                  </div>
                </details>
              </PanelCard>
            </div>
          </div>
        </section>
      </div>

      {isTemplateLibraryOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/70 p-4 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-cyan-300/25 bg-[#0b1519] shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
            <div className="flex shrink-0 flex-col gap-3 border-b border-[#1e343c] p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Editable Templates</p>
                <h2 className="text-xl font-black text-white">{templateDraft ? templateDraft.template.name : "Template Library"}</h2>
                <p className="mt-1 text-sm text-neutral-400">
                  {templateDraft
                    ? "Customize this draft template here. The main customizer will not change until you apply it."
                    : "Choose a starter layout, then customize it before applying it to the main customizer."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeTemplateLibrary}
                className="rounded-md border border-[#2c424a] bg-[#081114] px-3 py-2 text-sm font-semibold text-neutral-200 transition hover:border-cyan-300"
              >
                {templateDraft ? "Cancel" : "Close"}
              </button>
            </div>
            {!templateDraft ? (
              <>
                <div className="grid shrink-0 gap-3 border-b border-[#1e343c] p-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <input
                    type="search"
                    value={templateSearch}
                    onChange={(event) => setTemplateSearch(event.target.value)}
                    placeholder="Search logos, jerseys, labels, transfers..."
                    className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-cyan-300"
                  />
                  <select
                    value={activeTemplateCategory}
                    onChange={(event) => setActiveTemplateCategory(event.target.value as TemplateCategory | "All")}
                    className="rounded-lg border border-[#2c424a] bg-[#071015] px-3 py-2 text-sm text-neutral-100 outline-none transition focus:border-cyan-300"
                  >
                    <option value="All">All Categories</option>
                    {TEMPLATE_CATEGORIES.filter((category) => enabledTemplateCategories.includes(category)).map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 overflow-y-auto p-4 [scrollbar-color:#27515d_#081114] [scrollbar-width:thin]">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredTemplateLibrary.map((template) => {
                      const templateCardImage = getTemplateCardImage(template, brokenTemplatePreviewImages);
                      return (
                      <article
                        key={template.id}
                        className="rounded-xl border border-[#243b43] bg-[linear-gradient(145deg,#101b20,#071015)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      >
                        <div className="mb-3 aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_50%_35%,rgba(103,232,249,0.18),transparent_30%),linear-gradient(145deg,#14242a,#080d10)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={templateCardImage}
                            alt={`${template.name} template thumbnail`}
                            className="h-full w-full object-cover"
                            onError={() => {
                              const hostedThumbnail = template.thumbnailUrl || template.previewImage;
                              if (!hostedThumbnail || templateCardImage !== hostedThumbnail) return;
                              setBrokenTemplatePreviewImages((current) =>
                                current.includes(hostedThumbnail) ? current : [...current, hostedThumbnail]
                              );
                            }}
                          />
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-white">{template.name}</h3>
                            <p className="mt-1 text-xs leading-5 text-neutral-400">{template.description}</p>
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                              {template.layers.length} editable layers
                              {template.targetView ? ` - ${APPAREL_VIEWS.find((view) => view.id === template.targetView)?.label || template.targetView}` : ""}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full border border-cyan-300/30 px-2 py-1 text-[10px] font-semibold text-cyan-200">
                            {template.category}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openTemplateDraft(template)}
                          className="mt-3 w-full rounded-md border border-cyan-300 bg-cyan-300 px-3 py-2 text-sm font-black text-neutral-950 transition hover:bg-cyan-200"
                        >
                          Customize Template
                        </button>
                      </article>
                      );
                    })}
                  </div>
                  {filteredTemplateLibrary.length === 0 ? (
                    <div className="grid min-h-48 place-items-center rounded-xl border border-[#243b43] bg-[#071015] p-6 text-center text-sm text-neutral-400">
                      No templates found for this search. Try another category or keyword.
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
                <aside className="min-h-0 overflow-y-auto rounded-xl border border-[#243b43] bg-[#071015] p-3 [scrollbar-color:#27515d_#081114] [scrollbar-width:thin]">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-200">Layers</p>
                  <div className="space-y-2">
                    {templateDraft.layers.map((layer) => (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => setTemplateDraft((current) => current ? { ...current, selectedLayerId: layer.id, status: `${layer.name} selected in draft.` } : current)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                          layer.id === templateDraft.selectedLayerId
                            ? "border-cyan-300 bg-cyan-300 text-neutral-950"
                            : "border-[#2c424a] bg-[#0b1519] text-neutral-200 hover:border-cyan-300"
                        }`}
                      >
                        <span className="block font-black">{layer.name}</span>
                        <span className="block text-[10px] uppercase tracking-wide opacity-70">{layer.type}{layer.locked ? " - locked" : ""}</span>
                      </button>
                    ))}
                  </div>
                </aside>

                <section className="min-h-0 rounded-xl border border-[#243b43] bg-[#050b0d] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                        {templateDraft.mode === "apparel"
                          ? APPAREL_VIEWS.find((view) => view.id === templateDraft.targetView)?.label || templateDraft.targetView
                          : templateDraft.transferSize}
                      </p>
                      <p className="text-sm text-neutral-400">{templateDraft.layers.length} editable draft layers</p>
                    </div>
                    <span className="rounded-full border border-cyan-300/25 px-3 py-1 text-xs font-semibold text-cyan-100">{templateDraft.template.category}</span>
                  </div>
                  <div className="mx-auto grid aspect-[5/6] max-h-full min-h-[420px] max-w-[680px] place-items-center rounded-xl border border-[#1e343c] bg-[#0b1519] p-5">
                    <div className="relative h-full w-full max-w-[520px]">
                      <div className="absolute left-1/2 top-1/2 h-[82%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-dashed border-cyan-200/45 bg-[#061015]">
                        <span className="absolute -right-1 -top-5 text-[10px] font-semibold uppercase tracking-wide text-cyan-100/80">
                          Draft print area
                        </span>
                        <div className="absolute inset-0 overflow-hidden">
                          {templateDraft.layers.filter((layer) => !layer.hidden).sort((a, b) => a.zIndex - b.zIndex).map((layer) => {
                            const isSelected = layer.id === templateDraft.selectedLayerId;
                            const commonStyle = {
                              left: `${layer.x}%`,
                              top: `${layer.y}%`,
                              width: `${layer.width}%`,
                              height: `${layer.height}%`,
                              transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                              opacity: layer.opacity,
                              zIndex: layer.zIndex,
                            };

                            if (layer.type === "image" && layer.sourceUrl) {
                              return (
                                <button
                                  key={layer.id}
                                  type="button"
                                  onClick={() => setTemplateDraft((current) => current ? { ...current, selectedLayerId: layer.id, status: `${layer.name} selected in draft.` } : current)}
                                  className={`absolute overflow-hidden rounded-sm border border-transparent ${isSelected ? "ring-2 ring-cyan-200" : ""}`}
                                  style={commonStyle}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={layer.sourceUrl} alt={layer.sourceName || layer.name} className="pointer-events-none h-full w-full object-contain" draggable={false} />
                                </button>
                              );
                            }

                            if (layer.type === "shape") {
                              return (
                                <button
                                  key={layer.id}
                                  type="button"
                                  onClick={() => setTemplateDraft((current) => current ? { ...current, selectedLayerId: layer.id, status: `${layer.name} selected in draft.` } : current)}
                                  className={`absolute rounded-lg border border-white/20 ${isSelected ? "ring-2 ring-cyan-200" : ""}`}
                                  style={{ ...commonStyle, backgroundColor: layer.color }}
                                  aria-label={layer.name}
                                />
                              );
                            }

                            if (layer.type === "placeholder" || layer.type === "image-placeholder") {
                              return (
                                <button
                                  key={layer.id}
                                  type="button"
                                  onClick={() => setTemplateDraft((current) => current ? { ...current, selectedLayerId: layer.id, status: `${layer.name} selected. Upload artwork to replace it.` } : current)}
                                  className={`absolute grid place-items-center rounded-lg border border-dashed border-cyan-200/80 bg-[#071015]/85 px-2 text-center text-[10px] font-black uppercase tracking-wide text-cyan-100 ${isSelected ? "ring-2 ring-cyan-200" : ""}`}
                                  style={commonStyle}
                                >
                                  {layer.text || "Upload Logo"}
                                </button>
                              );
                            }

                            return (
                              <button
                                key={layer.id}
                                type="button"
                                onClick={() => setTemplateDraft((current) => current ? { ...current, selectedLayerId: layer.id, status: `${layer.name} selected in draft.` } : current)}
                                className={`absolute grid place-items-center px-1 text-center font-black leading-tight ${isSelected ? "ring-2 ring-cyan-200" : ""}`}
                                style={{
                                  ...commonStyle,
                                  color: layer.color,
                                  fontFamily: layer.fontFamily,
                                  fontSize: `${layer.fontSize}px`,
                                  lineHeight: 1.08,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {layer.text || "Edit Text"}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <aside className="min-h-0 overflow-y-auto rounded-xl border border-[#243b43] bg-[#071015] p-3 [scrollbar-color:#27515d_#081114] [scrollbar-width:thin]">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-200">Draft Controls</p>
                  {templateDraftSelectedLayer ? (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-[#243b43] bg-[#0b1519] p-3">
                        <p className="text-sm font-black text-white">{templateDraftSelectedLayer.name}</p>
                        <p className="text-xs uppercase tracking-wide text-neutral-500">{templateDraftSelectedLayer.type} layer</p>
                      </div>
                      {templateDraftSelectedLayer.type === "text" ? (
                        <>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-400">
                            Text
                            <textarea
                              value={templateDraftSelectedLayer.text || ""}
                              onChange={(event) => updateTemplateDraftLayer({ text: event.target.value }, "Draft text updated.", false)}
                              className="mt-2 h-20 w-full rounded-lg border border-[#2c424a] bg-[#081114] px-3 py-2 text-sm normal-case tracking-normal text-neutral-100 outline-none focus:border-cyan-300"
                            />
                          </label>
                          <select
                            value={templateDraftSelectedLayer.fontId || getFontByFamily(templateDraftSelectedLayer.fontFamily).id}
                            onChange={(event) => {
                              const font = getFontById(event.target.value);
                              updateTemplateDraftLayer({ fontId: font.id, fontFamily: font.cssFontFamily }, "Draft font updated.", false);
                            }}
                            className="w-full rounded-lg border border-[#2c424a] bg-[#081114] px-3 py-2 text-sm text-neutral-100 outline-none focus:border-cyan-300"
                          >
                            {FONT_CATEGORIES.map((category) => (
                              <optgroup key={category} label={category}>
                                {FONT_REGISTRY.filter((font) => font.category === category).map((font) => (
                                  <option key={font.id} value={font.id}>{font.label}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <input
                            type="color"
                            value={templateDraftSelectedLayer.color || "#67e8f9"}
                            onChange={(event) => updateTemplateDraftLayer({ color: event.target.value }, "Draft color updated.", false)}
                            className="h-10 w-full rounded-md border border-[#2c424a] bg-[#081114] p-1"
                          />
                        </>
                      ) : null}
                      {templateDraftSelectedLayer.type === "placeholder" || templateDraftSelectedLayer.type === "image-placeholder" || templateDraftSelectedLayer.type === "image" ? (
                        <label className="block cursor-pointer rounded-lg border border-cyan-300/60 bg-[#0b1519] px-3 py-2 text-center text-sm font-black text-cyan-100 transition hover:bg-[#10242a]">
                          Replace Image
                          <input type="file" accept="image/*" className="sr-only" onChange={handleTemplateDraftUpload} />
                        </label>
                      ) : null}
                      <Slider
                        label="Scale"
                        value={Math.round(Math.max(templateDraftSelectedLayer.width, templateDraftSelectedLayer.height))}
                        min={8}
                        max={100}
                        onChange={updateTemplateDraftLayerScale}
                      />
                      <Slider
                        label="Width"
                        value={Math.round(templateDraftSelectedLayer.width)}
                        min={4}
                        max={100}
                        onChange={(width) => updateTemplateDraftLayer({ width }, "Draft layer width updated.")}
                      />
                      <Slider
                        label="Height"
                        value={Math.round(templateDraftSelectedLayer.height)}
                        min={4}
                        max={100}
                        onChange={(height) => updateTemplateDraftLayer({ height }, "Draft layer height updated.")}
                      />
                      <Slider
                        label="X Position"
                        value={Math.round(safeNumber(templateDraftSelectedLayer.x, templateDraftSelectedBounds.minX, templateDraftSelectedBounds.maxX, 50))}
                        min={templateDraftSelectedBounds.minX}
                        max={templateDraftSelectedBounds.maxX}
                        onChange={updateTemplateDraftLayerX}
                      />
                      <Slider
                        label="Y Position"
                        value={Math.round(safeNumber(templateDraftSelectedLayer.y, templateDraftSelectedBounds.minY, templateDraftSelectedBounds.maxY, 50))}
                        min={templateDraftSelectedBounds.minY}
                        max={templateDraftSelectedBounds.maxY}
                        onChange={updateTemplateDraftLayerY}
                      />
                      <Slider
                        label="Rotation"
                        value={Math.round(templateDraftSelectedLayer.rotation)}
                        min={-30}
                        max={30}
                        onChange={(rotation) => updateTemplateDraftLayer({ rotation }, "Draft rotation updated.", false)}
                      />
                      {!templateDraftSelectedLayer.locked ? (
                        <button
                          type="button"
                          onClick={deleteTemplateDraftLayer}
                          className="w-full rounded-md border border-red-400/50 bg-red-950/30 px-3 py-2 text-sm font-semibold text-red-100 transition hover:border-red-300"
                        >
                          Delete Layer
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[#243b43] bg-[#0b1519] p-4 text-sm text-neutral-400">Select a draft layer to edit it.</div>
                  )}
                </aside>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1e343c] pt-4 lg:col-span-3">
                  <p className="text-sm text-neutral-400">{templateDraft.status}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={applyTemplateDraft}
                      className="rounded-md border border-cyan-300 bg-cyan-300 px-4 py-2 text-sm font-black text-neutral-950 transition hover:bg-cyan-200"
                    >
                      Apply Template
                    </button>
                    <button
                      type="button"
                      onClick={backToTemplateGrid}
                      className="rounded-md border border-[#2c424a] bg-[#081114] px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-cyan-300"
                    >
                      Back to Templates
                    </button>
                    <button
                      type="button"
                      onClick={closeTemplateLibrary}
                      className="rounded-md border border-[#2c424a] bg-[#081114] px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-cyan-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 border-t border-[#1e2a2f] bg-[#0d1316] lg:hidden">
        {[
          ["tools", "Tools"],
          ["assistant", "Helper"],
          ["order", "Order"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobilePanel(id as PanelTab)}
            className={`px-3 py-3 text-sm font-semibold ${mobilePanel === id ? "bg-cyan-300 text-neutral-950" : "text-neutral-300"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="sticky bottom-12 z-40 border-t border-[#1e2a2f] bg-[#0c1114] px-4 py-3 text-sm text-neutral-300 lg:bottom-0 xl:hidden">
        <div className="mx-auto max-w-[1500px]">{state.status}</div>
      </div>
    </main>
  );
}
