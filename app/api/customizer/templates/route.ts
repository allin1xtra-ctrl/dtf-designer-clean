import { NextResponse } from "next/server";

import { listPublicTemplates } from "@/lib/admin-customizer/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const templates = await listPublicTemplates();
  return NextResponse.json(
    {
      templates,
      source: templates.length ? "admin_store" : "hardcoded_fallback_expected",
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
