import { describe, it, expect, vi, afterEach } from "vitest";
import { POST } from "../../app/api/ai-design/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/ai-design", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/ai-design", () => {
  it("returns 400 when prompt is missing", async () => {
    const response = await POST(makeRequest({ context: {} }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when prompt is empty string", async () => {
    const response = await POST(makeRequest({ prompt: "   " }));
    expect(response.status).toBe(400);
  });

  it("returns fallback SVG data URL when Gemini key is absent", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "");
    const response = await POST(makeRequest({ prompt: "cool dragon" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.provider).toBe("Built-in AI fallback");
    expect(body.imageUrl).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("fallback SVG contains prompt words (headline) encoded in base64", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "");
    const response = await POST(makeRequest({ prompt: "tiger" }));
    const body = await response.json();
    const decoded = Buffer.from(body.imageUrl.split(",")[1], "base64").toString();
    expect(decoded).toContain("TIGER");
  });

  it("uses blue accent for white shirt color", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "");
    const response = await POST(
      makeRequest({ prompt: "design", context: { shirtColor: "white" } })
    );
    const body = await response.json();
    const decoded = Buffer.from(body.imageUrl.split(",")[1], "base64").toString();
    expect(decoded).toContain("#2563eb");
  });

  it("uses light-blue accent for non-white shirt color", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "");
    const response = await POST(
      makeRequest({ prompt: "design", context: { shirtColor: "black" } })
    );
    const body = await response.json();
    const decoded = Buffer.from(body.imageUrl.split(",")[1], "base64").toString();
    expect(decoded).toContain("#93c5fd");
  });

  it("escapes XML special characters in prompt", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "");
    const response = await POST(
      makeRequest({ prompt: 'A & B <test> "quotes"' })
    );
    const body = await response.json();
    const decoded = Buffer.from(body.imageUrl.split(",")[1], "base64").toString();
    // Raw <test> must not appear as an unescaped XML tag
    expect(decoded).not.toContain("<test>");
    // The & in "A & B" (headline, single-escaped) must appear as &amp;
    expect(decoded).toContain("&amp;");
  });

  it("falls back gracefully when Gemini API returns non-ok status", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.stubEnv("GOOGLE_API_KEY", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "quota exceeded" }), { status: 429 })
    );
    const response = await POST(makeRequest({ prompt: "test design" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.provider).toBe("Built-in AI fallback");
    fetchSpy.mockRestore();
  });

  it("returns 500 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/ai-design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await POST(req);
    expect(response.status).toBe(500);
  });
});
