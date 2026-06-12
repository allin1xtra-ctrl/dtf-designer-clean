import { NextRequest, NextResponse } from "next/server";

import { verifyCustomizerAdminRequest, CUSTOMIZER_ADMIN_NO_STORE_HEADERS } from "@/lib/customizer/admin-auth";
import { isCartDesignPayload, validateCartDesignPayload } from "@/lib/customizer/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function POST(req: NextRequest) {
  const authError = verifyCustomizerAdminRequest(req);
  if (authError) return authError;

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        errors: ["Invalid JSON body."],
        warnings: [],
      },
      { status: 400, headers: CUSTOMIZER_ADMIN_NO_STORE_HEADERS }
    );
  }

  const nestedPayload = isRecord(body) ? body.payload : null;
  const payload = isCartDesignPayload(body) ? body : isCartDesignPayload(nestedPayload) ? nestedPayload : null;

  if (!payload) {
    return NextResponse.json(
      {
        ok: false,
        errors: ["Invalid request body. Provide a CartDesignPayload or { payload: CartDesignPayload }."],
        warnings: [],
      },
      { status: 400, headers: CUSTOMIZER_ADMIN_NO_STORE_HEADERS }
    );
  }

  const validation = validateCartDesignPayload(payload);

  return NextResponse.json(
    {
      ok: validation.ok,
      errors: validation.errors,
      warnings: validation.warnings,
    },
    { status: 200, headers: CUSTOMIZER_ADMIN_NO_STORE_HEADERS }
  );
}
