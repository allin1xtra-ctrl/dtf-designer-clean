import { NextRequest, NextResponse } from "next/server";

import { ADMIN_NO_STORE_HEADERS, verifyAdminApiRequest } from "@/lib/admin-customizer/session";
import { readAdminCustomizerStore, upsertMockupProduct, upsertMockupVariant } from "@/lib/admin-customizer/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authError = verifyAdminApiRequest(req);
  if (authError) return authError;
  const store = await readAdminCustomizerStore();
  return NextResponse.json(
    {
      products: store.mockupProducts,
      variants: store.mockupVariants,
    },
    { headers: ADMIN_NO_STORE_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  const authError = verifyAdminApiRequest(req);
  if (authError) return authError;
  const body = await req.json().catch(() => null);
  const kind = body?.kind === "variant" ? "variant" : "product";
  const result = kind === "variant"
    ? await upsertMockupVariant(body?.variant || body)
    : await upsertMockupProduct(body?.product || body);
  if (!result.value) {
    return NextResponse.json({ errors: result.errors }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
  }
  return NextResponse.json({ [kind]: result.value, errors: [] }, { headers: ADMIN_NO_STORE_HEADERS });
}
