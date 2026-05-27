import OpenAI, { toFile } from "openai";
import type { ImageEditParamsNonStreaming } from "openai/resources/images";
import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  AI_CONFIG_ERROR,
  parseImageDataUrl,
  readJsonBody,
  successJson,
} from "../_utils";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUPPORTED_INPUT_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_OPENAI_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_REMOVE_BACKGROUND_EDGE = 1536;
const REMOVE_BACKGROUND_MODEL = process.env.AI_REMOVE_BACKGROUND_MODEL?.trim() || "gpt-image-1";

type RemoveBackgroundBody = {
  imageDataUrl?: string;
};

type OpenAIErrorInfo = {
  status?: number;
  code?: string;
  type?: string;
};

type RemoveBackgroundDiagnostics = {
  routeCalled: true;
  imageProvided: boolean;
  parsedImageMimeType: string | null;
  inputBufferByteSize: number | null;
  processedPngByteSize: number | null;
  openaiStatus: number | null;
  openaiCode: string | null;
  openaiType: string | null;
  attemptedModel: string;
};

function toOpenAIErrorInfo(error: unknown): OpenAIErrorInfo {
  const candidate = (error || {}) as {
    status?: number;
    code?: string;
    type?: string;
    error?: {
      code?: string;
      type?: string;
    };
  };

  return {
    status: candidate.status,
    code: candidate.code || candidate.error?.code,
    type: candidate.type || candidate.error?.type,
  };
}

function createDiagnostics(
  overrides: Partial<RemoveBackgroundDiagnostics> = {}
): RemoveBackgroundDiagnostics {
  return {
    routeCalled: true,
    imageProvided: false,
    parsedImageMimeType: null,
    inputBufferByteSize: null,
    processedPngByteSize: null,
    openaiStatus: null,
    openaiCode: null,
    openaiType: null,
    attemptedModel: REMOVE_BACKGROUND_MODEL,
    ...overrides,
  };
}

function removeBackgroundErrorJson(
  error: string,
  status: number,
  diagnostics: RemoveBackgroundDiagnostics
) {
  return NextResponse.json(
    {
      ok: false,
      error,
      diagnostics,
    },
    { status }
  );
}

function toFrontendSafeErrorMessage(error: OpenAIErrorInfo) {
  if (error.status === 401) {
    return "OpenAI API key is invalid or expired.";
  }

  if (error.status === 403) {
    return "OpenAI image model access is not enabled for this account.";
  }

  if (error.status === 404 || error.code === "model_not_found") {
    return "Configured AI image model is not available.";
  }

  if (error.status === 429) {
    return "OpenAI rate limit or billing limit reached.";
  }

  if (typeof error.status === "number" && error.status >= 500) {
    return "Background removal service is temporarily unavailable.";
  }

  return "Unable to remove background right now. Please try another image.";
}

function supportsTransparentBackground(model: string) {
  const normalized = model.trim().toLowerCase();
  return !normalized.startsWith("dall-e") && !normalized.startsWith("gpt-image-2");
}

function buildRemoveBackgroundParams(
  imageFile: Awaited<ReturnType<typeof toFile>>
): ImageEditParamsNonStreaming {
  return {
    model: REMOVE_BACKGROUND_MODEL,
    image: imageFile,
    prompt:
      "Remove the full background and keep only the main subject. Preserve edges and detail for DTF printing. Output transparent PNG with no watermark and no extra scene.",
    background: "transparent",
    output_format: "png",
    quality: "high",
  };
}

export async function POST(request: Request) {
  const openaiKeyExists = Boolean(process.env.OPENAI_API_KEY);
  let diagnostics = createDiagnostics();

  console.info("Remove background route called", {
    openaiKeyExists,
    attemptedModel: REMOVE_BACKGROUND_MODEL,
  });

  if (!process.env.OPENAI_API_KEY) {
    return removeBackgroundErrorJson(AI_CONFIG_ERROR, 503, diagnostics);
  }

  if (!supportsTransparentBackground(REMOVE_BACKGROUND_MODEL)) {
    console.warn("Remove background model does not support transparent background edits", diagnostics);
    return removeBackgroundErrorJson(
      "Configured remove background model does not support transparent PNG background removal.",
      500,
      diagnostics
    );
  }

  const body = await readJsonBody<RemoveBackgroundBody>(request);
  const imageProvided = typeof body.imageDataUrl === "string" && body.imageDataUrl.length > 0;
  diagnostics = createDiagnostics({ imageProvided });

  console.info("Remove background request payload", {
    imageProvided,
  });

  const parsed = parseImageDataUrl(body.imageDataUrl);

  if ("error" in parsed) {
    console.warn("Remove background invalid image data", diagnostics);
    return removeBackgroundErrorJson(parsed.error, 400, diagnostics);
  }

  diagnostics = createDiagnostics({
    imageProvided,
    parsedImageMimeType: parsed.mimeType,
    inputBufferByteSize: parsed.buffer.length,
  });

  if (!SUPPORTED_INPUT_MIME_TYPES.has(parsed.mimeType)) {
    console.warn("Remove background unsupported image type", diagnostics);
    return removeBackgroundErrorJson(
      "Unsupported image type. Upload a PNG, JPG, or WebP image before removing background.",
      415,
      diagnostics
    );
  }

  if (parsed.buffer.length > MAX_OPENAI_IMAGE_BYTES) {
    console.warn("Remove background image payload too large", diagnostics);
    return removeBackgroundErrorJson(
      "Image is too large for background removal. Upload an image under 50MB.",
      413,
      diagnostics
    );
  }

  try {
    const pngInput = await sharp(parsed.buffer, { animated: false })
      .rotate()
      .resize({
        width: MAX_REMOVE_BACKGROUND_EDGE,
        height: MAX_REMOVE_BACKGROUND_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .ensureAlpha()
      .png()
      .toBuffer();

    diagnostics = {
      ...diagnostics,
      processedPngByteSize: pngInput.length,
    };

    if (pngInput.length > MAX_OPENAI_IMAGE_BYTES) {
      console.warn("Remove background processed PNG too large", diagnostics);
      return removeBackgroundErrorJson(
        "Processed image is too large for background removal. Upload a smaller image.",
        413,
        diagnostics
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const imageFile = await toFile(pngInput, "source.png", { type: "image/png" });

    const response = await openai.images.edit(buildRemoveBackgroundParams(imageFile));

    const imageBase64 = response.data?.[0]?.b64_json;
    if (!imageBase64) {
      console.error("Remove background did not return image data", {
        ...diagnostics,
        imageReturned: false,
      });
      return removeBackgroundErrorJson(
        "Background removal did not return an image. Please try another image.",
        502,
        diagnostics
      );
    }

    return successJson({
      imageDataUrl: `data:image/png;base64,${imageBase64}`,
      note: "Background removed.",
    });
  } catch (error) {
    const openaiError = toOpenAIErrorInfo(error);
    diagnostics = {
      ...diagnostics,
      openaiStatus: openaiError.status ?? null,
      openaiCode: openaiError.code || null,
      openaiType: openaiError.type || null,
    };

    console.error("Remove background route failed", {
      ...diagnostics,
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return removeBackgroundErrorJson(
      toFrontendSafeErrorMessage(openaiError),
      openaiError.status || 500,
      diagnostics
    );
  }
}
