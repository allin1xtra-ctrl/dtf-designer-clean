import { getSettings, getMetrics, updateSettings } from "../_lib/store";

export async function GET() {
  return Response.json({ ok: true, settings: getSettings(), metrics: getMetrics() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return Response.json({ ok: true, settings: updateSettings(body), metrics: getMetrics() });
}
