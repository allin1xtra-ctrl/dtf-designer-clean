import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "dtf_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
export const ADMIN_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

type AdminSessionPayload = {
  role: "admin";
  issuedAt: number;
  expiresAt: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getAdminSecret() {
  return String(process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PANEL_TOKEN || "").trim();
}

export function getAdminToken() {
  return String(process.env.ADMIN_PANEL_TOKEN || "").trim();
}

function signPayload(payload: string) {
  const secret = getAdminSecret();
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSessionCookieValue() {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    role: "admin",
    issuedAt: now,
    expiresAt: now + ADMIN_SESSION_MAX_AGE_SECONDS,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

export function verifyAdminSessionCookieValue(value: string | undefined | null) {
  if (!value) return false;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return false;
  const expected = signPayload(encoded);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (!expected || signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return false;

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as AdminSessionPayload;
    return payload.role === "admin" && payload.expiresAt > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function hasAdminSession() {
  const cookieStore = await cookies();
  return verifyAdminSessionCookieValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export function verifyAdminApiRequest(req: NextRequest) {
  const cookieSession = verifyAdminSessionCookieValue(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  const panelToken = getAdminToken();
  const suppliedToken = String(
    req.headers.get("x-admin-token") ||
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      ""
  ).trim();

  if (cookieSession || (panelToken && suppliedToken === panelToken)) return null;

  return NextResponse.json(
    { error: "Unauthorized", message: "Admin session required." },
    { status: 401, headers: ADMIN_NO_STORE_HEADERS }
  );
}

export function setAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
