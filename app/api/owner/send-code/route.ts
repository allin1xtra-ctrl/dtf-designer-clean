import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { checkRateLimit, createCode } from "@/lib/owner-auth/code-store";
import { OWNER_NO_STORE_HEADERS } from "@/lib/owner-auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Guard: only allow this endpoint in Preview (non-production) deployments. */
function isPreviewEnvironment(): boolean {
  // VERCEL_ENV is set by Vercel: "production" | "preview" | "development"
  const env = (process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development").toLowerCase();
  return env !== "production";
}

function getOwnerEmail(): string {
  return String(process.env.OWNER_EMAIL || "").trim().toLowerCase();
}

function getResendApiKey(): string {
  return String(process.env.RESEND_API_KEY || "").trim();
}

function getFromAddress(): string {
  return String(process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev").trim();
}

export async function POST(req: NextRequest) {
  if (!isPreviewEnvironment()) {
    return NextResponse.json(
      { error: "Owner signup is only available in Preview." },
      { status: 403, headers: OWNER_NO_STORE_HEADERS }
    );
  }

  const ownerEmail = getOwnerEmail();
  if (!ownerEmail) {
    return NextResponse.json(
      { error: "OWNER_EMAIL is not configured." },
      { status: 500, headers: OWNER_NO_STORE_HEADERS }
    );
  }

  const resendKey = getResendApiKey();
  if (!resendKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured." },
      { status: 500, headers: OWNER_NO_STORE_HEADERS }
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

  const email = String((body as Record<string, unknown>)?.email ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return NextResponse.json(
      { error: "email is required." },
      { status: 400, headers: OWNER_NO_STORE_HEADERS }
    );
  }

  // Only the configured owner email may request a code
  if (email !== ownerEmail) {
    // Return same generic message to avoid user enumeration
    return NextResponse.json(
      { sent: true },
      { status: 200, headers: OWNER_NO_STORE_HEADERS }
    );
  }

  if (!checkRateLimit(email)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait 15 minutes before trying again." },
      { status: 429, headers: OWNER_NO_STORE_HEADERS }
    );
  }

  const code = createCode(email);
  const resend = new Resend(resendKey);

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: "Your DTF Designer sign-in code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#071015;color:#e5e5e5;border-radius:12px;">
          <p style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#67e8f9;margin:0 0 8px;">DTF Designer Pro — Owner Sign-In</p>
          <h1 style="font-size:28px;font-weight:900;color:#fff;margin:0 0 16px;">Your verification code</h1>
          <p style="font-size:14px;color:#a3a3a3;margin:0 0 24px;">Use the code below to sign in. It expires in <strong style="color:#e5e5e5;">10 minutes</strong> and can only be used once.</p>
          <div style="background:#0b1519;border:1px solid #2c424a;border-radius:8px;padding:20px;text-align:center;letter-spacing:0.3em;font-size:36px;font-weight:900;color:#67e8f9;">${code}</div>
          <p style="font-size:12px;color:#525252;margin:24px 0 0;">If you did not request this code, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[owner/send-code] Resend error:", err);
    return NextResponse.json(
      { error: "Failed to send verification email. Please try again." },
      { status: 502, headers: OWNER_NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    { sent: true },
    { status: 200, headers: OWNER_NO_STORE_HEADERS }
  );
}
