import { NextRequest, NextResponse } from "next/server";

import { verifyStagingAdminRequest, STAGING_NO_STORE_HEADERS } from "@/lib/customizer-foundation/admin-auth";
import {
  isCartDesignPayload,
  validateCartPayloadCompleteness,
  type CartDesignPayload,
} from "@/lib/customizer-foundation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const authError = verifyStagingAdminRequest(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const payload = body?.payload as CartDesignPayload | undefined;

  if (!isCartDesignPayload(payload)) {
    return NextResponse.json(
      {
        error: "Missing or invalid design payload.",
        stagingOnly: true,
      },
      { status: 400, headers: STAGING_NO_STORE_HEADERS }
    );
  }

  const validation = validateCartPayloadCompleteness(payload);

  return NextResponse.json(
    {
      ok: validation.ok,
      stagingOnly: true,
      connectedToCheckout: false,
      message: validation.ok
        ? "Design payload is complete enough for staging review. No live checkout was called."
        : "Design payload needs fixes before any checkout bridge work.",
      payloadSummary: summarizePayload(payload),
      validation,
    },
    {
      status: validation.ok ? 200 : 400,
      headers: STAGING_NO_STORE_HEADERS,
    }
  );
}

function summarizePayload(payload: CartDesignPayload) {
  return {
    configId: payload.configId,
    mode: payload.mode,
    quantity: payload.quantity,
    productHandle: payload.productHandle || null,
    variantIdPresent: Boolean(payload.variantId),
    selectedColorId: payload.selectedColorId || null,
    selectedPrintLocationId: payload.selectedPrintLocationId || null,
    selectedTransferSizeId: payload.selectedTransferSizeId || null,
    layerCount: payload.layers.length,
    previewImageUrlPresent: Boolean(payload.previewImageUrl),
    productionFileUrlPresent: Boolean(payload.productionFileUrl),
  };
}
