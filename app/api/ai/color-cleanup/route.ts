import { NextResponse } from "next/server";

function hasProviderConfig() {
  return Boolean(process.env.CLIPDROP_API_KEY || process.env.CLOUDINARY_API_KEY || process.env.REPLICATE_API_TOKEN);
}

export async function POST() {
  if (!hasProviderConfig()) {
    return NextResponse.json(
      { ok: false, error: "AI color cleanup is not configured yet." },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { ok: false, error: "AI color cleanup provider integration is not implemented yet." },
    { status: 501 }
  );
}
