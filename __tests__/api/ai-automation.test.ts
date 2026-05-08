import { describe, it, expect } from "vitest";
import { POST } from "../../app/api/ai-automation/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/ai-automation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai-automation", () => {
  it("returns ok:true with a plan for valid apparel context", async () => {
    const response = await POST(
      makeRequest({
        context: {
          productMode: "apparel",
          currentView: "front",
          quantity: 10,
          sellPrice: 35,
          estimatedCost: 12,
        },
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.plan).toBeDefined();
    expect(body.plan.mode).toBe("apparel");
  });

  it("defaults to apparel mode when productMode is unrecognized", async () => {
    const response = await POST(makeRequest({ context: { productMode: "unknown" } }));
    const body = await response.json();
    expect(body.plan.mode).toBe("apparel");
  });

  it("uses transfer mode when specified", async () => {
    const response = await POST(makeRequest({ context: { productMode: "transfer" } }));
    const body = await response.json();
    expect(body.plan.mode).toBe("transfer");
  });

  it("clamps quantity to at least 1", async () => {
    const response = await POST(makeRequest({ context: { quantity: 0 } }));
    const body = await response.json();
    expect(body.plan.quantity).toBe(1);
  });

  it("uses provided quantity", async () => {
    const response = await POST(makeRequest({ context: { quantity: 24 } }));
    const body = await response.json();
    expect(body.plan.quantity).toBe(24);
  });

  it("computes currentMargin of 0 when sellPrice is 0", async () => {
    const response = await POST(
      makeRequest({ context: { sellPrice: 0, estimatedCost: 10 } })
    );
    const body = await response.json();
    expect(body.plan.currentMargin).toBe(0);
  });

  it("computes currentMargin correctly for known values", async () => {
    // sellPrice=50, estimatedCost=20 -> margin = (50-20)/50 * 100 = 60.0
    const response = await POST(
      makeRequest({ context: { sellPrice: 50, estimatedCost: 20 } })
    );
    const body = await response.json();
    expect(body.plan.currentMargin).toBe(60);
  });

  it("includes notes and actions in the plan", async () => {
    const response = await POST(makeRequest({ context: {} }));
    const body = await response.json();
    expect(Array.isArray(body.plan.notes)).toBe(true);
    expect(body.plan.notes.length).toBeGreaterThan(0);
    expect(Array.isArray(body.plan.actions)).toBe(true);
    expect(body.plan.actions.length).toBeGreaterThan(0);
  });

  it("mentions low artwork quality in notes when lastUploadStatus is low", async () => {
    const response = await POST(
      makeRequest({ context: { lastUploadStatus: "low" } })
    );
    const body = await response.json();
    const lowNote = body.plan.notes.some((n: string) =>
      n.toLowerCase().includes("dpi") || n.toLowerCase().includes("quality")
    );
    expect(lowNote).toBe(true);
  });

  it("returns 500 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/ai-automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await POST(req);
    expect(response.status).toBe(500);
  });
});
