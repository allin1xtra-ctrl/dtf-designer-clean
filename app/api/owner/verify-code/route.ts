import { NextRequest, NextResponse } from "next/server";

import { verifyCode } from "@/lib/owner-auth/code-store";
import {
  OWNER_NO_STORE_HEADERS,
  setOwnerSessionCookie,
} from "@/lib/owner-auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isPreviewEnvironment(): boolean {
  const env = (process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development").toLowerCase();
  return env !== "production";
}

function getOwnerEmail(): string {
  return String(process.env.OWNER_EMAIL || "").trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  if (!isPreviewEnvironment()) {
    return NextResponse.json(
      { error: "Owner signup is only available in Preview." },
      { status: 403, headers: OWNER_NO_STORE_HEADERS }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400, headers: OWNER_NO_STORE_HEADERS }
    );
  }

  const data = body as Record<string, unknown>;
  const email = String(data?.email ?? "").trim().toLowerCase();
  const code = String(data?.code ?? "").trim();

  if (!email || !code) {
    return NextResponse.json(
      { error: "email and code are required." },
      { status: 400, headers: OWNER_NO_STORE_HEADERS }
    );
  }

  const ownerEmail = getOwnerEmail();
  if (!ownerEmail || email !== ownerEmail) {
    return NextResponse.json(
      { error: "Invalid code." },
      { status: 401, headers: OWNER_NO_STORE_HEADERS }
    );
  }

  const valid = verifyCode(email, code);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid or expired code." },
      { status: 401, headers: OWNER_NO_STORE_HEADERS }
    );
  }

  const response = NextResponse.json(
    { authenticated: true, email },
    { status: 200, headers: OWNER_NO_STORE_HEADERS }
  );
  setOwnerSessionCookie(response, email);
  return response;
}
