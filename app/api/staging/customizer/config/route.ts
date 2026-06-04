import { NextRequest, NextResponse } from "next/server";

import { verifyStagingAdminRequest, STAGING_NO_STORE_HEADERS } from "@/lib/customizer-foundation/admin-auth";
import {
  DEFAULT_CUSTOMIZER_CONFIGS,
  getDefaultCustomizerConfig,
  validateProductCustomizerConfig,
  type ProductCustomizerConfig,
} from "@/lib/customizer-foundation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const stagedConfigs = new Map<string, ProductCustomizerConfig>();

export async function GET(req: NextRequest) {
  const authError = verifyStagingAdminRequest(req);
  if (authError) return authError;

  const id = req.nextUrl.searchParams.get("id") || "";
  const config = stagedConfigs.get(id) || getDefaultCustomizerConfig(id);

  return NextResponse.json(
    {
      stagingOnly: true,
      persisted: stagedConfigs.has(config.id),
      config,
      availableConfigIds: Object.keys(DEFAULT_CUSTOMIZER_CONFIGS),
    },
    { headers: STAGING_NO_STORE_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  const authError = verifyStagingAdminRequest(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const config = body?.config as ProductCustomizerConfig | undefined;

  if (!config) {
    return NextResponse.json(
      { error: "Missing config payload.", stagingOnly: true },
      { status: 400, headers: STAGING_NO_STORE_HEADERS }
    );
  }

  const validation = validateProductCustomizerConfig(config);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Customizer config validation failed.", validation, stagingOnly: true },
      { status: 400, headers: STAGING_NO_STORE_HEADERS }
    );
  }

  stagedConfigs.set(config.id, config);

  return NextResponse.json(
    {
      ok: true,
      stagingOnly: true,
      savedTo: "in-memory staging route only",
      message: "Config accepted for staging preview. Production and Shopify were not changed.",
      config,
      validation,
    },
    { headers: STAGING_NO_STORE_HEADERS }
  );
}
