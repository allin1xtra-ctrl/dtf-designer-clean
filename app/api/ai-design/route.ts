import { NextResponse } from "next/server";

type DesignContext = {
  productMode?: string;
  currentView?: string;
  garmentTemplate?: string;
  shirtColor?: string;
  transferSize?: string;
  storeName?: string;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildFallbackDesign(prompt: string, context: DesignContext) {
  const normalized = prompt.trim() || "Custom DTF design";
  const words = normalized.split(/\s+/).filter(Boolean);
  const headline = escapeXml(words.slice(0, 3).join(" ").toUpperCase() || "CUSTOM");
  const subline = escapeXml(words.slice(3, 9).join(" ") || normalized);
  const accent = context.shirtColor?.toLowerCase() === "white" ? "#2563eb" : "#93c5fd";
  const modeLabel = escapeXml(`${context.productMode || "apparel"} • ${context.currentView || "front"}`.toUpperCase());
  const templateLabel = escapeXml((context.garmentTemplate || context.transferSize || "DTF").toUpperCase());

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1400" viewBox="0 0 1400 1400">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#020617" />
          <stop offset="100%" stop-color="#172554" />
        </linearGradient>
        <linearGradient id="accent" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="#f472b6" />
        </linearGradient>
      </defs>
      <rect width="1400" height="1400" rx="88" fill="url(#bg)" />
      <circle cx="240" cy="260" r="130" fill="rgba(255,255,255,0.08)" />
      <circle cx="1140" cy="320" r="170" fill="rgba(147,197,253,0.18)" />
      <circle cx="1060" cy="1080" r="210" fill="rgba(244,114,182,0.14)" />
      <rect x="110" y="110" width="1180" height="1180" rx="70" fill="none" stroke="url(#accent)" stroke-width="12" />
      <path d="M250 930 C460 660, 860 1240, 1120 500" fill="none" stroke="url(#accent)" stroke-width="22" stroke-linecap="round" opacity="0.95" />
      <path d="M260 510 C520 320, 760 720, 1110 360" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="0.4" />
      <text x="700" y="560" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="152" font-weight="900" fill="#ffffff">${headline}</text>
      <text x="700" y="650" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" fill="${accent}">${templateLabel}</text>
      <text x="700" y="740" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#dbeafe">${escapeXml(subline.slice(0, 60))}</text>
      <text x="700" y="1220" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#cbd5e1">${modeLabel}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function generateWithGemini(prompt: string, context: DesignContext) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_IMAGE_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash-preview-image-generation";
  const productHint = context.productMode === "transfer"
    ? `${context.transferSize || "custom"} DTF transfer artwork`
    : `${context.shirtColor || "black"} ${context.garmentTemplate || "shirt"} ${context.currentView || "front"} print`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Create a bold, production-ready product graphic for ${productHint}. Keep the artwork centered, isolated, and suitable for print with a transparent or clean background. Customer request: ${prompt}`,
              },
            ],
          },
        ],
      }),
    });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}.`);
  }

  const data = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: {
            mimeType?: string;
            data?: string;
          };
        }>;
      };
    }>;
  };

  const imagePart = data.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .find((part) => part.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    return null;
  }

  return {
    imageUrl: `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`,
    model,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const context = (body?.context || {}) as DesignContext;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    try {
      const geminiResult = await generateWithGemini(prompt, context);
      if (geminiResult?.imageUrl) {
        return NextResponse.json({
          ok: true,
          provider: "Gemini",
          model: geminiResult.model,
          imageUrl: geminiResult.imageUrl,
          note: "AI design created and ready for the canvas.",
        });
      }
    } catch (error) {
      console.error("Gemini image generation failed:", error);
    }

    return NextResponse.json({
      ok: true,
      provider: "Built-in AI fallback",
      imageUrl: buildFallbackDesign(prompt, context),
      note: "AI concept art was generated. Add a Gemini API key to return full Gemini image output.",
    });
  } catch {
    return NextResponse.json({ error: "AI image generation failed." }, { status: 500 });
  }
}
