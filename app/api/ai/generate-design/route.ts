import OpenAI from "openai";
import {
  AI_CONFIG_ERROR,
  AI_IMAGE_MODEL,
  errorJson,
  readJsonBody,
  successJson,
} from "../_utils";

export const runtime = "nodejs";

type GenerateDesignBody = {
  prompt?: string;
};

function createEnhancedPrompt(prompt: string) {
  return `Create a clean vector-style DTF apparel design of: ${prompt}. Transparent background, bold outlines, vibrant print-ready colors, centered composition, high contrast, no mockup, no watermark, no background scene.`;
}

function createSuggestions(prompt: string) {
  const cleanedPrompt = prompt.replace(/\s+/g, " ").trim();
  return [
    `Try a second version of "${cleanedPrompt}" with thicker contour lines for better press visibility.`,
    "Use 3-5 high-contrast colors to keep prints crisp on both light and dark garments.",
    "Keep key text and focal elements in the center so placement works across multiple sizes.",
  ];
}

export async function POST(request: Request) {
  const body = await readJsonBody<GenerateDesignBody>(request);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return errorJson("Describe your design idea first.", 400);
  }

  if (!process.env.OPENAI_API_KEY) {
    return errorJson(AI_CONFIG_ERROR, 503);
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.images.generate({
      model: AI_IMAGE_MODEL,
      prompt: createEnhancedPrompt(prompt),
      size: "1024x1024",
      output_format: "png",
      background: "transparent",
      quality: "high",
    });

    const imageBase64 = response.data?.[0]?.b64_json;

    if (!imageBase64) {
      console.error("Generate design did not return image data", { prompt, response });
      return errorJson("AI design generation could not return an image. Please try again.");
    }

    return successJson({
      imageDataUrl: `data:image/png;base64,${imageBase64}`,
      suggestions: createSuggestions(prompt),
      note: "Design idea generated.",
    });
  } catch (error) {
    console.error("Generate design route failed:", error);
    return errorJson("Unable to generate design right now. Please try again.");
  }
}
