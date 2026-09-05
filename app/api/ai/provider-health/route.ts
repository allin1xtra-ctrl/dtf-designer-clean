import OpenAI from "openai";
import { NextResponse } from "next/server";

import { AI_IMAGE_MODEL } from "../_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 15;

export async function GET() {
  const configured = Boolean(process.env.OPENAI_API_KEY);
  if (!configured) {
    return NextResponse.json(
      { ok: false, configured: false, model: AI_IMAGE_MODEL, error: "AI provider is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = await openai.models.retrieve(AI_IMAGE_MODEL);
    return NextResponse.json(
      {
        ok: true,
        configured: true,
        model: AI_IMAGE_MODEL,
        providerReachable: true,
        modelAvailable: Boolean(model?.id),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const candidate = error as { status?: number; code?: string; type?: string };
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        model: AI_IMAGE_MODEL,
        providerReachable: Boolean(candidate.status),
        modelAvailable: false,
        status: candidate.status || null,
        code: candidate.code || null,
        type: candidate.type || null,
        error:
          candidate.status === 401
            ? "AI provider credentials are invalid or expired."
            : candidate.status === 403
              ? "AI image model access is not enabled."
              : candidate.status === 404
                ? "Configured AI image model is unavailable."
                : candidate.status === 429
                  ? "AI provider rate or billing limit is blocking requests."
                  : "AI provider health check failed.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
