import { describe, it, expect, vi, beforeEach } from "vitest";

// Use fresh module state for each test to prevent shared mutable state
async function freshModules() {
  vi.resetModules();
  const jobs = await import("../../app/api/jobs/route");
  const jobById = await import("../../app/api/jobs/[id]/route");
  return { jobs, jobById };
}

describe("GET /api/jobs", () => {
  it("returns an empty jobs array initially", async () => {
    const { jobs } = await freshModules();
    const response = await jobs.GET();
    const body = await response.json();
    expect(Array.isArray(body.jobs)).toBe(true);
    expect(body.jobs).toHaveLength(0);
  });
});

describe("POST /api/jobs", () => {
  it("returns 400 when job id is missing", async () => {
    const { jobs } = await freshModules();
    const request = new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Queued" }),
    });
    const response = await jobs.POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/id/i);
  });

  it("returns 400 when body is null/invalid JSON", async () => {
    const { jobs } = await freshModules();
    const request = new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await jobs.POST(request);
    expect(response.status).toBe(400);
  });

  it("saves a job and returns ok:true with the saved job", async () => {
    const { jobs } = await freshModules();
    const request = new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "job-001", status: "Queued", artwork: "url" }),
    });
    const response = await jobs.POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.job.id).toBe("job-001");
    expect(body.job.status).toBe("Queued");
  });

  it("coerces job id to string", async () => {
    const { jobs } = await freshModules();
    const request = new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: 42, status: "Queued" }),
    });
    const response = await jobs.POST(request);
    const body = await response.json();
    expect(typeof body.job.id).toBe("string");
    expect(body.job.id).toBe("42");
  });

  it("saved job is returned by subsequent GET", async () => {
    // Both routes must share the same store module instance
    vi.resetModules();
    const jobsRoute = await import("../../app/api/jobs/route");

    const postReq = new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "j-shared", status: "Queued" }),
    });
    await jobsRoute.POST(postReq);

    const getResponse = await jobsRoute.GET();
    const body = await getResponse.json();
    expect(body.jobs.some((j: { id: string }) => j.id === "j-shared")).toBe(true);
  });
});

describe("PATCH /api/jobs/[id]", () => {
  it("returns 404 when job does not exist", async () => {
    const { jobById } = await freshModules();
    const request = new Request("http://localhost/api/jobs/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Completed" }),
    });
    const response = await jobById.PATCH(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/not found/i);
  });

  it("patches an existing job and returns it", async () => {
    vi.resetModules();
    const jobsRoute = await import("../../app/api/jobs/route");
    const jobByIdRoute = await import("../../app/api/jobs/[id]/route");

    // Create the job first
    const postReq = new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "patch-target", status: "Queued" }),
    });
    await jobsRoute.POST(postReq);

    // Now patch it
    const patchReq = new Request("http://localhost/api/jobs/patch-target", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Completed" }),
    });
    const response = await jobByIdRoute.PATCH(patchReq, {
      params: Promise.resolve({ id: "patch-target" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.job.status).toBe("Completed");
  });

  it("uses empty patch when body is invalid JSON", async () => {
    vi.resetModules();
    const jobsRoute = await import("../../app/api/jobs/route");
    const jobByIdRoute = await import("../../app/api/jobs/[id]/route");

    await jobsRoute.POST(
      new Request("http://localhost/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "j-bad-patch", status: "Queued" }),
      })
    );

    const patchReq = new Request("http://localhost/api/jobs/j-bad-patch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await jobByIdRoute.PATCH(patchReq, {
      params: Promise.resolve({ id: "j-bad-patch" }),
    });
    // Should still succeed (empty patch)
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.job.id).toBe("j-bad-patch");
    expect(body.job.status).toBe("Queued"); // unchanged
  });
});
