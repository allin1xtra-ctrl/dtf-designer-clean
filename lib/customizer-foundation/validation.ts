import type {
  CartDesignPayload,
  DesignLayer,
  FileRules,
  ImageQualityStatus,
  PrintAreaBounds,
  ProductCustomizerConfig,
  ValidationIssue,
  ValidationResult,
} from "./types";

function result(issues: ValidationIssue[]): ValidationResult {
  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function addIssue(
  issues: ValidationIssue[],
  code: string,
  message: string,
  severity: ValidationIssue["severity"] = "error",
  path?: string
) {
  issues.push({ code, message, severity, path });
}

export function validatePrintAreaBounds(bounds: PrintAreaBounds, path = "printArea"): ValidationResult {
  const issues: ValidationIssue[] = [];
  const entries: Array<[keyof PrintAreaBounds, number]> = [
    ["x", bounds.x],
    ["y", bounds.y],
    ["width", bounds.width],
    ["height", bounds.height],
  ];

  for (const [key, value] of entries) {
    if (!Number.isFinite(value)) {
      addIssue(issues, "invalid_number", `${path}.${key} must be a finite number.`, "error", `${path}.${key}`);
    }
  }

  if (bounds.x < 0 || bounds.y < 0) {
    addIssue(issues, "negative_origin", `${path} x/y must be 0 or greater.`, "error", path);
  }

  if (bounds.width <= 0 || bounds.height <= 0) {
    addIssue(issues, "invalid_size", `${path} width/height must be greater than 0.`, "error", path);
  }

  if (bounds.x + bounds.width > 100 || bounds.y + bounds.height > 100) {
    addIssue(issues, "bounds_overflow", `${path} must stay inside the 0-100 percent mockup area.`, "error", path);
  }

  return result(issues);
}

export function validateFileRules(fileRules: FileRules): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(fileRules.allowedMimeTypes) || fileRules.allowedMimeTypes.length === 0) {
    addIssue(issues, "missing_mime_types", "File rules must include at least one allowed MIME type.", "error", "fileRules.allowedMimeTypes");
  }

  if (!Number.isFinite(fileRules.maxFileSizeMb) || fileRules.maxFileSizeMb <= 0) {
    addIssue(issues, "invalid_file_size", "File rules must include a positive max file size.", "error", "fileRules.maxFileSizeMb");
  }

  if (!Number.isFinite(fileRules.recommendedDpi) || fileRules.recommendedDpi < fileRules.minDpi) {
    addIssue(issues, "invalid_dpi", "Recommended DPI must be greater than or equal to minimum DPI.", "error", "fileRules.recommendedDpi");
  }

  return result(issues);
}

export function getImageQualityStatus(input: {
  dpi?: number;
  pixelWidth?: number;
  pixelHeight?: number;
  fileRules: FileRules;
}): ImageQualityStatus {
  const dpi = Number(input.dpi || 0);
  const width = Number(input.pixelWidth || 0);
  const height = Number(input.pixelHeight || 0);
  const minWidth = input.fileRules.minPixelWidth || 0;
  const minHeight = input.fileRules.minPixelHeight || 0;

  if (!dpi && !width && !height) return "unknown";
  if (dpi > 0 && dpi < input.fileRules.minDpi) return "poor";
  if ((minWidth && width > 0 && width < minWidth) || (minHeight && height > 0 && height < minHeight)) return "poor";
  if (dpi >= input.fileRules.recommendedDpi * 1.5 && width >= minWidth * 1.5 && height >= minHeight * 1.5) return "excellent";
  if (dpi >= input.fileRules.recommendedDpi && width >= minWidth && height >= minHeight) return "good";
  return "usable";
}

export function validateProductCustomizerConfig(config: ProductCustomizerConfig): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!config.id) addIssue(issues, "missing_id", "Config id is required.", "error", "id");
  if (!config.mode) addIssue(issues, "missing_mode", "Config mode is required.", "error", "mode");
  if (!config.label) addIssue(issues, "missing_label", "Config label is required.", "error", "label");
  if (config.stagingOnly !== true) {
    addIssue(issues, "not_staging_only", "Foundation configs must remain stagingOnly until approved.", "error", "stagingOnly");
  }

  const fileRules = validateFileRules(config.fileRules);
  issues.push(...fileRules.issues);

  config.printLocations.forEach((location, index) => {
    if (!location.id) addIssue(issues, "missing_location_id", "Print location id is required.", "error", `printLocations.${index}.id`);
    if (!location.label) addIssue(issues, "missing_location_label", "Print location label is required.", "error", `printLocations.${index}.label`);
    if (!Number.isFinite(location.maxPrintWidth) || location.maxPrintWidth <= 0) {
      addIssue(issues, "invalid_max_print_width", "Print location maxPrintWidth must be positive.", "error", `printLocations.${index}.maxPrintWidth`);
    }
    if (!Number.isFinite(location.maxPrintHeight) || location.maxPrintHeight <= 0) {
      addIssue(issues, "invalid_max_print_height", "Print location maxPrintHeight must be positive.", "error", `printLocations.${index}.maxPrintHeight`);
    }
    issues.push(...validatePrintAreaBounds(location.printArea, `printLocations.${index}.printArea`).issues);
  });

  config.transferSizes.forEach((size, index) => {
    if (!size.id) addIssue(issues, "missing_transfer_size_id", "Transfer size id is required.", "error", `transferSizes.${index}.id`);
    if (!Number.isFinite(size.width) || size.width <= 0 || !Number.isFinite(size.height) || size.height <= 0) {
      addIssue(issues, "invalid_transfer_size", "Transfer size width and height must be positive.", "error", `transferSizes.${index}`);
    }
  });

  return result(issues);
}

export function validateDesignLayer(layer: DesignLayer, path = "layers.0"): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!layer.id) addIssue(issues, "missing_layer_id", "Layer id is required.", "error", `${path}.id`);
  if (!layer.type) addIssue(issues, "missing_layer_type", "Layer type is required.", "error", `${path}.type`);
  if (!layer.name) addIssue(issues, "missing_layer_name", "Layer name is required.", "warning", `${path}.name`);

  for (const field of ["x", "y", "width", "height", "rotation"] as const) {
    if (!Number.isFinite(layer[field])) {
      addIssue(issues, "invalid_layer_number", `Layer ${field} must be a finite number.`, "error", `${path}.${field}`);
    }
  }

  if (layer.width <= 0 || layer.height <= 0) {
    addIssue(issues, "invalid_layer_bounds", "Layer width and height must be positive.", "error", path);
  }

  return result(issues);
}

export function validateCartPayloadCompleteness(payload: CartDesignPayload): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!payload.configId) addIssue(issues, "missing_config_id", "Cart payload configId is required.", "error", "configId");
  if (!payload.mode) addIssue(issues, "missing_mode", "Cart payload mode is required.", "error", "mode");
  if (!Number.isFinite(payload.quantity) || payload.quantity < 1) {
    addIssue(issues, "invalid_quantity", "Cart payload quantity must be 1 or greater.", "error", "quantity");
  }
  if (!Array.isArray(payload.layers) || payload.layers.length === 0) {
    addIssue(issues, "missing_layers", "Cart payload must include at least one design layer.", "error", "layers");
  } else {
    payload.layers.forEach((layer, index) => {
      issues.push(...validateDesignLayer(layer, `layers.${index}`).issues);
    });
  }
  if (payload.stagingOnly !== true) {
    addIssue(issues, "not_staging_only", "Staging validation only accepts stagingOnly payloads.", "error", "stagingOnly");
  }

  return result(issues);
}

export function isCartDesignPayload(value: unknown): value is CartDesignPayload {
  return isRecord(value) && Array.isArray(value.layers) && typeof value.configId === "string";
}
