import type {
  CartDesignPayload,
  CustomizerValidationResult,
  DesignQualityStatus,
  FileRules,
  PrintAreaBounds,
  PrintLocation,
  ProductCustomizerConfig,
  TransferSize,
} from "./types";

function result(errors: string[], warnings: string[] = []): CustomizerValidationResult {
  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function mergeResults(...results: CustomizerValidationResult[]) {
  return result(
    results.flatMap((item) => item.errors),
    results.flatMap((item) => item.warnings)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function validatePrintAreaBounds(bounds: PrintAreaBounds): CustomizerValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const key of ["x", "y", "width", "height"] as const) {
    if (!Number.isFinite(bounds[key])) {
      errors.push(`printArea.${key} must be a finite number.`);
    }
  }

  if (bounds.x < 0 || bounds.y < 0 || bounds.x > 100 || bounds.y > 100) {
    errors.push("printArea center x and y must stay within 0-100 percent mockup bounds.");
  }

  if (bounds.width <= 0 || bounds.height <= 0) {
    errors.push("printArea width and height must be greater than 0.");
  }

  if (
    bounds.x - bounds.width / 2 < 0 ||
    bounds.y - bounds.height / 2 < 0 ||
    bounds.x + bounds.width / 2 > 100 ||
    bounds.y + bounds.height / 2 > 100
  ) {
    errors.push("printArea must stay inside the 0-100 percent mockup bounds.");
  }

  if (bounds.width < 5 || bounds.height < 5) {
    warnings.push("printArea is very small and may be hard to use.");
  }

  return result(errors, warnings);
}

export function validateTransferSize(size: TransferSize): CustomizerValidationResult {
  const errors: string[] = [];

  if (!size.id) errors.push("transferSize.id is required.");
  if (!size.label) errors.push("transferSize.label is required.");
  if (!Number.isFinite(size.width) || size.width <= 0) errors.push("transferSize.width must be greater than 0.");
  if (!Number.isFinite(size.height) || size.height <= 0) errors.push("transferSize.height must be greater than 0.");

  return result(errors);
}

export function validatePrintLocation(location: PrintLocation): CustomizerValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!location.id) errors.push("printLocation.id is required.");
  if (!location.label) errors.push("printLocation.label is required.");
  if (!Number.isFinite(location.maxPrintWidth) || location.maxPrintWidth <= 0) {
    errors.push("printLocation.maxPrintWidth must be greater than 0.");
  }
  if (!Number.isFinite(location.maxPrintHeight) || location.maxPrintHeight <= 0) {
    errors.push("printLocation.maxPrintHeight must be greater than 0.");
  }
  if (location.maxPrintWidth > 24 || location.maxPrintHeight > 36) {
    warnings.push("printLocation max print size is unusually large for apparel.");
  }

  return mergeResults(result(errors, warnings), validatePrintAreaBounds(location.printArea));
}

export function validateFileRules(fileRules: FileRules): CustomizerValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(fileRules.allowedMimeTypes) || fileRules.allowedMimeTypes.length === 0) {
    errors.push("fileRules.allowedMimeTypes must include at least one MIME type.");
  }
  if (!Array.isArray(fileRules.allowedExtensions) || fileRules.allowedExtensions.length === 0) {
    errors.push("fileRules.allowedExtensions must include at least one extension.");
  }
  if (!Number.isFinite(fileRules.maxFileSizeMb) || fileRules.maxFileSizeMb <= 0) {
    errors.push("fileRules.maxFileSizeMb must be greater than 0.");
  }
  if (!Number.isFinite(fileRules.minDpi) || fileRules.minDpi <= 0) {
    errors.push("fileRules.minDpi must be greater than 0.");
  }
  if (!Number.isFinite(fileRules.recommendedDpi) || fileRules.recommendedDpi < fileRules.minDpi) {
    errors.push("fileRules.recommendedDpi must be greater than or equal to minDpi.");
  }
  if (fileRules.recommendedDpi < 300) {
    warnings.push("Recommended DPI is below 300.");
  }

  return result(errors, warnings);
}

export function getImageQualityStatus(input: {
  dpi?: number;
  pixelWidth?: number;
  pixelHeight?: number;
  fileRules: FileRules;
}): DesignQualityStatus {
  const dpi = Number(input.dpi || 0);
  const pixelWidth = Number(input.pixelWidth || 0);
  const pixelHeight = Number(input.pixelHeight || 0);
  const minWidth = input.fileRules.minPixelWidth || 0;
  const minHeight = input.fileRules.minPixelHeight || 0;

  if (!dpi && !pixelWidth && !pixelHeight) return "unknown";
  if (dpi > 0 && dpi < input.fileRules.minDpi) return "low_quality";
  if ((minWidth && pixelWidth > 0 && pixelWidth < minWidth) || (minHeight && pixelHeight > 0 && pixelHeight < minHeight)) {
    return "low_quality";
  }
  if (dpi >= input.fileRules.recommendedDpi && pixelWidth >= minWidth && pixelHeight >= minHeight) {
    return "print_ready";
  }
  return "good_quality";
}

export function validateProductCustomizerConfig(config: ProductCustomizerConfig): CustomizerValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.id) errors.push("config.id is required.");
  if (!config.type) errors.push("config.type is required.");
  if (!config.editorMode) errors.push("config.editorMode is required.");
  if (!config.label) errors.push("config.label is required.");
  if (config.stagingOnly !== true) errors.push("config.stagingOnly must be true for this foundation phase.");

  if (config.editorMode === "apparel" && config.printLocations.length === 0) {
    errors.push("apparel configs must include at least one print location.");
  }
  if (config.editorMode === "transfer" && config.transferSizes.length === 0) {
    errors.push("transfer configs must include at least one transfer size.");
  }
  if (config.aiTools.providerConnected !== false) {
    errors.push("aiTools.providerConnected must remain false in staging.");
  }
  if (config.pricingRules.some((rule) => rule.stagingOnly !== true)) {
    errors.push("pricing rules must remain stagingOnly.");
  }
  if (config.pricingRules.some((rule) => rule.unitPrice !== 0)) {
    warnings.push("Pricing rules contain non-zero values. Keep staging pricing separate from production.");
  }

  return mergeResults(
    result(errors, warnings),
    validateFileRules(config.fileRules),
    ...config.printLocations.map(validatePrintLocation),
    ...config.transferSizes.map(validateTransferSize)
  );
}

export function validateCartDesignPayload(payload: CartDesignPayload): CustomizerValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!payload.configId) errors.push("payload.configId is required.");
  if (!payload.type) errors.push("payload.type is required.");
  if (!payload.editorMode) errors.push("payload.editorMode is required.");
  if (!Number.isFinite(payload.quantity) || payload.quantity < 1) errors.push("payload.quantity must be 1 or greater.");
  if (!Array.isArray(payload.layers) || payload.layers.length === 0) {
    errors.push("payload.layers must include at least one design layer.");
  }
  if (payload.stagingOnly !== true) errors.push("payload.stagingOnly must be true for staging validation.");
  if (!payload.previewImageUrl) warnings.push("payload.previewImageUrl is missing.");
  if (!payload.productionFileUrl) warnings.push("payload.productionFileUrl is missing. This is acceptable for staging only.");

  payload.layers?.forEach((layer, index) => {
    if (!layer.id) errors.push(`layers.${index}.id is required.`);
    if (!layer.type) errors.push(`layers.${index}.type is required.`);
    if (!Number.isFinite(layer.x) || !Number.isFinite(layer.y)) errors.push(`layers.${index} position must be numeric.`);
    if (!Number.isFinite(layer.width) || layer.width <= 0 || !Number.isFinite(layer.height) || layer.height <= 0) {
      errors.push(`layers.${index} width and height must be greater than 0.`);
    }
    if (layer.opacity < 0 || layer.opacity > 1) warnings.push(`layers.${index}.opacity should be between 0 and 1.`);
  });

  return result(errors, warnings);
}

export function isProductCustomizerConfig(value: unknown): value is ProductCustomizerConfig {
  return isRecord(value) && typeof value.id === "string" && typeof value.type === "string";
}

export function isCartDesignPayload(value: unknown): value is CartDesignPayload {
  return isRecord(value) && typeof value.configId === "string" && Array.isArray(value.layers);
}
