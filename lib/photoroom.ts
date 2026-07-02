export type GenerateGhostMannequinImageInput = {
  imageFile?: File;
  imageUrl?: string;
  prompt?: string;
  size?: string;
  outputSize?: string;
  format?: "png" | "webp";
};

export type GenerateGhostMannequinImageResult = {
  buffer: Buffer;
  contentType: string;
  metadata: {
    enabled: boolean;
    sandbox: boolean;
    requestId?: string;
    processingTimeMs: number;
  };
};

export const DEFAULT_GHOST_MANNEQUIN_PROMPT =
  "Create a clean premium ecommerce ghost mannequin image of this apparel product. Keep the garment shape, fabric texture, stitching, print/logo placement, color, neckline, sleeves, proportions, and brand details accurate. White or transparent studio background. Realistic apparel photography, not AI-looking.";

export const GHOST_MANNEQUIN_ANGLES = [
  { angle: "front", prompt: "front view ghost mannequin" },
  { angle: "front-left", prompt: "front-left 45 degree ghost mannequin" },
  { angle: "left", prompt: "left side ghost mannequin" },
  { angle: "back-left", prompt: "back-left 45 degree ghost mannequin" },
  { angle: "back", prompt: "back view ghost mannequin" },
  { angle: "back-right", prompt: "back-right 45 degree ghost mannequin" },
  { angle: "right", prompt: "right side ghost mannequin" },
  { angle: "front-right", prompt: "front-right 45 degree ghost mannequin" },
] as const;

const PHOTOROOM_EDIT_URL = "https://image-api.photoroom.com/v2/edit";

export const PHOTOROOM_ALLOWED_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const PHOTOROOM_ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
export const PHOTOROOM_MAX_IMAGE_BYTES = 30 * 1024 * 1024;

function cleanEnv(value: unknown) {
  return String(value || "").trim();
}

export function isPhotoroomEnabled() {
  return cleanEnv(process.env.PHOTOROOM_ENABLED).toLowerCase() === "true";
}

export function isPhotoroomSandbox() {
  return ["true", "success", "fail"].includes(cleanEnv(process.env.PHOTOROOM_SANDBOX).toLowerCase());
}

export function getPhotoroomSandboxMode() {
  const mode = cleanEnv(process.env.PHOTOROOM_SANDBOX).toLowerCase();
  return mode === "fail" ? "fail" : isPhotoroomSandbox() ? "success" : "";
}

export function getPhotoroomConfig() {
  const apiKey = cleanEnv(process.env.PHOTOROOM_API_KEY);
  return {
    apiKey,
    enabled: isPhotoroomEnabled(),
    sandbox: isPhotoroomSandbox(),
    sandboxMode: getPhotoroomSandboxMode(),
  };
}

function filenameFromUrl(imageUrl: string) {
  try {
    const pathname = new URL(imageUrl).pathname;
    const filename = pathname.split("/").filter(Boolean).pop();
    return filename || "product-image.jpg";
  } catch {
    return "product-image.jpg";
  }
}

async function fileFromImageUrl(imageUrl: string) {
  const response = await fetch(imageUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Source image URL could not be fetched (${response.status}).`);
  }
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());
  return new File([buffer], filenameFromUrl(imageUrl), { type: contentType });
}

export async function generateGhostMannequinImage(input: GenerateGhostMannequinImageInput): Promise<GenerateGhostMannequinImageResult> {
  const startedAt = Date.now();
  const config = getPhotoroomConfig();

  if (!config.enabled) {
    throw new Error("Photoroom generation is disabled. Set PHOTOROOM_ENABLED=true to enable it.");
  }

  const imageFile = input.imageFile || (input.imageUrl ? await fileFromImageUrl(input.imageUrl) : null);
  if (!imageFile) {
    throw new Error("Missing imageFile or imageUrl.");
  }

  if (config.sandboxMode === "fail") {
    throw new Error("Photoroom sandbox failure. This simulates a failed Photoroom Image Editing API response.");
  }

  if (config.sandboxMode === "success") {
    return {
      buffer: Buffer.from(await imageFile.arrayBuffer()),
      contentType: imageFile.type || "image/png",
      metadata: {
        enabled: config.enabled,
        sandbox: true,
        requestId: "photoroom-sandbox",
        processingTimeMs: Date.now() - startedAt,
      },
    };
  }

  if (!config.apiKey) {
    throw new Error("PHOTOROOM_API_KEY is not configured.");
  }

  const formData = new FormData();
  formData.append("imageFile", imageFile, imageFile.name || "product-image.png");
  formData.append("ghostMannequin.mode", "ai.auto");
  formData.append("ghostMannequin.prompt", input.prompt || DEFAULT_GHOST_MANNEQUIN_PROMPT);

  if (input.size) formData.append("ghostMannequin.size", input.size);
  if (input.outputSize) formData.append("outputSize", input.outputSize);
  formData.append("export.format", input.format || "png");

  const response = await fetch(PHOTOROOM_EDIT_URL, {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
    },
    body: formData,
  });

  const requestId = response.headers.get("x-request-id") || response.headers.get("x-photoroom-request-id") || undefined;
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());

  if (!response.ok) {
    const errorText = contentType.includes("text") || contentType.includes("json") ? buffer.toString("utf8").slice(0, 600) : "";
    throw new Error(`Photoroom Image Editing API failed (${response.status}). ${errorText}`.trim());
  }

  return {
    buffer,
    contentType,
    metadata: {
      enabled: config.enabled,
      sandbox: config.sandbox,
      requestId,
      processingTimeMs: Date.now() - startedAt,
    },
  };
}
