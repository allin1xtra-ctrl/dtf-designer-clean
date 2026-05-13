import sharp from "sharp";
import {
  errorJson,
  parseImageDataUrl,
  readJsonBody,
  successJson,
  toPngDataUrl,
} from "../_utils";

export const runtime = "nodejs";

type CleanColorsBody = {
  imageDataUrl?: string;
};

export async function POST(request: Request) {
  const body = await readJsonBody<CleanColorsBody>(request);
  const parsed = parseImageDataUrl(body.imageDataUrl);

  if ("error" in parsed) {
    return errorJson(parsed.error, 400);
  }

  try {
    const outputBuffer = await sharp(parsed.buffer, { animated: false })
      .rotate()
      .ensureAlpha()
      .normalize()
      .modulate({ saturation: 1.12, brightness: 1.02 })
      .linear(1.04, -3)
      .sharpen({ sigma: 0.9, m1: 0.8, m2: 1.2 })
      .png()
      .toBuffer();

    return successJson({
      imageDataUrl: toPngDataUrl(outputBuffer),
      note: "Color cleanup complete for print clarity.",
    });
  } catch (error) {
    console.error("Clean colors route failed:", error);
    return errorJson("Unable to clean up colors right now. Please try again.");
  }
}
