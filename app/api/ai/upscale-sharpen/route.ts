import sharp from "sharp";
import {
  errorJson,
  parseImageDataUrl,
  readJsonBody,
  successJson,
  toPngDataUrl,
} from "../_utils";

export const runtime = "nodejs";

const MAX_DIMENSION = 4096;

type UpscaleSharpenBody = {
  imageDataUrl?: string;
};

export async function POST(request: Request) {
  const body = await readJsonBody<UpscaleSharpenBody>(request);
  const parsed = parseImageDataUrl(body.imageDataUrl);

  if ("error" in parsed) {
    return errorJson(parsed.error, 400);
  }

  try {
    const image = sharp(parsed.buffer, { animated: false }).rotate().ensureAlpha();
    const metadata = await image.metadata();
    const sourceWidth = metadata.width || 0;
    const sourceHeight = metadata.height || 0;

    if (!sourceWidth || !sourceHeight) {
      return errorJson("Unable to read image dimensions.", 400);
    }

    const targetWidth = Math.min(MAX_DIMENSION, Math.max(1, Math.round(sourceWidth * 2)));
    const targetHeight = Math.min(MAX_DIMENSION, Math.max(1, Math.round(sourceHeight * 2)));

    const outputBuffer = await image
      .resize(targetWidth, targetHeight, {
        fit: "inside",
        kernel: sharp.kernel.lanczos3,
      })
      .sharpen({ sigma: 1.4, m1: 1, m2: 1.8 })
      .png()
      .toBuffer();

    return successJson({
      imageDataUrl: toPngDataUrl(outputBuffer),
      note: "Upscale and sharpening complete.",
    });
  } catch (error) {
    console.error("Upscale/sharpen route failed:", error);
    return errorJson("Unable to upscale image right now. Please try again.");
  }
}
