import { NextRequest, NextResponse } from "next/server";
import { runDoctorHealthChecks } from "@/lib/admin-doctor/checks";
import { NO_STORE_HEADERS, verifyAdminDoctorRequest } from "../_auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authError = verifyAdminDoctorRequest(req);
  if (authError) return authError;

  return NextResponse.json(runDoctorHealthChecks(), { headers: NO_STORE_HEADERS });
}
