import sharp from "sharp";
import {
  errorJson,
  parseImageDataUrl,
  readJsonBody,
  successJson,
  toPngDataUrl,
} from "../_utils";

export const runtime = "nodejs";

type VectorizeArtworkBody = {
  imageDataUrl?: string;
};

export async function POST(request: Request) {
  const body = await readJsonBody<VectorizeArtworkBody>(request);
  const parsed = parseImageDataUrl(body.imageDataUrl);

  if ("error" in parsed) {
    return errorJson(parsed.error, 400);
  }

  try {
    const outputBuffer = await sharp(parsed.buffer, { animated: false })
      .rotate()
      .ensureAlpha()
      .normalize()
      .median(1)
      .sharpen({ sigma: 1.2, m1: 0.8, m2: 1.5 })
      .png()
      .toBuffer();

    return successJson({
      imageDataUrl: toPngDataUrl(outputBuffer),
      note: "basic SVG/vector preparation complete",
    });
  } catch (error) {
    console.error("Vectorize artwork route failed:", error);
    return errorJson("Unable to prepare artwork for vectorization right now. Please try again.");
  }
}
