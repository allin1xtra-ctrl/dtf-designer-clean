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

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return errorJson(AI_CONFIG_ERROR, 503);
  }

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
      console.error("Remove background did not return image data", { response });
      return errorJson("Unable to remove background right now. Please try again.");
    }

    return successJson({
      imageDataUrl: `data:image/png;base64,${imageBase64}`,
      note: "Background removed.",
    });
  } catch (error) {
    console.error("Remove background route failed:", error);
    return errorJson("Unable to remove background right now. Please try again.");
  }
}
