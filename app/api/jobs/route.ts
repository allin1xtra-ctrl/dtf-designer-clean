import { getJobs, saveJob } from "../_lib/store";

export async function GET() {
  return Response.json({ jobs: getJobs() });
}

export async function POST(request: Request) {
  const job = (await request.json().catch(() => null)) as { id?: string; [key: string]: unknown } | null;

  if (!job?.id) {
    return Response.json({ error: "Job id is required." }, { status: 400 });
  }

  const safeJob = { ...job, id: String(job.id) };
  saveJob(safeJob);
  return Response.json({ ok: true, job: safeJob });
}
