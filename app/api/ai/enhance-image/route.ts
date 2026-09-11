import { aiUnavailable } from "../_availability";
import sharp from "sharp";
import {
  errorJson,
  parseImageDataUrl,
  readJsonBody,
  successJson,
  toPngDataUrl,
} from "../_utils";

export const runtime = "nodejs";

type EnhanceImageBody = {
  imageDataUrl?: string;
};

export async function POST(request: Request) {
  if (process.env.CUSTOMIZER_AI_ENABLED !== "true") return aiUnavailable();
  const body = await readJsonBody<EnhanceImageBody>(request);
  const parsed = parseImageDataUrl(body.imageDataUrl);

  if ("error" in parsed) {
    return errorJson(parsed.error, 400);
  }

  try {
    const outputBuffer = await sharp(parsed.buffer, { animated: false })
      .rotate()
      .ensureAlpha()
      .normalize()
      .linear(1.08, -6)
      .sharpen({ sigma: 1.1, m1: 0.9, m2: 1.4 })
      .png()
      .toBuffer();

    return successJson({
      imageDataUrl: toPngDataUrl(outputBuffer),
      note: "Image enhancement complete.",
    });
  } catch (error) {
    console.error("Enhance image route failed:", error);
    return errorJson("Unable to enhance image right now. Please try again.");
  }
}
