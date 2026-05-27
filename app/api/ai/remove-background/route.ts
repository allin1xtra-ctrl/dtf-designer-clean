import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import {
  AI_CONFIG_ERROR,
  AI_IMAGE_MODEL,
  errorJson,
  parseImageDataUrl,
  readJsonBody,
  successJson,
} from "../_utils";

export const runtime = "nodejs";
export const maxDuration = 30;

type RemoveBackgroundBody = {
  imageDataUrl?: string;
};

type OpenAIErrorInfo = {
  status?: number;
  code?: string;
  type?: string;
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

export async function POST(request: Request) {
  const openaiKeyExists = Boolean(process.env.OPENAI_API_KEY);
  console.info("Remove background route called", {
    openaiKeyExists,
  });

  if (!process.env.OPENAI_API_KEY) {
    return errorJson(AI_CONFIG_ERROR, 503);
  }

  const body = await readJsonBody<RemoveBackgroundBody>(request);
  console.info("Remove background request payload", {
    imageProvided: typeof body.imageDataUrl === "string" && body.imageDataUrl.length > 0,
  });

  const parsed = parseImageDataUrl(body.imageDataUrl);

  if ("error" in parsed) {
    return errorJson(parsed.error, 400);
  }

  try {
    const pngInput = await sharp(parsed.buffer, { animated: false })
      .rotate()
      .ensureAlpha()
      .png()
      .toBuffer();

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const imageFile = await toFile(pngInput, "source.png", { type: "image/png" });

    const response = await openai.images.edit({
      model: AI_IMAGE_MODEL,
      image: imageFile,
      prompt:
        "Remove the full background and keep only the main subject. Preserve edges and detail for DTF printing. Output transparent PNG with no watermark and no extra scene.",
      background: "transparent",
      output_format: "png",
      quality: "high",
    });

    const imageBase64 = response.data?.[0]?.b64_json;
    if (!imageBase64) {
      console.error("Remove background did not return image data", {
        openaiStatus: 200,
        imageReturned: false,
      });
      return errorJson("Unable to remove background right now. Please try again.");
    }

    return successJson({
      imageDataUrl: `data:image/png;base64,${imageBase64}`,
      note: "Background removed.",
    });
  } catch (error) {
    const openaiError = toOpenAIErrorInfo(error);
    console.error("Remove background route failed", {
      openaiStatus: openaiError.status,
      openaiCode: openaiError.code,
      openaiType: openaiError.type,
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return errorJson(toFrontendSafeErrorMessage(openaiError), openaiError.status || 500);
  }
}
