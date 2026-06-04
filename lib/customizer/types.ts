export type EditorMode = "apparel" | "transfer" | "upload_only";

export type ProductCustomizerType =
  | "apparel_customizer"
  | "dtf_transfer_by_size"
  | "gang_sheet_size_variant"
  | "upload_only_transfer";

export type DesignQualityStatus =
  | "unknown"
  | "needs_review"
  | "low_quality"
  | "good_quality"
  | "print_ready";

export type ProductColor = {
  id: string;
  label: string;
  hex: string;
  mockupUrl?: string;
  enabled: boolean;
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
  enabled: boolean;
  mockupUrl?: string;
};

export type TransferSize = {
  id: string;
  label: string;
  width: number;
  height: number;
  enabled: boolean;
  isGangSheet?: boolean;
};

export type ProductMaterialOption = {
  id: string;
  label: string;
  description?: string;
  enabled: boolean;
};

export type CustomizerTemplateSettings = {
  enabledForApparel: boolean;
  enabledForTransfer: boolean;
  enabledCategories: string[];
  defaultCategory?: string;
  featuredTemplateIds?: string[];
};

export type CustomizerRealismSettings = {
  enabled: boolean;
  fabricBlendEnabled: boolean;
  defaultBlendMode: "normal" | "multiply" | "overlay" | "soft-light";
  defaultInkOpacity: number;
  textureOverlayEnabled: boolean;
};

export type CustomizerPricingPlaceholderSettings = {
  basePrice: number;
  pricePerSquareInch: number;
  rushFee: number;
  quantityBreaks: string;
};

export type CustomizerStagingSettings = {
  transferMockupUrl?: string;
  gangSheetMockupUrl?: string;
  defaultTransferSizeId?: string;
  inkOptions?: string[];
  templateSettings?: CustomizerTemplateSettings;
  realismDefaults?: CustomizerRealismSettings;
  pricingPreview?: CustomizerPricingPlaceholderSettings;
  lowResolutionWarningEnabled?: boolean;
  transparentBackgroundRecommended?: boolean;
};

export type PricingRule = {
  id: string;
  label: string;
  appliesTo: "base_product" | "print_location" | "transfer_size" | "quantity" | "material";
  unitPrice: number;
  currency: "USD";
  minQuantity?: number;
  printLocationId?: string;
  transferSizeId?: string;
  materialOptionId?: string;
  stagingOnly: true;
};

export type FileRules = {
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFileSizeMb: number;
  minDpi: number;
  recommendedDpi: number;
  minPixelWidth?: number;
  minPixelHeight?: number;
  allowTransparentPng: boolean;
};

export type AiToolSettings = {
  enabled: boolean;
  stagingOnly: true;
  providerConnected: false;
  tools: {
    backgroundRemover: boolean;
    imageEnhancer: boolean;
    vectorizer: boolean;
    generateIdea: boolean;
  };
};

export type ProductCustomizerConfig = {
  id: string;
  type: ProductCustomizerType;
  editorMode: EditorMode;
  label: string;
  productHandle?: string;
  description?: string;
  colors: ProductColor[];
  printLocations: PrintLocation[];
  transferSizes: TransferSize[];
  materialOptions: ProductMaterialOption[];
  pricingRules: PricingRule[];
  fileRules: FileRules;
  aiTools: AiToolSettings;
  stagingSettings?: CustomizerStagingSettings;
  stagingOnly: true;
};

export type DesignLayer = {
  id: string;
  type: "image" | "text" | "shape" | "template";
  label: string;
  visible: boolean;
  locked: boolean;
  sourceUrl?: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  printLocationId?: string;
  transferSizeId?: string;
  qualityStatus: DesignQualityStatus;
};

export type SavedDesign = {
  id: string;
  configId: string;
  type: ProductCustomizerType;
  editorMode: EditorMode;
  productHandle?: string;
  productTitle?: string;
  variantId?: string;
  selectedColor?: string;
  selectedSize?: string;
  selectedView?: string;
  selectedColorId?: string;
  selectedPrintLocationId?: string;
  selectedTransferSizeId?: string;
  selectedMaterialOptionId?: string;
  layers: DesignLayer[];
  artworkOriginalUrl?: string;
  previewImageUrl?: string;
  designJsonUrl?: string;
  printReadyFileUrl?: string;
  qualityStatus?: DesignQualityStatus;
  createdAt: string;
  updatedAt: string;
  stagingOnly: true;
};

export type CartDesignPayload = {
  configId: string;
  type: ProductCustomizerType;
  editorMode: EditorMode;
  productHandle?: string;
  productTitle?: string;
  variantId?: string;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  selectedView?: string;
  selectedColorId?: string;
  selectedPrintLocationId?: string;
  selectedTransferSizeId?: string;
  selectedMaterialOptionId?: string;
  layers: DesignLayer[];
  artworkOriginalUrl?: string;
  previewImageUrl?: string;
  designJsonUrl?: string;
  printReadyFileUrl?: string;
  productionFileUrl?: string;
  qualityStatus?: DesignQualityStatus;
  stagingOnly: true;
};

export type CustomizerValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};
