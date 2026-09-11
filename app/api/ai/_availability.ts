import { NextResponse } from "next/server";

// Deliberately off by default. Future AI launch needs a separate reviewed change.
export function aiUnavailable() {
  return NextResponse.json({ ok: false, error: "AI design tools are temporarily unavailable." }, { status: 503 });
}
