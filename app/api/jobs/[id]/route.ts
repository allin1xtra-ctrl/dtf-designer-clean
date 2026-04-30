import { patchJob } from "../../_lib/store";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const patch = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const job = patchJob(id, patch);

  if (!job) {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }

  return Response.json({ ok: true, job });
}
