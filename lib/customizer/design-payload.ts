import type {
  CartDesignPayload,
  CustomizerValidationResult,
  DesignLayer,
  DesignQualityStatus,
  EditorMode,
  ProductCustomizerType,
  SavedDesign,
} from "./types";

export type StagingDesignPayloadInput = {
  configId?: string;
  type?: ProductCustomizerType;
  editorMode: EditorMode;
  productHandle?: string;
  productTitle?: string;
  variantId?: string;
  quantity?: number;
  selectedColor?: string;
  selectedSize?: string;
  selectedView?: string;
  selectedPrintLocationId?: string;
  selectedTransferSizeId?: string;
  selectedMaterialOptionId?: string;
  artworkOriginalUrl?: string;
  previewImageUrl?: string;
  designJsonUrl?: string;
  printReadyFileUrl?: string;
  layers?: DesignLayer[];
  qualityStatus?: DesignQualityStatus;
};

export type StagingSavedDesign = {
  id: string;
  stagingOnly: true;
  createdAt: string;
  payload: CartDesignPayload;
};

const URL_FIELDS = ["artworkOriginalUrl", "previewImageUrl", "designJsonUrl", "printReadyFileUrl", "productionFileUrl"] as const;
const ALLOWED_EDITOR_MODES: EditorMode[] = ["apparel", "transfer", "upload_only"];
const ALLOWED_CUSTOMIZER_TYPES: ProductCustomizerType[] = [
  "apparel_customizer",
  "dtf_transfer_by_size",
  "gang_sheet_size_variant",
  "upload_only_transfer",
];

function result(errors: string[], warnings: string[] = []): CustomizerValidationResult {
  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isUnsafeUrl(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("data:") || normalized.includes(";base64,");
}

function isLikelyHostedUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function sanitizePropertyValue(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/[\r\n\t]+/g, " ").trim().slice(0, 255);
}

function createDefaultLayer(input: StagingDesignPayloadInput): DesignLayer {
  return {
    id: "staging-layer-1",
    type: "image",
    label: input.selectedView ? `${input.selectedView} staging artwork` : "Staging artwork",
    visible: true,
    locked: false,
    sourceUrl: input.artworkOriginalUrl,
    x: 50,
    y: 50,
    width: 40,
    height: 40,
    rotation: 0,
    opacity: 1,
    printLocationId: input.selectedPrintLocationId,
    transferSizeId: input.selectedTransferSizeId,
    qualityStatus: input.qualityStatus || "unknown",
  };
}

export function createStagingDesignPayload(input: StagingDesignPayloadInput): CartDesignPayload {
  const editorMode = input.editorMode;
  const type =
    input.type ||
    (editorMode === "apparel"
      ? "apparel_customizer"
      : editorMode === "upload_only"
        ? "upload_only_transfer"
        : "dtf_transfer_by_size");

  return {
    configId: input.configId || "staging-customizer-preview",
    type,
    editorMode,
    productHandle: input.productHandle,
    productTitle: input.productTitle,
    variantId: input.variantId,
    quantity: Math.max(1, Number(input.quantity || 1)),
    selectedColor: input.selectedColor,
    selectedSize: input.selectedSize,
    selectedView: input.selectedView,
    selectedPrintLocationId: input.selectedPrintLocationId,
    selectedTransferSizeId: input.selectedTransferSizeId,
    selectedMaterialOptionId: input.selectedMaterialOptionId,
    layers: input.layers && input.layers.length > 0 ? input.layers : [createDefaultLayer(input)],
    artworkOriginalUrl: input.artworkOriginalUrl,
    previewImageUrl: input.previewImageUrl,
    designJsonUrl: input.designJsonUrl,
    printReadyFileUrl: input.printReadyFileUrl,
    qualityStatus: input.qualityStatus || "unknown",
    stagingOnly: true,
  };
}

export function validateStagingDesignPayload(payload: unknown): CustomizerValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(payload)) {
    return result(["Payload must be a JSON object."]);
  }

  const editorMode = payload.editorMode;
  const type = payload.type;

  if (!asTrimmedString(payload.configId)) errors.push("configId is required.");
  if (!ALLOWED_EDITOR_MODES.includes(editorMode as EditorMode)) errors.push("editorMode is invalid.");
  if (!ALLOWED_CUSTOMIZER_TYPES.includes(type as ProductCustomizerType)) errors.push("type is invalid.");
  if (payload.stagingOnly !== true) errors.push("stagingOnly must be true.");

  const quantity = Number(payload.quantity);
  if (!Number.isFinite(quantity) || quantity < 1) errors.push("quantity must be 1 or greater.");

  if (!Array.isArray(payload.layers)) {
    errors.push("layers must be an array.");
  } else if (payload.layers.length === 0) {
    errors.push("layers must include at least one design layer.");
  } else {
    payload.layers.forEach((layer, index) => {
      if (!isRecord(layer)) {
        errors.push(`layers.${index} must be an object.`);
        return;
      }

      if (!asTrimmedString(layer.id)) errors.push(`layers.${index}.id is required.`);
      if (!asTrimmedString(layer.type)) errors.push(`layers.${index}.type is required.`);

      for (const field of ["x", "y", "width", "height", "rotation", "opacity"] as const) {
        if (!Number.isFinite(Number(layer[field]))) errors.push(`layers.${index}.${field} must be numeric.`);
      }
    });
  }

  for (const field of URL_FIELDS) {
    const value = asTrimmedString(payload[field]);
    if (!value) {
      if (field !== "productionFileUrl") warnings.push(`${field} is missing. This is acceptable for staging only.`);
      continue;
    }

    if (isUnsafeUrl(value)) {
      errors.push(`${field} must not contain data/base64 URLs.`);
    } else if (!isLikelyHostedUrl(value)) {
      warnings.push(`${field} is not a hosted http(s) URL yet.`);
    }
  }

  if (!asTrimmedString(payload.productHandle)) warnings.push("productHandle is missing.");
  if (!asTrimmedString(payload.productTitle)) warnings.push("productTitle is missing.");

  return result(errors, warnings);
}

export function sanitizeLineItemPropertiesPreview(payload: CartDesignPayload) {
  return {
    "Design ID": sanitizePropertyValue(payload.configId),
    Product: sanitizePropertyValue(payload.productTitle || payload.productHandle),
    Size: sanitizePropertyValue(payload.selectedSize || "Custom"),
    Placement: sanitizePropertyValue(payload.selectedView || payload.selectedPrintLocationId),
    "Transfer Size": sanitizePropertyValue(payload.selectedTransferSizeId),
    "Artwork Original URL": sanitizePropertyValue(payload.artworkOriginalUrl),
    "Preview Image URL": sanitizePropertyValue(payload.previewImageUrl),
    "Design JSON URL": sanitizePropertyValue(payload.designJsonUrl),
    "Print Ready File URL": sanitizePropertyValue(payload.printReadyFileUrl || payload.productionFileUrl),
    "Quality Status": sanitizePropertyValue(payload.qualityStatus),
    "Staging Only": "true",
  };
}

export function createStagingSavedDesign(payload: CartDesignPayload): StagingSavedDesign {
  const createdAt = new Date().toISOString();

  return {
    id: `staging_design_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    stagingOnly: true,
    createdAt,
    payload,
  };
}

export function createSavedDesignRecord(payload: CartDesignPayload): SavedDesign {
  const createdAt = new Date().toISOString();

  return {
    id: `staging_saved_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    configId: payload.configId,
    type: payload.type,
    editorMode: payload.editorMode,
    productHandle: payload.productHandle,
    productTitle: payload.productTitle,
    variantId: payload.variantId,
    selectedColor: payload.selectedColor,
    selectedSize: payload.selectedSize,
    selectedView: payload.selectedView,
    selectedColorId: payload.selectedColorId,
    selectedPrintLocationId: payload.selectedPrintLocationId,
    selectedTransferSizeId: payload.selectedTransferSizeId,
    selectedMaterialOptionId: payload.selectedMaterialOptionId,
    layers: payload.layers,
    artworkOriginalUrl: payload.artworkOriginalUrl,
    previewImageUrl: payload.previewImageUrl,
    designJsonUrl: payload.designJsonUrl,
    printReadyFileUrl: payload.printReadyFileUrl || payload.productionFileUrl,
    qualityStatus: payload.qualityStatus,
    createdAt,
    updatedAt: createdAt,
    stagingOnly: true,
  };
}
