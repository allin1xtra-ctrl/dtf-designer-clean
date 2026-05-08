import { describe, it, expect } from "vitest";
import { GET, OPTIONS } from "../../app/api/ping/route";

describe("GET /api/ping", () => {
  it("returns 200 with ok:true and a timestamp", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.message).toBe("Vercel API route is live");
    expect(typeof body.time).toBe("string");
    expect(() => new Date(body.time)).not.toThrow();
  });

  it("includes Access-Control-Allow-Origin header", async () => {
    const response = await GET();
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://yourdtfplug.com"
    );
  });
});

describe("OPTIONS /api/ping", () => {
  it("returns 204 No Content for preflight", async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(204);
  });

  it("includes correct CORS headers for preflight", async () => {
    const response = await OPTIONS();
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://yourdtfplug.com"
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});
