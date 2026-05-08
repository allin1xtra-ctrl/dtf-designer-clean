import { describe, it, expect } from "vitest";
import { GET } from "../../app/api/health/route";

describe("GET /api/health", () => {
  it("returns ok:true and the service name", async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe("next-api-fallback");
  });
});
