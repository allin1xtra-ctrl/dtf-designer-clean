import { describe, it, expect, vi } from "vitest";

async function freshSettingsRoute() {
  vi.resetModules();
  return import("../../app/api/settings/route");
}

describe("GET /api/settings", () => {
  it("returns ok:true with settings and metrics", async () => {
    const { GET } = await freshSettingsRoute();
    const response = await GET();
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.settings).toBeDefined();
    expect(body.metrics).toBeDefined();
    expect(typeof body.settings.storeName).toBe("string");
    expect(typeof body.metrics.totalJobs).toBe("number");
  });

  it("returns default settings values", async () => {
    const { GET } = await freshSettingsRoute();
    const response = await GET();
    const body = await response.json();
    expect(body.settings.storeName).toBe("DTF Designer Pro");
    expect(body.settings.supportEmail).toBe("support@example.com");
  });
});

describe("POST /api/settings", () => {
  it("updates settings and returns the new values", async () => {
    vi.resetModules();
    const { GET, POST } = await import("../../app/api/settings/route");

    const postReq = new Request("http://localhost/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeName: "Updated Store" }),
    });
    const postResponse = await POST(postReq);
    const postBody = await postResponse.json();
    expect(postBody.ok).toBe(true);
    expect(postBody.settings.storeName).toBe("Updated Store");

    // Verify GET reflects the update
    const getResponse = await GET();
    const getBody = await getResponse.json();
    expect(getBody.settings.storeName).toBe("Updated Store");
  });

  it("preserves unmodified fields on partial update", async () => {
    vi.resetModules();
    const { POST } = await import("../../app/api/settings/route");

    const postReq = new Request("http://localhost/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minUploadDpi: 300 }),
    });
    const response = await POST(postReq);
    const body = await response.json();
    expect(body.settings.minUploadDpi).toBe(300);
    // storeName should remain as the default
    expect(body.settings.storeName).toBe("DTF Designer Pro");
  });

  it("handles invalid JSON body by using empty object", async () => {
    const { POST } = await freshSettingsRoute();
    const postReq = new Request("http://localhost/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await POST(postReq);
    // Should not throw; returns ok with unchanged settings
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.settings).toBeDefined();
  });

  it("returns metrics in the POST response", async () => {
    const { POST } = await freshSettingsRoute();
    const postReq = new Request("http://localhost/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POST(postReq);
    const body = await response.json();
    expect(body.metrics).toBeDefined();
    expect(typeof body.metrics.totalJobs).toBe("number");
  });
});
