import { NextResponse } from "next/server";

function hasProviderConfig() {
  return Boolean(process.env.CLOUDINARY_API_KEY || process.env.REPLICATE_API_TOKEN);
}

export async function POST() {
  if (!hasProviderConfig()) {
    return NextResponse.json(
      { ok: false, error: "AI vectorizer is not configured yet." },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { ok: false, error: "AI vectorizer provider integration is not implemented yet." },
    { status: 501 }
  );
}
