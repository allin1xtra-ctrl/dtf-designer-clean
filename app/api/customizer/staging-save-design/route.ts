import { NextRequest, NextResponse } from "next/server";

import {
  createStagingSavedDesign,
  sanitizeLineItemPropertiesPreview,
  validateStagingDesignPayload,
} from "@/lib/customizer/design-payload";
import type { CartDesignPayload } from "@/lib/customizer/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STAGING_SAVE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const payload = body?.payload ?? body;
  const validation = validateStagingDesignPayload(payload);

  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      { status: 400, headers: STAGING_SAVE_HEADERS }
    );
  }

  const typedPayload = payload as CartDesignPayload;
  const savedDesign = createStagingSavedDesign(typedPayload);

  return NextResponse.json(
    {
      ok: true,
      errors: [],
      warnings: [
        ...validation.warnings,
        "Staging design payload accepted only. Shopify, checkout, production cart, production upload, and storage providers were not called.",
      ],
      savedDesign,
      lineItemPropertiesPreview: sanitizeLineItemPropertiesPreview(typedPayload),
    },
    { headers: STAGING_SAVE_HEADERS }
  );
}
