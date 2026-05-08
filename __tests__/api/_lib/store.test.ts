import { describe, it, expect, beforeEach, vi } from "vitest";

// Use a fresh module for each describe block to avoid shared mutable state
async function freshStore() {
  vi.resetModules();
  return import("../../../app/api/_lib/store");
}

describe("getSettings", () => {
  it("returns the default settings object", async () => {
    const { getSettings } = await freshStore();
    const settings = getSettings();
    expect(settings).toBeDefined();
    expect(settings.storeName).toBe("DTF Designer Pro");
    expect(settings.supportEmail).toBe("support@example.com");
    expect(typeof settings.minUploadDpi).toBe("number");
    expect(typeof settings.enableShopifyIntegration).toBe("boolean");
  });

  it("returns settings with default print areas defined", async () => {
    const { getSettings } = await freshStore();
    const settings = getSettings();
    expect(settings.printAreas).toHaveProperty("front");
    expect(settings.printAreas).toHaveProperty("back");
    expect(settings.printAreas).toHaveProperty("leftSleeve");
    expect(settings.printAreas).toHaveProperty("rightSleeve");
    expect(settings.printAreas).toHaveProperty("neck");
    expect(settings.printAreas.front.widthInches).toBe(11);
    expect(settings.printAreas.front.heightInches).toBe(13);
  });
});

describe("updateSettings", () => {
  it("merges new values into existing settings", async () => {
    const { getSettings, updateSettings } = await freshStore();
    updateSettings({ storeName: "My Shop" });
    expect(getSettings().storeName).toBe("My Shop");
  });

  it("returns the updated settings object", async () => {
    const { updateSettings } = await freshStore();
    const result = updateSettings({ minUploadDpi: 300 });
    expect(result.minUploadDpi).toBe(300);
  });

  it("preserves keys not included in the update", async () => {
    const { getSettings, updateSettings } = await freshStore();
    updateSettings({ storeName: "Updated" });
    expect(getSettings().supportEmail).toBe("support@example.com");
  });

  it("handles empty update object without error", async () => {
    const { getSettings, updateSettings } = await freshStore();
    const before = getSettings().storeName;
    updateSettings({});
    expect(getSettings().storeName).toBe(before);
  });
});

describe("saveJob / getJobs", () => {
  it("starts with an empty jobs array", async () => {
    const { getJobs } = await freshStore();
    expect(getJobs()).toHaveLength(0);
  });

  it("adds a new job to the front of the list", async () => {
    const { saveJob, getJobs } = await freshStore();
    saveJob({ id: "job-1", status: "Queued" });
    const jobs = getJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe("job-1");
    expect(jobs[0].status).toBe("Queued");
  });

  it("adds subsequent jobs at the front (unshift order)", async () => {
    const { saveJob, getJobs } = await freshStore();
    saveJob({ id: "first" });
    saveJob({ id: "second" });
    const jobs = getJobs();
    expect(jobs[0].id).toBe("second");
    expect(jobs[1].id).toBe("first");
  });

  it("updates an existing job by id instead of duplicating it", async () => {
    const { saveJob, getJobs } = await freshStore();
    saveJob({ id: "job-1", status: "Queued" });
    saveJob({ id: "job-1", status: "Completed" });
    const jobs = getJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].status).toBe("Completed");
  });

  it("merges extra fields on update", async () => {
    const { saveJob, getJobs } = await freshStore();
    saveJob({ id: "job-2", status: "Queued", note: "original" });
    saveJob({ id: "job-2", status: "Ready to print" });
    const jobs = getJobs();
    expect(jobs[0].note).toBe("original");
    expect(jobs[0].status).toBe("Ready to print");
  });

  it("returns the saved job", async () => {
    const { saveJob } = await freshStore();
    const result = saveJob({ id: "job-x" });
    expect(result.id).toBe("job-x");
  });
});

describe("patchJob", () => {
  it("returns null when job does not exist", async () => {
    const { patchJob } = await freshStore();
    expect(patchJob("nonexistent", { status: "Queued" })).toBeNull();
  });

  it("patches an existing job and returns it", async () => {
    const { saveJob, patchJob } = await freshStore();
    saveJob({ id: "j1", status: "Queued" });
    const patched = patchJob("j1", { status: "Completed" });
    expect(patched).not.toBeNull();
    expect(patched!.status).toBe("Completed");
  });

  it("preserves fields not included in the patch", async () => {
    const { saveJob, patchJob } = await freshStore();
    saveJob({ id: "j2", status: "Queued", extra: "preserved" });
    const patched = patchJob("j2", { status: "Ready to print" });
    expect((patched as { extra?: string })?.extra).toBe("preserved");
  });
});

describe("getMetrics", () => {
  it("returns zero counts with empty jobs list", async () => {
    const { getMetrics } = await freshStore();
    const metrics = getMetrics();
    expect(metrics.totalJobs).toBe(0);
    expect(metrics.queued).toBe(0);
    expect(metrics.ready).toBe(0);
    expect(metrics.completed).toBe(0);
  });

  it("correctly counts jobs by status", async () => {
    const { saveJob, getMetrics } = await freshStore();
    saveJob({ id: "a", status: "Queued" });
    saveJob({ id: "b", status: "Queued" });
    saveJob({ id: "c", status: "Ready to print" });
    saveJob({ id: "d", status: "Completed" });
    const metrics = getMetrics();
    expect(metrics.totalJobs).toBe(4);
    expect(metrics.queued).toBe(2);
    expect(metrics.ready).toBe(1);
    expect(metrics.completed).toBe(1);
  });

  it("includes uploadsEnabled flag and lastUpdated timestamp", async () => {
    const { getMetrics } = await freshStore();
    const metrics = getMetrics();
    expect(metrics.uploadsEnabled).toBe(true);
    expect(typeof metrics.lastUpdated).toBe("string");
    expect(() => new Date(metrics.lastUpdated)).not.toThrow();
  });
});
