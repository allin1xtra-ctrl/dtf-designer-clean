import { getJobs, getMetrics, getSettings } from "../_lib/store";

export async function GET() {
  return Response.json({ ok: true, settings: getSettings(), metrics: getMetrics(), jobs: getJobs() });
}
