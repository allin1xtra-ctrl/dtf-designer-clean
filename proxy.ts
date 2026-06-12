import { NextRequest, NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "dtf_admin_session";

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PANEL_TOKEN || "";
}

async function verifyAdminCookie(value: string | undefined) {
  const secret = getSecret();
  if (!value || !secret) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signed))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  if (expected !== signature) return false;

  try {
    const paddedPayload = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(paddedPayload)) as { role?: string; expiresAt?: number };
    return decoded.role === "admin" && Number(decoded.expiresAt) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const isAdmin = await verifyAdminCookie(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (isAdmin) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
