import { describe, it, expect } from "vitest";
import { POST } from "../../app/api/ai-chat/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai-chat", () => {
  it("returns 400 when message is missing", async () => {
    const response = await POST(makeRequest({ context: {} }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when message is empty string", async () => {
    const response = await POST(makeRequest({ message: "  ", context: {} }));
    expect(response.status).toBe(400);
  });

  it("returns ok:true with a reply for a variant/size message", async () => {
    const response = await POST(makeRequest({ message: "How do I pick a variant?" }));
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(typeof body.reply).toBe("string");
    expect(body.reply.length).toBeGreaterThan(0);
    expect(body.reply.toLowerCase()).toMatch(/variant|size/);
  });

  it("returns ok:true with a reply for an upload/art message", async () => {
    const response = await POST(makeRequest({ message: "How do I upload artwork?" }));
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.reply.toLowerCase()).toMatch(/upload|art|image|png/);
  });

  it("returns ok:true with a reply for a cart/checkout message", async () => {
    const response = await POST(makeRequest({ message: "How does cart checkout work?" }));
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.reply.toLowerCase()).toMatch(/cart|checkout/);
  });

  it("returns ok:true with a reply for a move/drag message", async () => {
    const response = await POST(makeRequest({ message: "How do I drag and move artwork?" }));
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.reply.toLowerCase()).toMatch(/drag|move|position/);
  });

  it("returns a generic reply for unrecognized messages", async () => {
    const response = await POST(
      makeRequest({ message: "random unrecognized query xyz" })
    );
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(typeof body.reply).toBe("string");
  });

  it("includes suggestions in the response", async () => {
    const response = await POST(makeRequest({ message: "help" }));
    const body = await response.json();
    expect(Array.isArray(body.suggestions)).toBe(true);
    expect(body.suggestions.length).toBeGreaterThan(0);
  });

  it("uses storeName from context in generic reply", async () => {
    const response = await POST(
      makeRequest({
        message: "something generic",
        context: { storeName: "My Custom Store" },
      })
    );
    const body = await response.json();
    expect(body.reply).toContain("My Custom Store");
  });

  it("uses currentView from context in suggestions", async () => {
    const response = await POST(
      makeRequest({
        message: "help",
        context: { currentView: "back" },
      })
    );
    const body = await response.json();
    expect(body.suggestions.some((s: string) => s.includes("back"))).toBe(true);
  });

  it("returns 500 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json",
    });
    const response = await POST(req);
    expect(response.status).toBe(500);
  });
});
