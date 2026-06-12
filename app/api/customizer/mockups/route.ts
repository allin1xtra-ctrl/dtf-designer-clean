import { NextResponse } from "next/server";

import { listPublicMockups } from "@/lib/admin-customizer/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const mockups = await listPublicMockups();
  return NextResponse.json(
    {
      ...mockups,
      source: mockups.variants.length ? "admin_store" : "hardcoded_fallback_expected",
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
