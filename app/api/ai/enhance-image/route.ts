import { NextResponse } from "next/server";

function hasProviderConfig() {
  return Boolean(process.env.CLIPDROP_API_KEY || process.env.REPLICATE_API_TOKEN || process.env.CLOUDINARY_API_KEY);
}

export async function POST() {
  if (!hasProviderConfig()) {
    return NextResponse.json(
      { ok: false, error: "AI image enhancer is not configured yet." },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { ok: false, error: "AI image enhancer provider integration is not implemented yet." },
    { status: 501 }
  );
}
