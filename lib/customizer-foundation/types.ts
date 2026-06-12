export type EditorMode =
  | "apparel_customizer"
  | "dtf_transfer_by_size"
  | "gang_sheet_size_variant"
  | "upload_only_transfer";

export type ImageQualityStatus = "unknown" | "poor" | "usable" | "good" | "excellent";

export type ProductColor = {
  id: string;
  label: string;
  hex: string;
  mockupUrl?: string;
};

export type PrintAreaBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PrintLocation = {
  id: string;
  label: string;
  printArea: PrintAreaBounds;
  maxPrintWidth: number;
  maxPrintHeight: number;
  mockupUrl?: string;
  enabled: boolean;
};

export type TransferSize = {
  id: string;
  label: string;
  width: number;
  height: number;
  isGangSheet?: boolean;
  enabled: boolean;
};

export type PricingRule = {
  id: string;
  label: string;
  appliesTo: "product" | "location" | "transfer_size" | "quantity";
  unitPrice: number;
  currency: "USD";
  minQuantity?: number;
  transferSizeId?: string;
  printLocationId?: string;
};

export type FileRules = {
  allowedMimeTypes: string[];
  maxFileSizeMb: number;
  minDpi: number;
  recommendedDpi: number;
  minPixelWidth?: number;
  minPixelHeight?: number;
  allowTransparentPng: boolean;
};

export type AiToolSettings = {
  enabled: boolean;
  tools: {
    removeBackground: boolean;
    cleanColors: boolean;
    upscale: boolean;
    vectorize: boolean;
    generateDesign: boolean;
  };
  providerConnected: false;
  stagingOnly: true;
};

export type ProductCustomizerConfig = {
  id: string;
  mode: EditorMode;
  label: string;
  productHandle?: string;
  description: string;
  colors: ProductColor[];
  printLocations: PrintLocation[];
  transferSizes: TransferSize[];
  pricingRules: PricingRule[];
  fileRules: FileRules;
  aiTools: AiToolSettings;
  stagingOnly: true;
};

export type DesignLayer = {
  id: string;
  type: "image" | "text" | "shape";
  name: string;
  sourceUrl?: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  printLocationId?: string;
  transferSizeId?: string;
  qualityStatus: ImageQualityStatus;
};

export type SavedDesign = {
  id: string;
  configId: string;
  mode: EditorMode;
  productHandle?: string;
  variantId?: string;
  selectedColorId?: string;
  selectedPrintLocationId?: string;
  selectedTransferSizeId?: string;
  layers: DesignLayer[];
  createdAt: string;
  updatedAt: string;
  stagingOnly: true;
};

export type CartDesignPayload = {
  configId: string;
  mode: EditorMode;
  productHandle?: string;
  variantId?: string;
  quantity: number;
  selectedColorId?: string;
  selectedPrintLocationId?: string;
  selectedTransferSizeId?: string;
  layers: DesignLayer[];
  previewImageUrl?: string;
  productionFileUrl?: string;
  stagingOnly: true;
};

export type ValidationIssue = {
  code: string;
  message: string;
  path?: string;
  severity: "error" | "warning";
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};
