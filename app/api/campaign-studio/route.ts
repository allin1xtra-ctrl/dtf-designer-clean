import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CampaignRequest = {
  campaignBrief?: string;
  targetAudience?: string;
  productDetails?: string;
  tone?: string;
  channels?: string;
};

const DEFAULT_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-5.4-mini";
const DEFAULT_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const DEFAULT_IMAGE_SIZE = process.env.OPENAI_IMAGE_SIZE || "1024x1024";
export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY." }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const body = (await request.json().catch(() => ({}))) as CampaignRequest;
  const campaignBrief = body.campaignBrief?.trim();
  const targetAudience = body.targetAudience?.trim();
  const productDetails = body.productDetails?.trim();
  const tone = body.tone?.trim();
  const channels = body.channels?.trim();

  if (!campaignBrief || !targetAudience || !productDetails || !tone || !channels) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const sharedContext = `Campaign brief: ${campaignBrief}\nTarget audience: ${targetAudience}\nProduct details: ${productDetails}\nTone: ${tone}\nChannels: ${channels}`;

  try {
    const strategy = await openai.responses.create({
      model: DEFAULT_TEXT_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are a senior marketing strategist. Return strict JSON with keys: concept, variants, checklist, imagePrompts. variants must be exactly 3 items with headline and body. checklist should have 6-10 short launch tasks. imagePrompts must be exactly 3 visual direction prompts.",
            },
          ],
        },
        { role: "user", content: [{ type: "input_text", text: sharedContext }] },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "campaign_studio_output",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              concept: { type: "string" },
              variants: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    headline: { type: "string" },
                    body: { type: "string" },
                  },
                  required: ["headline", "body"],
                },
              },
              checklist: { type: "array", minItems: 6, items: { type: "string" } },
              imagePrompts: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: { type: "string" },
              },
            },
            required: ["concept", "variants", "checklist", "imagePrompts"],
          },
        },
      },
    });

    const rawText = strategy.output_text?.trim();

    if (!rawText) {
      return NextResponse.json({ error: "Model returned no text output." }, { status: 502 });
    }

    let parsed: {
      concept: string;
      variants: { headline: string; body: string }[];
      checklist: string[];
      imagePrompts: string[];
    };

    try {
      parsed = JSON.parse(rawText) as {
        concept: string;
        variants: { headline: string; body: string }[];
        checklist: string[];
        imagePrompts: string[];
      };
    } catch {
      return NextResponse.json({ error: "Model returned invalid JSON." }, { status: 502 });
    }

    const images = await Promise.all(
      parsed.imagePrompts.map(async (prompt) => {
        const imageResponse = await openai.responses.create({
          model: DEFAULT_IMAGE_MODEL,
          input: `${prompt}\n\nCampaign context:\n${sharedContext}`,
          tools: [{ type: "image_generation", size: DEFAULT_IMAGE_SIZE }],
        });

        const imageBase64 = imageResponse.output
          .filter((item) => item.type === "image_generation_call")
          .map((item) => (item.type === "image_generation_call" ? item.result : null))
          .find(Boolean);

        if (!imageBase64) {
          throw new Error("No image output generated");
        }

        return `data:image/png;base64,${imageBase64}`;
      })
    );

    return NextResponse.json({ ...parsed, images });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Campaign studio failed: ${message}` }, { status: 500 });
  }
}
