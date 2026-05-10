import { NextResponse } from "next/server";

type GenerateDesignBody = {
  prompt?: string;
};

const AI_DESIGN_NOT_CONFIGURED_MESSAGE =
  "AI Design Generation needs to be enabled in Vercel environment variables.";
const DEFAULT_OPENAI_MODEL = "gpt-image-1";

function getMissingConfig() {
  const missing: string[] = [];
  if (!process.env.OPENAI_API_KEY?.trim()) {
    missing.push("OPENAI_API_KEY");
  }
  if (process.env.NEXT_PUBLIC_AI_DESIGN_ENABLED !== "true") {
    missing.push("NEXT_PUBLIC_AI_DESIGN_ENABLED");
  }
  return missing;
}

function getOpenAiModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as GenerateDesignBody;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return NextResponse.json(
      { ok: false, error: "Describe your design idea first." },
      { status: 400 }
    );
  }

  const missingConfig = getMissingConfig();
  if (missingConfig.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        code: "AI_DESIGN_NOT_CONFIGURED",
        error: AI_DESIGN_NOT_CONFIGURED_MESSAGE,
        missing: missingConfig,
      },
      { status: 503 }
    );
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim() || "";
    const model = getOpenAiModel();
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        size: "1024x1024",
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      data?: Array<{ b64_json?: string; url?: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error("OpenAI image generation failed:", {
        status: response.status,
        message: payload.error?.message,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "AI design generation failed. Please try again in a moment.",
        },
        { status: 502 }
      );
    }

    const firstImage = payload.data?.[0];
    const imageDataUrl = firstImage?.b64_json
      ? `data:image/png;base64,${firstImage.b64_json}`
      : firstImage?.url;

    if (!imageDataUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI design generation returned no image output.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      provider: "openai",
      model,
      imageDataUrl,
      note: "AI design generated and ready for the canvas.",
    });
  } catch (error) {
    console.error("AI design generation request failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "AI design generation failed. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
