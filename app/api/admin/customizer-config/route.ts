import { NextRequest, NextResponse } from "next/server";

import { verifyCustomizerAdminRequest, CUSTOMIZER_ADMIN_NO_STORE_HEADERS } from "@/lib/customizer/admin-auth";
import { DEFAULT_CUSTOMIZER_CONFIGS, getDefaultCustomizerConfig } from "@/lib/customizer/default-configs";
import { isProductCustomizerConfig, validateProductCustomizerConfig } from "@/lib/customizer/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authError = verifyCustomizerAdminRequest(req);
  if (authError) return authError;

  const id = req.nextUrl.searchParams.get("id") || "";
  const config = getDefaultCustomizerConfig(id);

  return NextResponse.json(
    {
      ok: true,
      stagingOnly: true,
      source: "default_config_only",
      availableConfigIds: Object.keys(DEFAULT_CUSTOMIZER_CONFIGS),
      config,
    },
    { headers: CUSTOMIZER_ADMIN_NO_STORE_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  const authError = verifyCustomizerAdminRequest(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const config = body?.config;

  if (!isProductCustomizerConfig(config)) {
    return NextResponse.json(
      {
        ok: false,
        stagingOnly: true,
        errors: ["Missing or invalid config payload."],
        warnings: [],
      },
      { status: 400, headers: CUSTOMIZER_ADMIN_NO_STORE_HEADERS }
    );
  }

  const validation = validateProductCustomizerConfig(config);
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: validation.ok,
        stagingOnly: true,
        message: "Customizer config failed staging validation. Nothing was saved.",
        errors: validation.errors,
        warnings: validation.warnings,
      },
      { status: 400, headers: CUSTOMIZER_ADMIN_NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      stagingOnly: true,
      message: "Customizer config accepted for staging review only. Shopify, database, checkout, Cloudinary, and AI providers were not changed.",
      savedTo: "none_staging_echo_only",
      config,
      errors: validation.errors,
      warnings: validation.warnings,
    },
    { headers: CUSTOMIZER_ADMIN_NO_STORE_HEADERS }
  );
}
