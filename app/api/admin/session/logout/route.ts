import { NextResponse } from "next/server";

import { ADMIN_NO_STORE_HEADERS, clearAdminSessionCookie } from "@/lib/admin-customizer/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const response = NextResponse.json({ authenticated: false }, { headers: ADMIN_NO_STORE_HEADERS });
  clearAdminSessionCookie(response);
  return response;
}
