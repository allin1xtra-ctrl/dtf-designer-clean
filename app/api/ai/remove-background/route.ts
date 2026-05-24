import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import {
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

const REMOVE_BACKGROUND_FAILED_MESSAGE =
  "Background removal failed. Please try another image or upload a transparent PNG.";
const REMOVE_BACKGROUND_CONFIG_ERROR =
  "Background removal service is not configured. Add REMOVE_BG_API_KEY or OPENAI_API_KEY.";

type AiImageResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
};

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

async function fetchImageUrlToDataUrl(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Image download failed (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  const safeContentType = contentType.startsWith("image/") ? contentType : "image/png";
  return `data:${safeContentType};base64,${buffer.toString("base64")}`;
}

async function removeBackgroundWithRemoveBg(
  pngInput: Buffer,
  removeBgApiKey: string
) {
  const formData = new FormData();
  const pngArrayBuffer = bufferToArrayBuffer(pngInput);
  formData.append(
    "image_file",
    new Blob([pngArrayBuffer], { type: "image/png" }),
    "source.png"
  );
  formData.append("size", "auto");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: {
      "X-Api-Key": removeBgApiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`remove.bg request failed (${response.status}).`);
  }

  const outputBuffer = Buffer.from(await response.arrayBuffer());
  if (!outputBuffer.length) {
    throw new Error("remove.bg returned empty output.");
  }

  return `data:image/png;base64,${outputBuffer.toString("base64")}`;
}

async function removeBackgroundWithOpenAi(pngInput: Buffer) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const imageFile = await toFile(pngInput, "source.png", { type: "image/png" });

  const response = await openai.images.edit({
    model: AI_IMAGE_MODEL,
    image: imageFile,
    prompt:
      "Remove every background element and keep only the primary artwork/design. Preserve edge detail and anti-aliasing for high-quality DTF print output. Return transparent PNG only.",
    background: "transparent",
    output_format: "png",
    quality: "high",
  });

  const imageBase64 = response.data?.[0]?.b64_json;
  if (imageBase64) {
    return `data:image/png;base64,${imageBase64}`;
  }

  const imageUrl = (response as AiImageResponse).data?.[0]?.url;
  if (imageUrl) {
    return fetchImageUrlToDataUrl(imageUrl);
  }

  throw new Error("OpenAI remove-background response did not include image data.");
}

export async function POST(request: Request) {
  const body = await readJsonBody<RemoveBackgroundBody>(request);
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
    const removeBgApiKey = process.env.REMOVE_BG_API_KEY?.trim();

    if (!removeBgApiKey && !process.env.OPENAI_API_KEY) {
      console.error("Background removal service is not configured.");
      return errorJson(REMOVE_BACKGROUND_CONFIG_ERROR, 503);
    }

    const imageDataUrl = removeBgApiKey
      ? await removeBackgroundWithRemoveBg(pngInput, removeBgApiKey)
      : await removeBackgroundWithOpenAi(pngInput);

    return successJson({
      imageDataUrl,
      note: "Background removed.",
    });
  } catch (error) {
    console.error("Background removal failed:", error);
    return errorJson(REMOVE_BACKGROUND_FAILED_MESSAGE);
  }
}
