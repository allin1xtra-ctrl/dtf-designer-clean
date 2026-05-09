import { NextResponse } from "next/server";

type GenerateDesignBody = {
  prompt?: string;
};

function hasProviderConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
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

  if (!hasProviderConfig()) {
    return NextResponse.json(
      { ok: false, error: "AI design generation is not configured yet." },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { ok: false, error: "AI design generation provider integration is not implemented yet." },
    { status: 501 }
  );
}
