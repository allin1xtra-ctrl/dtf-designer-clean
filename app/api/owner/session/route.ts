import { NextResponse } from "next/server";

import {
  clearOwnerSessionCookie,
  getOwnerSessionEmail,
  OWNER_NO_STORE_HEADERS,
} from "@/lib/owner-auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** GET /api/owner/session — returns current owner session status */
export async function GET() {
  const email = await getOwnerSessionEmail();
  if (!email) {
    return NextResponse.json(
      { authenticated: false },
      { status: 200, headers: OWNER_NO_STORE_HEADERS }
    );
  }
  return NextResponse.json(
    { authenticated: true, email },
    { status: 200, headers: OWNER_NO_STORE_HEADERS }
  );
}

/** DELETE /api/owner/session — sign out */
export async function DELETE() {
  const response = NextResponse.json(
    { authenticated: false },
    { status: 200, headers: OWNER_NO_STORE_HEADERS }
  );
  clearOwnerSessionCookie(response);
  return response;
}
