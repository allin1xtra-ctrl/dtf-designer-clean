import { NextResponse } from "next/server";

export const AI_IMAGE_MODEL = process.env.AI_IMAGE_MODEL || "gpt-image-1";
export const AI_CONFIG_ERROR =
  "AI design generation is not configured. Add OPENAI_API_KEY in Vercel Environment Variables.";

const DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/;

export type AiSuccessPayload = {
  ok: true;
  imageDataUrl: string;
  note?: string;
  suggestions?: string[];
};

export type AiErrorPayload = {
  ok: false;
  error: string;
};

type ParsedImageDataUrlSuccess = {
  mimeType: string;
  buffer: Buffer;
};

type ParsedImageDataUrlError = {
  error: string;
};

export function successJson(payload: Omit<AiSuccessPayload, "ok">, status = 200) {
  return NextResponse.json({ ok: true, ...payload } satisfies AiSuccessPayload, { status });
}

export function errorJson(error: string, status = 500) {
  return NextResponse.json({ ok: false, error } satisfies AiErrorPayload, { status });
}

export async function readJsonBody<T>(request: Request) {
  return (await request.json().catch(() => ({}))) as T;
}

export function parseImageDataUrl(
  imageDataUrl: unknown
): ParsedImageDataUrlSuccess | ParsedImageDataUrlError {
  if (typeof imageDataUrl !== "string") {
    return { error: "Invalid imageDataUrl. Provide a base64 image data URL." } as const;
  }

  const trimmed = imageDataUrl.trim();
  const match = trimmed.match(DATA_URL_PATTERN);

  if (!match) {
    return { error: "Invalid imageDataUrl. Provide a base64 image data URL." } as const;
  }

  const mimeType = match[1];
  const base64 = match[2]?.replace(/\s+/g, "") || "";

  if (!mimeType || !base64) {
    return { error: "Invalid imageDataUrl. Provide a base64 image data URL." };
  }

  try {
    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length) {
      return { error: "Invalid imageDataUrl. Provide a base64 image data URL." };
    }

    return {
      mimeType,
      buffer,
    };
  } catch {
    return { error: "Invalid imageDataUrl. Provide a base64 image data URL." };
  }
}

export function toPngDataUrl(buffer: Buffer) {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
