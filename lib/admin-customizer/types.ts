export type AdminTemplateLayerType =
  | "text"
  | "image"
  | "shape"
  | "placeholder"
  | "image-placeholder";

export type AdminTemplateLayer = {
  id: string;
  type: AdminTemplateLayerType;
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
  textAlign?: "left" | "center" | "right";
  locked: boolean;
  hidden: boolean;
  zIndex: number;
  canDelete?: boolean;
  canMove?: boolean;
  canResize?: boolean;
};

export type AdminTemplate = {
  id: string;
  name: string;
  slug: string;
  category: string;
  productType: string;
  mode: "apparel" | "transfer" | "both";
  targetView?: string;
  description: string;
  previewImageUrl?: string;
  thumbnailUrl?: string;
  tags: string[];
  layers: AdminTemplateLayer[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminPrintArea = {
  x: number;
  y: number;
  width: number;
  height: number;
  widthInches?: number;
  heightInches?: number;
};

export type AdminMockupProduct = {
  id: string;
  name: string;
  slug: string;
  type: string;
  views: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminMockupVariant = {
  id: string;
  productId: string;
  colorName: string;
  colorSlug: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  leftSleeveImageUrl?: string;
  rightSleeveImageUrl?: string;
  neckTagImageUrl?: string;
  additionalViews: Record<string, string>;
  printAreas: Record<string, AdminPrintArea>;
  hasBakedPrintGuide: Record<string, boolean>;
  editableViews: Record<string, boolean>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminMediaAsset = {
  id: string;
  fileName: string;
  url?: string;
  type: string;
  uploadedBy: string;
  storage?: "cloudinary" | "local_public" | "metadata_only";
  publicId?: string;
  createdAt: string;
};

export type GhostMannequinAngle =
  | "front"
  | "front-left"
  | "left"
  | "back-left"
  | "back"
  | "back-right"
  | "right"
  | "front-right";

export type GhostMannequinStatus =
  | "generated"
  | "approved"
  | "rejected"
  | "added_to_product"
  | "failed";

export type GhostMannequinAsset = {
  id: string;
  productId?: string;
  productHandle?: string;
  sourceType: "upload" | "url";
  sourceFileName?: string;
  sourceImageUrl?: string;
  originalAssetUrl?: string;
  generatedImageUrl?: string;
  generatedPublicId?: string;
  generatedContentType?: string;
  prompt: string;
  mode: "single" | "angle-set" | "ai-360-beta";
  angle?: GhostMannequinAngle;
  frameUrls: string[];
  status: GhostMannequinStatus;
  reviewRequired: boolean;
  errors: string[];
  warnings: string[];
  photoroomRequestId?: string;
  processingTimeMs?: number;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  addedToProductAt?: string;
};

export type CustomGhost360EffectStyle = "studio" | "ghost-fade" | "floor-shadow" | "reflection";

export type CustomGhost360Frame = {
  id: string;
  label: string;
  imageUrl: string;
  fileName?: string;
  mediaAssetId?: string;
  order: number;
  width?: number;
  height?: number;
};

export type CustomGhost360FrameSet = {
  id: string;
  name: string;
  productId?: string;
  productHandle?: string;
  enabled: boolean;
  frameCount?: number;
  fallbackImageUrl?: string;
  effectStyle: CustomGhost360EffectStyle;
  frames: CustomGhost360Frame[];
  warnings: string[];
  createdAt: string;
  updatedAt: string;
  assignedAt?: string;
  metafieldsSyncedAt?: string;
};

export type AdminCustomizerStore = {
  templates: AdminTemplate[];
  mockupProducts: AdminMockupProduct[];
  mockupVariants: AdminMockupVariant[];
  mediaAssets: AdminMediaAsset[];
  ghostMannequinAssets: GhostMannequinAsset[];
  customGhost360FrameSets: CustomGhost360FrameSet[];
  updatedAt: string;
};
