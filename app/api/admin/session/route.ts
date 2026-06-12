import { NextRequest, NextResponse } from "next/server";

import { ADMIN_NO_STORE_HEADERS, getAdminToken, hasAdminSession, setAdminSessionCookie } from "@/lib/admin-customizer/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({ authenticated: await hasAdminSession() }, { headers: ADMIN_NO_STORE_HEADERS });
}

export async function POST(req: NextRequest) {
  const adminToken = getAdminToken();
  if (!adminToken) {
    return NextResponse.json(
      { error: "Missing ADMIN_PANEL_TOKEN. Admin login is locked until it is configured." },
      { status: 500, headers: ADMIN_NO_STORE_HEADERS }
    );
  }

  const body = await req.json().catch(() => null);
  const suppliedToken = String(body?.token || "").trim();
  if (!suppliedToken || suppliedToken !== adminToken) {
    return NextResponse.json(
      { error: "Invalid admin token." },
      { status: 401, headers: ADMIN_NO_STORE_HEADERS }
    );
  }

  const response = NextResponse.json({ authenticated: true }, { headers: ADMIN_NO_STORE_HEADERS });
  setAdminSessionCookie(response);
  return response;
}
