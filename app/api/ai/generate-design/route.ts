import OpenAI from "openai";
import type { ImageGenerateParamsNonStreaming } from "openai/resources/images";
import { NextResponse } from "next/server";
import {
  AI_CONFIG_ERROR,
  AI_IMAGE_MODEL,
  readJsonBody,
} from "../_utils";

export const runtime = "nodejs";
export const maxDuration = 60;

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

type GenerateDesignDiagnostics = {
  requestId: string;
  routeName: string;
  routeCalled: true;
  promptProvided: boolean;
  openaiKeyExists: boolean;
  attemptedModel: string;
  fallbackModel: string | null;
  openaiStatus: number | null;
  openaiCode: string | null;
  openaiType: string | null;
  safeErrorCategory: string;
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

function createAiRequestId() {
  const randomId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `ai_${randomId.replace(/-/g, "").slice(0, 16)}`;
}

function createDiagnostics(
  requestId: string,
  overrides: Partial<GenerateDesignDiagnostics> = {}
): GenerateDesignDiagnostics {
  return {
    requestId,
    routeName: "generate-design",
    routeCalled: true,
    promptProvided: false,
    openaiKeyExists: false,
    attemptedModel: AI_IMAGE_MODEL,
    fallbackModel: null,
    openaiStatus: null,
    openaiCode: null,
    openaiType: null,
    safeErrorCategory: "started",
    ...overrides,
  };
}

function aiJson(
  payload: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(payload, { status });
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

function getOpenAIErrorCategory(error: OpenAIErrorInfo) {
  if (error.status === 401) return "openai_bad_api_key";
  if (error.status === 403) return "openai_model_access_denied";
  if (error.status === 404 || error.code === "model_not_found") return "openai_model_unavailable";
  if (error.status === 429) return "openai_rate_limit_or_billing";
  if (typeof error.status === "number" && error.status >= 500) return "openai_service_unavailable";
  return "openai_unknown_error";
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
  const enhancedPrompt = createEnhancedPrompt(prompt);

  if (normalizedModel.startsWith("dall-e")) {
    const quality = normalizedModel === DALL_E_3_MODEL ? "hd" : undefined;

    return {
      model: cleanModel,
      prompt: enhancedPrompt,
      size: "1024x1024",
      response_format: "b64_json",
      ...(quality ? { quality } : {}),
    };
  }

  const baseParams: ImageGenerateParamsNonStreaming = {
    model: cleanModel,
    prompt: enhancedPrompt,
    size: "1024x1024",
    stream: false,
    output_format: "png",
    quality: "high",
  };

  if (normalizedModel.startsWith("gpt-image-2")) {
    return {
      ...baseParams,
    };
  }

  return {
    ...baseParams,
    background: "transparent",
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
  const requestId = createAiRequestId();
  const body = await readJsonBody<GenerateDesignBody>(request);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const openaiKeyExists = Boolean(process.env.OPENAI_API_KEY);
  const fallbackModel = process.env.AI_IMAGE_FALLBACK_MODEL?.trim() || "";
  let diagnostics = createDiagnostics(requestId, {
    routeName: new URL(request.url).pathname,
    promptProvided: Boolean(prompt),
    openaiKeyExists,
    fallbackModel: fallbackModel || null,
  });

  console.info("Generate design route called", {
    ...diagnostics,
  });

  if (!prompt) {
    diagnostics = { ...diagnostics, safeErrorCategory: "missing_prompt" };
    console.warn("Generate design prompt missing", diagnostics);
    return aiJson(
      {
        ok: false,
        requestId,
        error: "Enter a prompt before generating artwork.",
        diagnostics,
      },
      400
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    diagnostics = { ...diagnostics, safeErrorCategory: "missing_openai_api_key" };
    console.warn("Generate design configuration failed", diagnostics);
    return aiJson(
      {
        ok: false,
        requestId,
        error: AI_CONFIG_ERROR,
        diagnostics,
      },
      503
    );
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let imageBase64: string | undefined;
    let usedModel = AI_IMAGE_MODEL;

    try {
      const generated = await generateImage(openai, usedModel, prompt);
      imageBase64 = generated.imageBase64;
    } catch (error) {
      const primaryError = toOpenAIErrorInfo(error);
      diagnostics = {
        ...diagnostics,
        attemptedModel: usedModel,
        openaiStatus: primaryError.status ?? null,
        openaiCode: primaryError.code || null,
        openaiType: primaryError.type || null,
        safeErrorCategory: getOpenAIErrorCategory(primaryError),
      };

      console.error("Generate design OpenAI request failed", diagnostics);

      if (fallbackModel && shouldRetryWithFallback(usedModel, fallbackModel, primaryError)) {
        usedModel = fallbackModel;

        try {
          const fallbackGenerated = await generateImage(openai, usedModel, prompt);
          imageBase64 = fallbackGenerated.imageBase64;
        } catch (fallbackError) {
          const mappedFallbackError = toOpenAIErrorInfo(fallbackError);
          diagnostics = {
            ...diagnostics,
            attemptedModel: usedModel,
            openaiStatus: mappedFallbackError.status ?? null,
            openaiCode: mappedFallbackError.code || null,
            openaiType: mappedFallbackError.type || null,
            safeErrorCategory: getOpenAIErrorCategory(mappedFallbackError),
          };

          console.error("Generate design OpenAI fallback request failed", diagnostics);

          const cleanMessage = toFrontendSafeErrorMessage(mappedFallbackError);
          return aiJson(
            {
              ok: false,
              requestId,
              error: cleanMessage,
              diagnostics,
            },
            mappedFallbackError.status || 500
          );
        }
      } else {
        const cleanMessage = toFrontendSafeErrorMessage(primaryError);
        return aiJson(
          {
            ok: false,
            requestId,
            error: cleanMessage,
            diagnostics,
          },
          primaryError.status || 500
        );
      }
    }

    if (!imageBase64) {
      diagnostics = {
        ...diagnostics,
        attemptedModel: usedModel,
        safeErrorCategory: "openai_no_image_returned",
      };

      console.error("Generate design did not return image data", diagnostics);
      return aiJson(
        {
          ok: false,
          requestId,
          error: "AI design generation could not return an image. Please try again.",
          diagnostics,
        },
        502
      );
    }

    diagnostics = {
      ...diagnostics,
      attemptedModel: usedModel,
      safeErrorCategory: "success",
    };
    console.info("Generate design route succeeded", diagnostics);

    return aiJson({
      ok: true,
      requestId,
      imageDataUrl: `data:image/png;base64,${imageBase64}`,
      suggestions: createSuggestions(prompt),
      note: "Design idea generated.",
    });
  } catch (error) {
    diagnostics = {
      ...diagnostics,
      safeErrorCategory: "server_processing_error",
    };
    console.error("AI design generation failed", {
      ...diagnostics,
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return aiJson(
      {
        ok: false,
        requestId,
        error: "AI design generation failed. Please try a different prompt.",
        diagnostics,
      },
      500
    );
  }
}
