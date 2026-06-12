import { NextRequest, NextResponse } from "next/server";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export function verifyAdminDoctorRequest(req: NextRequest) {
  const panelToken = String(process.env.ADMIN_PANEL_TOKEN || "").trim();
  const suppliedToken = String(
    req.headers.get("x-admin-token") ||
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.nextUrl.searchParams.get("token") ||
      ""
  ).trim();

  if (!panelToken) {
    return NextResponse.json(
      {
        error: "Missing ADMIN_PANEL_TOKEN configuration. AI Doctor is locked until admin auth is configured.",
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  if (!suppliedToken || suppliedToken !== panelToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  return null;
}
