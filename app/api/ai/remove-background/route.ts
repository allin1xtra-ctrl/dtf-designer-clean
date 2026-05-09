import { NextResponse } from "next/server";

function hasProviderConfig() {
  return Boolean(process.env.REMOVE_BG_API_KEY || process.env.CLIPDROP_API_KEY);
}

export async function POST() {
  if (!hasProviderConfig()) {
    return NextResponse.json(
      { ok: false, error: "AI background remover is not configured yet." },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { ok: false, error: "AI background remover provider integration is not implemented yet." },
    { status: 501 }
  );
}
