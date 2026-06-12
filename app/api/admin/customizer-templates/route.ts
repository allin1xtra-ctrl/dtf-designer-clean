import { NextRequest, NextResponse } from "next/server";

import { ADMIN_NO_STORE_HEADERS, verifyAdminApiRequest } from "@/lib/admin-customizer/session";
import { deleteTemplate, readAdminCustomizerStore, upsertTemplate } from "@/lib/admin-customizer/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authError = verifyAdminApiRequest(req);
  if (authError) return authError;
  const store = await readAdminCustomizerStore();
  return NextResponse.json({ templates: store.templates }, { headers: ADMIN_NO_STORE_HEADERS });
}

export async function POST(req: NextRequest) {
  const authError = verifyAdminApiRequest(req);
  if (authError) return authError;
  const body = await req.json().catch(() => null);
  const result = await upsertTemplate(body?.template || body);
  if (!result.value) {
    return NextResponse.json({ errors: result.errors }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
  }
  return NextResponse.json({ template: result.value, errors: [] }, { headers: ADMIN_NO_STORE_HEADERS });
}

export async function DELETE(req: NextRequest) {
  const authError = verifyAdminApiRequest(req);
  if (authError) return authError;
  const id = req.nextUrl.searchParams.get("id") || "";
  const result = await deleteTemplate(id);
  if (result.errors.length) {
    return NextResponse.json({ errors: result.errors }, { status: 404, headers: ADMIN_NO_STORE_HEADERS });
  }
  return NextResponse.json({ ok: true, errors: [] }, { headers: ADMIN_NO_STORE_HEADERS });
}
