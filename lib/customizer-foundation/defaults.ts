import type {
  AiToolSettings,
  FileRules,
  ProductColor,
  ProductCustomizerConfig,
  TransferSize,
} from "./types";

const DEFAULT_COLORS: ProductColor[] = [
  { id: "black", label: "Black", hex: "#101316" },
  { id: "white", label: "White", hex: "#f8fafc" },
  { id: "charcoal", label: "Charcoal", hex: "#334155" },
  { id: "red", label: "Red", hex: "#991b1b" },
  { id: "royal", label: "Royal", hex: "#1d4ed8" },
  { id: "forest", label: "Forest", hex: "#166534" },
];

const DEFAULT_FILE_RULES: FileRules = {
  allowedMimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"],
  maxFileSizeMb: 25,
  minDpi: 150,
  recommendedDpi: 300,
  minPixelWidth: 900,
  minPixelHeight: 900,
  allowTransparentPng: true,
};

const STAGING_AI_TOOLS: AiToolSettings = {
  enabled: false,
  providerConnected: false,
  stagingOnly: true,
  tools: {
    removeBackground: false,
    cleanColors: false,
    upscale: false,
    vectorize: false,
    generateDesign: false,
  },
};

const TRANSFER_SIZES: TransferSize[] = [
  { id: "3x3", label: "3 x 3", width: 3, height: 3, enabled: true },
  { id: "5x5", label: "5 x 5", width: 5, height: 5, enabled: true },
  { id: "8x10", label: "8 x 10", width: 8, height: 10, enabled: true },
  { id: "11x17", label: "11 x 17", width: 11, height: 17, enabled: true },
  { id: "12x24", label: "12 x 24", width: 12, height: 24, enabled: true },
  { id: "13x24", label: "13 x 24", width: 13, height: 24, enabled: true },
  { id: "gang_sheet", label: "Gang Sheet", width: 22, height: 60, isGangSheet: true, enabled: true },
];

export const DEFAULT_CUSTOMIZER_CONFIGS = {
  apparel_customizer: {
    id: "apparel_customizer",
    mode: "apparel_customizer",
    label: "Apparel Customizer",
    productHandle: "custom-t-shirt-upload-customize",
    description: "Staging config for product apparel customization.",
    colors: DEFAULT_COLORS,
    printLocations: [
      {
        id: "front",
        label: "Front",
        printArea: { x: 30, y: 19, width: 42, height: 61 },
        maxPrintWidth: 12,
        maxPrintHeight: 16,
        enabled: true,
      },
      {
        id: "back",
        label: "Back",
        printArea: { x: 25, y: 19, width: 48, height: 59 },
        maxPrintWidth: 12,
        maxPrintHeight: 16,
        enabled: true,
      },
      {
        id: "leftSleeve",
        label: "Left Sleeve",
        printArea: { x: 42, y: 35, width: 16, height: 28 },
        maxPrintWidth: 4,
        maxPrintHeight: 4,
        enabled: true,
      },
      {
        id: "rightSleeve",
        label: "Right Sleeve",
        printArea: { x: 42, y: 35, width: 16, height: 28 },
        maxPrintWidth: 4,
        maxPrintHeight: 4,
        enabled: true,
      },
      {
        id: "neck",
        label: "Neck Tag",
        printArea: { x: 41, y: 13, width: 18, height: 12 },
        maxPrintWidth: 4,
        maxPrintHeight: 3,
        enabled: true,
      },
    ],
    transferSizes: [],
    pricingRules: [
      { id: "apparel_base", label: "Base apparel preview", appliesTo: "product", unitPrice: 0, currency: "USD" },
    ],
    fileRules: DEFAULT_FILE_RULES,
    aiTools: STAGING_AI_TOOLS,
    stagingOnly: true,
  },
  dtf_transfer_by_size: {
    id: "dtf_transfer_by_size",
    mode: "dtf_transfer_by_size",
    label: "DTF Transfer by Size",
    description: "Staging config for transfer products sold by size.",
    colors: [],
    printLocations: [],
    transferSizes: TRANSFER_SIZES.filter((size) => !size.isGangSheet),
    pricingRules: TRANSFER_SIZES.filter((size) => !size.isGangSheet).map((size) => ({
      id: `transfer_${size.id}`,
      label: `${size.label} transfer preview`,
      appliesTo: "transfer_size" as const,
      transferSizeId: size.id,
      unitPrice: 0,
      currency: "USD" as const,
    })),
    fileRules: DEFAULT_FILE_RULES,
    aiTools: STAGING_AI_TOOLS,
    stagingOnly: true,
  },
  gang_sheet_size_variant: {
    id: "gang_sheet_size_variant",
    mode: "gang_sheet_size_variant",
    label: "Gang Sheet Size Variant",
    description: "Staging config where gang sheet is a size/variant option.",
    colors: [],
    printLocations: [],
    transferSizes: TRANSFER_SIZES,
    pricingRules: [
      {
        id: "gang_sheet_variant",
        label: "Gang sheet preview variant",
        appliesTo: "transfer_size",
        transferSizeId: "gang_sheet",
        unitPrice: 0,
        currency: "USD",
      },
    ],
    fileRules: { ...DEFAULT_FILE_RULES, maxFileSizeMb: 50, minPixelHeight: 1800 },
    aiTools: STAGING_AI_TOOLS,
    stagingOnly: true,
  },
  upload_only_transfer: {
    id: "upload_only_transfer",
    mode: "upload_only_transfer",
    label: "Upload Only Transfer",
    description: "Staging config for a simple upload and proofing flow.",
    colors: [],
    printLocations: [],
    transferSizes: [],
    pricingRules: [
      { id: "upload_only", label: "Upload only preview", appliesTo: "product", unitPrice: 0, currency: "USD" },
    ],
    fileRules: DEFAULT_FILE_RULES,
    aiTools: STAGING_AI_TOOLS,
    stagingOnly: true,
  },
} satisfies Record<string, ProductCustomizerConfig>;

export type DefaultCustomizerConfigId = keyof typeof DEFAULT_CUSTOMIZER_CONFIGS;

export function getDefaultCustomizerConfig(id?: string) {
  if (id && id in DEFAULT_CUSTOMIZER_CONFIGS) {
    return DEFAULT_CUSTOMIZER_CONFIGS[id as DefaultCustomizerConfigId];
  }

  return DEFAULT_CUSTOMIZER_CONFIGS.apparel_customizer;
}
