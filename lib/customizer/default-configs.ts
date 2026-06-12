import type {
  AiToolSettings,
  FileRules,
  PricingRule,
  ProductColor,
  ProductCustomizerConfig,
  ProductMaterialOption,
  TransferSize,
} from "./types";

const DEFAULT_FILE_RULES: FileRules = {
  allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  allowedExtensions: [".png", ".jpg", ".jpeg", ".webp", ".svg"],
  maxFileSizeMb: 25,
  minDpi: 150,
  recommendedDpi: 300,
  minPixelWidth: 900,
  minPixelHeight: 900,
  allowTransparentPng: true,
};

const DEFAULT_AI_TOOLS: AiToolSettings = {
  enabled: false,
  stagingOnly: true,
  providerConnected: false,
  tools: {
    backgroundRemover: false,
    imageEnhancer: false,
    vectorizer: false,
    generateIdea: false,
  },
};

const DEFAULT_COLORS: ProductColor[] = [
  { id: "black", label: "Black", hex: "#101316", enabled: true },
  { id: "white", label: "White", hex: "#f8fafc", enabled: true },
  { id: "charcoal", label: "Charcoal", hex: "#334155", enabled: true },
  { id: "red", label: "Red", hex: "#991b1b", enabled: true },
  { id: "royal", label: "Royal", hex: "#075985", enabled: true },
  { id: "forest", label: "Forest", hex: "#166534", enabled: true },
];

const DEFAULT_MATERIALS: ProductMaterialOption[] = [
  { id: "hot_peel", label: "Hot Peel Film", enabled: true },
  { id: "cold_peel", label: "Cold Peel Film", enabled: true },
  { id: "matte", label: "Matte Finish", enabled: true },
  { id: "gloss", label: "Gloss Finish", enabled: true },
];

const TRANSFER_SIZES: TransferSize[] = [
  { id: "3x3", label: "3 x 3", width: 3, height: 3, enabled: true },
  { id: "5x5", label: "5 x 5", width: 5, height: 5, enabled: true },
  { id: "8x10", label: "8 x 10", width: 8, height: 10, enabled: true },
  { id: "11x17", label: "11 x 17", width: 11, height: 17, enabled: true },
  { id: "12x24", label: "12 x 24", width: 12, height: 24, enabled: true },
  { id: "13x24", label: "13 x 24", width: 13, height: 24, enabled: true },
  { id: "13x60", label: "13 x 60", width: 13, height: 60, enabled: true },
  { id: "gang_sheet", label: "Gang Sheet", width: 22, height: 60, enabled: true, isGangSheet: true },
];

function stagingPrice(id: string, label: string, appliesTo: PricingRule["appliesTo"], extra: Partial<PricingRule> = {}): PricingRule {
  return {
    id,
    label,
    appliesTo,
    unitPrice: 0,
    currency: "USD",
    stagingOnly: true,
    ...extra,
  };
}

export const DEFAULT_CUSTOMIZER_CONFIGS = {
  apparel_customizer: {
    id: "apparel_customizer",
    type: "apparel_customizer",
    editorMode: "apparel",
    label: "Apparel Customizer",
    productHandle: "custom-t-shirt-upload-customize",
    description: "Staging default for apparel customization.",
    colors: DEFAULT_COLORS,
    printLocations: [
      {
        id: "front",
        label: "Front",
        printArea: { x: 50, y: 56, width: 38, height: 50 },
        maxPrintWidth: 12,
        maxPrintHeight: 16,
        enabled: true,
      },
      {
        id: "back",
        label: "Back",
        printArea: { x: 50, y: 56, width: 42, height: 50 },
        maxPrintWidth: 12,
        maxPrintHeight: 16,
        enabled: true,
      },
      {
        id: "leftSleeve",
        label: "Left Sleeve",
        printArea: { x: 50, y: 50, width: 17, height: 31 },
        maxPrintWidth: 4,
        maxPrintHeight: 6,
        enabled: true,
      },
      {
        id: "rightSleeve",
        label: "Right Sleeve",
        printArea: { x: 50, y: 50, width: 17, height: 31 },
        maxPrintWidth: 4,
        maxPrintHeight: 6,
        enabled: true,
      },
      {
        id: "neckTag",
        label: "Neck Tag",
        printArea: { x: 50, y: 28, width: 22, height: 14 },
        maxPrintWidth: 3,
        maxPrintHeight: 2,
        enabled: true,
      },
    ],
    transferSizes: [],
    materialOptions: [],
    pricingRules: [stagingPrice("apparel_base", "Apparel staging base price", "base_product")],
    fileRules: DEFAULT_FILE_RULES,
    aiTools: DEFAULT_AI_TOOLS,
    stagingOnly: true,
  },
  dtf_transfer_by_size: {
    id: "dtf_transfer_by_size",
    type: "dtf_transfer_by_size",
    editorMode: "transfer",
    label: "DTF Transfer by Size",
    description: "Staging default for transfer products sold by size.",
    colors: [],
    printLocations: [],
    transferSizes: TRANSFER_SIZES.filter((size) => !size.isGangSheet),
    materialOptions: DEFAULT_MATERIALS,
    pricingRules: TRANSFER_SIZES.filter((size) => !size.isGangSheet).map((size) =>
      stagingPrice(`transfer_${size.id}`, `${size.label} staging transfer`, "transfer_size", { transferSizeId: size.id })
    ),
    fileRules: DEFAULT_FILE_RULES,
    aiTools: DEFAULT_AI_TOOLS,
    stagingOnly: true,
  },
  gang_sheet_size_variant: {
    id: "gang_sheet_size_variant",
    type: "gang_sheet_size_variant",
    editorMode: "transfer",
    label: "Gang Sheet Size Variant",
    description: "Staging default where gang sheet is treated as a size variant.",
    colors: [],
    printLocations: [],
    transferSizes: TRANSFER_SIZES,
    materialOptions: DEFAULT_MATERIALS,
    pricingRules: [stagingPrice("gang_sheet_variant", "Gang sheet staging variant", "transfer_size", { transferSizeId: "gang_sheet" })],
    fileRules: { ...DEFAULT_FILE_RULES, maxFileSizeMb: 50, minPixelWidth: 1800, minPixelHeight: 1800 },
    aiTools: DEFAULT_AI_TOOLS,
    stagingOnly: true,
  },
  upload_only_transfer: {
    id: "upload_only_transfer",
    type: "upload_only_transfer",
    editorMode: "upload_only",
    label: "Upload Only Transfer",
    description: "Staging default for simple upload and proofing.",
    colors: [],
    printLocations: [],
    transferSizes: [],
    materialOptions: DEFAULT_MATERIALS,
    pricingRules: [stagingPrice("upload_only_base", "Upload-only staging base price", "base_product")],
    fileRules: DEFAULT_FILE_RULES,
    aiTools: DEFAULT_AI_TOOLS,
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
