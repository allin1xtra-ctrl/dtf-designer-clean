import { NextRequest, NextResponse } from "next/server";

export const CUSTOMIZER_ADMIN_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export function verifyCustomizerAdminRequest(req: NextRequest) {
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
        error: "Unauthorized",
        reason: "Customizer config staging APIs require x-admin-token.",
        expectedHeader: "x-admin-token",
      },
      { status: 401, headers: CUSTOMIZER_ADMIN_NO_STORE_HEADERS }
    );
  }

  if (!suppliedToken || suppliedToken !== panelToken) {
    return NextResponse.json(
      { error: "Unauthorized", expectedHeader: "x-admin-token" },
      { status: 401, headers: CUSTOMIZER_ADMIN_NO_STORE_HEADERS }
    );
  }

  return null;
}
