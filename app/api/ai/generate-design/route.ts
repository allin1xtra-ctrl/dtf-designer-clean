import OpenAI from "openai";
import type { ImageGenerateParamsNonStreaming } from "openai/resources/images";
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

const PRIMARY_GPT_IMAGE_MODEL = "gpt-image-1";
const DALL_E_3_MODEL = "dall-e-3";

type OpenAIErrorInfo = {
  status?: number;
  code?: string;
  type?: string;
};

type ImageGenerationResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
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

function toOpenAIErrorInfo(error: unknown): OpenAIErrorInfo {
  const candidate = (error || {}) as {
    status?: number;
    code?: string;
    type?: string;
    message?: string;
    error?: {
      code?: string;
      type?: string;
      message?: string;
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
    return "Image generation service is temporarily unavailable.";
  }

  return "AI design generation failed. Please try a different prompt.";
}

function shouldRetryWithFallback(
  model: string,
  fallbackModel: string | undefined,
  error: OpenAIErrorInfo
) {
  if (model.trim().toLowerCase() !== PRIMARY_GPT_IMAGE_MODEL) {
    return false;
  }

  if (!fallbackModel || fallbackModel === model) {
    return false;
  }

  return error.status === 403 || error.code === "model_not_found";
}

function buildImageGenerateParams(model: string, prompt: string): ImageGenerateParamsNonStreaming {
  const cleanModel = model.trim();
  const normalizedModel = cleanModel.toLowerCase();
  const baseParams: ImageGenerateParamsNonStreaming = {
    model: cleanModel,
    prompt: createEnhancedPrompt(prompt),
    size: "1024x1024",
    stream: false,
  };

  if (normalizedModel.startsWith("dall-e")) {
    const quality = normalizedModel === DALL_E_3_MODEL ? "hd" : undefined;

    return {
      ...baseParams,
      response_format: "b64_json",
      ...(quality ? { quality } : {}),
    };
  }

  return {
    ...baseParams,
    output_format: "png",
    background: "transparent",
    quality: "high",
  };
}

function extractImageBase64(response: unknown) {
  const imageResponse = response as ImageGenerationResponse;
  return imageResponse.data?.[0]?.b64_json;
}

async function generateImage(openai: OpenAI, model: string, prompt: string) {
  const params = buildImageGenerateParams(model, prompt);
  const response = await openai.images.generate(params);
  return {
    response,
    imageBase64: extractImageBase64(response),
  };
}

export async function POST(request: Request) {
  const body = await readJsonBody<GenerateDesignBody>(request);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const openaiKeyExists = Boolean(process.env.OPENAI_API_KEY);

  console.info("Generate design route called", {
    promptProvided: Boolean(prompt),
    openaiKeyExists,
  });

  if (!prompt) {
    return errorJson("Enter a prompt before generating artwork.", 400);
  }

  if (!process.env.OPENAI_API_KEY) {
    return errorJson(AI_CONFIG_ERROR, 503);
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const fallbackModel = process.env.AI_IMAGE_FALLBACK_MODEL?.trim();
    let imageBase64: string | undefined;
    let usedModel = AI_IMAGE_MODEL;

    try {
      const generated = await generateImage(openai, usedModel, prompt);
      imageBase64 = generated.imageBase64;
    } catch (error) {
      const primaryError = toOpenAIErrorInfo(error);
      console.error("Generate design OpenAI request failed", {
        aiImageModel: AI_IMAGE_MODEL,
        attemptedModel: usedModel,
        openaiStatus: primaryError.status,
        openaiCode: primaryError.code,
        openaiType: primaryError.type,
      });

      if (fallbackModel && shouldRetryWithFallback(usedModel, fallbackModel, primaryError)) {
        usedModel = fallbackModel;

        try {
          const fallbackGenerated = await generateImage(openai, usedModel, prompt);
          imageBase64 = fallbackGenerated.imageBase64;
        } catch (fallbackError) {
          const mappedFallbackError = toOpenAIErrorInfo(fallbackError);
          console.error("Generate design OpenAI fallback request failed", {
            aiImageModel: AI_IMAGE_MODEL,
            attemptedModel: usedModel,
            openaiStatus: mappedFallbackError.status,
            openaiCode: mappedFallbackError.code,
            openaiType: mappedFallbackError.type,
          });

          const cleanMessage = toFrontendSafeErrorMessage(mappedFallbackError);
          return errorJson(cleanMessage, mappedFallbackError.status || 500);
        }
      } else {
        const cleanMessage = toFrontendSafeErrorMessage(primaryError);
        return errorJson(cleanMessage, primaryError.status || 500);
      }
    }

    if (!imageBase64) {
      console.error("Generate design did not return image data", {
        aiImageModel: AI_IMAGE_MODEL,
        attemptedModel: usedModel,
        imageReturned: false,
      });
      return errorJson("AI design generation could not return an image. Please try again.");
    }

    return successJson({
      imageDataUrl: `data:image/png;base64,${imageBase64}`,
      suggestions: createSuggestions(prompt),
      note: "Design idea generated.",
    });
  } catch (error) {
    console.error("AI design generation failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return errorJson("AI design generation failed. Please try a different prompt.");
  }
}
