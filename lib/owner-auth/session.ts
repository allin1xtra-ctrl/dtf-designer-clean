/**
 * Owner session utilities — cookie-based, HMAC-signed, 8-hour TTL.
 */

import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const OWNER_SESSION_COOKIE = "dtf_owner_session";
export const OWNER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours
export const OWNER_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

type OwnerSessionPayload = {
  role: "owner";
  email: string;
  issuedAt: number;
  expiresAt: number;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getOwnerSecret(): string {
  return String(
    process.env.OWNER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || ""
  ).trim();
}

function signPayload(encoded: string): string {
  const secret = getOwnerSecret();
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
}

export function createOwnerSessionCookieValue(email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: OwnerSessionPayload = {
    role: "owner",
    email,
    issuedAt: now,
    expiresAt: now + OWNER_SESSION_MAX_AGE_SECONDS,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

export function verifyOwnerSessionCookieValue(
  value: string | undefined | null
): string | false {
  if (!value) return false;
  const dotIndex = value.indexOf(".");
  if (dotIndex === -1) return false;
  const encoded = value.slice(0, dotIndex);
  const signature = value.slice(dotIndex + 1);
  if (!encoded || !signature) return false;

  const expected = signPayload(encoded);
  if (!expected) return false;

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as OwnerSessionPayload;
    if (
      payload.role !== "owner" ||
      payload.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return false;
    }
    return payload.email;
  } catch {
    return false;
  }
}

export async function getOwnerSessionEmail(): Promise<string | false> {
  const cookieStore = await cookies();
  return verifyOwnerSessionCookieValue(
    cookieStore.get(OWNER_SESSION_COOKIE)?.value
  );
}

export function setOwnerSessionCookie(response: NextResponse, email: string): void {
  response.cookies.set(OWNER_SESSION_COOKIE, createOwnerSessionCookieValue(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OWNER_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearOwnerSessionCookie(response: NextResponse): void {
  response.cookies.set(OWNER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
