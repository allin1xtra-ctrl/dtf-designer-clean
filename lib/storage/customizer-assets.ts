import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

export type UploadPurpose =
  | "artwork_original"
  | "preview_image"
  | "design_json"
  | "print_ready_file"
  | "mockup_image";

export type UploadedAsset = {
  id: string;
  purpose: UploadPurpose;
  filename: string;
  contentType: string;
  size: number;
  stagingOnly: true;
  url?: string;
  publicId?: string;
  storage?: "cloudinary";
};

export type StoredDesignAsset = UploadedAsset & {
  purpose: "design_json";
  designVersion?: string;
};

export type PreviewImageAsset = UploadedAsset & {
  purpose: "preview_image" | "mockup_image";
  width?: number;
  height?: number;
};

export type PrintReadyAsset = UploadedAsset & {
  purpose: "print_ready_file";
  dpi?: number;
  printWidthInches?: number;
  printHeightInches?: number;
};

export type UploadValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export const ALLOWED_UPLOAD_PURPOSES: UploadPurpose[] = [
  "artwork_original",
  "preview_image",
  "design_json",
  "print_ready_file",
  "mockup_image",
];

export const ALLOWED_UPLOAD_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg", "pdf", "json"];

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/json",
];

export const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

const UNSAFE_FILENAME_REPLACEMENT = "-";
const CLOUDINARY_URL_PREFIX = "https://res.cloudinary.com/";
const DEFAULT_STAGING_CLOUDINARY_FOLDER = "dtf-designer-pro/staging/customizer";

type CustomizerCloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
};

export function isUploadPurpose(value: unknown): value is UploadPurpose {
  return typeof value === "string" && ALLOWED_UPLOAD_PURPOSES.includes(value as UploadPurpose);
}

export function getFileExtension(filename: string) {
  const cleanName = filename.trim().toLowerCase();
  const lastDot = cleanName.lastIndexOf(".");
  return lastDot >= 0 ? cleanName.slice(lastDot + 1) : "";
}

export function sanitizeAssetFilename(filename: string) {
  const trimmed = filename.trim() || "customizer-upload";
  const sanitized = trimmed
    .replace(/[\\/:*?"<>|]+/g, UNSAFE_FILENAME_REPLACEMENT)
    .replace(/\s+/g, UNSAFE_FILENAME_REPLACEMENT)
    .replace(/-+/g, UNSAFE_FILENAME_REPLACEMENT)
    .replace(/^-|-$/g, "");

  return sanitized || "customizer-upload";
}

export function isVectorUpload(contentType: string, filename: string) {
  const extension = getFileExtension(filename);
  return contentType === "image/svg+xml" || contentType === "application/pdf" || extension === "svg" || extension === "pdf";
}

export function isImageUpload(contentType: string, filename: string) {
  const extension = getFileExtension(filename);
  return contentType.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "svg"].includes(extension);
}

export function isDesignJsonUpload(contentType: string, filename: string) {
  return contentType === "application/json" || getFileExtension(filename) === "json";
}

export function validateUploadPurpose(purpose: unknown): UploadValidationResult {
  if (!isUploadPurpose(purpose)) {
    return {
      ok: false,
      errors: [`Invalid upload purpose. Allowed values: ${ALLOWED_UPLOAD_PURPOSES.join(", ")}.`],
      warnings: [],
    };
  }

  return { ok: true, errors: [], warnings: [] };
}

export function validateCustomizerUploadFile(
  file: File | null | undefined,
  options: { maxSizeBytes?: number } = {}
): UploadValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_UPLOAD_SIZE_BYTES;

  if (!file) {
    return {
      ok: false,
      errors: ["Missing file. Send multipart/form-data with a file field named \"file\"."],
      warnings,
    };
  }

  const filename = file.name || "";
  const extension = getFileExtension(filename);
  const contentType = file.type || "";

  if (!filename.trim()) {
    errors.push("Uploaded file must include a filename.");
  }

  if (sanitizeAssetFilename(filename) !== filename) {
    warnings.push("Filename contained unsafe characters and will be sanitized for staging.");
  }

  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension)) {
    errors.push(`Unsupported file extension. Allowed extensions: ${ALLOWED_UPLOAD_EXTENSIONS.join(", ")}.`);
  }

  if (contentType && !ALLOWED_UPLOAD_CONTENT_TYPES.includes(contentType)) {
    errors.push(`Unsupported content type. Allowed content types: ${ALLOWED_UPLOAD_CONTENT_TYPES.join(", ")}.`);
  }

  if (!contentType) {
    warnings.push("File content type was missing. Validation used the filename extension only.");
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    errors.push("Uploaded file is empty or has an invalid size.");
  }

  if (file.size > maxSizeBytes) {
    errors.push(`Uploaded file is too large. Max staging upload size is ${Math.round(maxSizeBytes / 1024 / 1024)} MB.`);
  }

  if (isDesignJsonUpload(contentType, filename)) {
    warnings.push("Design JSON upload detected. This is for staging saved-design data only.");
  } else if (isVectorUpload(contentType, filename)) {
    warnings.push("Vector upload detected. Staging preview may need a raster preview image later.");
  } else if (!isImageUpload(contentType, filename)) {
    warnings.push("Upload is not recognized as a standard image preview type.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function getCustomizerCloudinaryEnvStatus(env: NodeJS.ProcessEnv = process.env): UploadValidationResult {
  if (getCustomizerCloudinaryConfig(env)) {
    return {
      ok: true,
      errors: [],
      warnings: [],
    };
  }

  return {
    ok: true,
    errors: [],
    warnings: [
      "Cloudinary env vars are missing or incomplete. Staging validation will return asset metadata only and no hosted URL.",
    ],
  };
}

export function getCustomizerCloudinaryConfig(env: NodeJS.ProcessEnv = process.env): CustomizerCloudinaryConfig | null {
  const cloudName = (env.CLOUDINARY_CLOUD_NAME || env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  const configuredFolder = env.CLOUDINARY_STAGING_FOLDER?.trim();
  const folder = configuredFolder?.toLowerCase().includes("staging")
    ? configuredFolder
    : DEFAULT_STAGING_CLOUDINARY_FOLDER;

  if (!cloudName || !apiKey || !apiSecret) return null;

  return {
    cloudName,
    apiKey,
    apiSecret,
    folder,
  };
}

export function createStagingUploadedAsset(
  file: File,
  purpose: UploadPurpose,
  options: { url?: string; publicId?: string; storage?: "cloudinary" } = {}
): UploadedAsset {
  const filename = sanitizeAssetFilename(file.name || "customizer-upload");
  const extension = getFileExtension(filename) || "asset";
  const id = `staging_${purpose}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${extension}`;

  return {
    id,
    purpose,
    filename,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    stagingOnly: true,
    url: options.url,
    publicId: options.publicId,
    storage: options.storage,
  };
}

export async function uploadCustomizerAssetToCloudinary(file: File, purpose: UploadPurpose) {
  const config = getCustomizerCloudinaryConfig();

  if (!config) {
    return {
      ok: true,
      warnings: [
        "Cloudinary env vars are missing or incomplete. Staging validation will return asset metadata only and no hosted URL.",
      ],
    } as const;
  }

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const folder = `${config.folder}/${purpose}`;
  const sanitizedName = sanitizeAssetFilename(file.name || "customizer-upload");
  const publicIdBase = sanitizedName.replace(/\.[^.]+$/, "");

  const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${Date.now()}-${publicIdBase}`,
        resource_type: "auto",
        overwrite: false,
        unique_filename: true,
        use_filename: true,
        context: {
          staging_only: "true",
          purpose,
        },
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload returned no result."));
        } else {
          resolve(result);
        }
      }
    );
    stream.end(buffer);
  });

  const secureUrl = uploadResult.secure_url?.trim();

  if (!secureUrl || !secureUrl.startsWith(CLOUDINARY_URL_PREFIX)) {
    throw new Error("Cloudinary did not return an expected hosted URL.");
  }

  return {
    ok: true,
    url: secureUrl,
    publicId: uploadResult.public_id,
    storage: "cloudinary" as const,
    warnings: [`Uploaded to Cloudinary staging folder: ${folder}.`],
  };
}
