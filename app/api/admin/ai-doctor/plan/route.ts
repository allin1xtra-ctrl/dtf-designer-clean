import { NextRequest, NextResponse } from "next/server";
import { createDoctorPlan, DoctorMode } from "@/lib/admin-doctor/planner";
import { NO_STORE_HEADERS, verifyAdminDoctorRequest } from "../_auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isDoctorMode(value: unknown): value is DoctorMode {
  return value === "research" || value === "safe-fix";
}

export async function POST(req: NextRequest) {
  const authError = verifyAdminDoctorRequest(req);
  if (authError) return authError;

  const body = (await req.json().catch(() => ({}))) as {
    mode?: unknown;
    issue?: unknown;
  };
  const mode = isDoctorMode(body.mode) ? body.mode : "research";

  return NextResponse.json(
    createDoctorPlan(mode, body.issue),
    { headers: NO_STORE_HEADERS }
  );
}
