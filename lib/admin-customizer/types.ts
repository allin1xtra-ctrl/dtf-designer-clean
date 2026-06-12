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

export type AdminCustomizerStore = {
  templates: AdminTemplate[];
  mockupProducts: AdminMockupProduct[];
  mockupVariants: AdminMockupVariant[];
  mediaAssets: AdminMediaAsset[];
  updatedAt: string;
};
