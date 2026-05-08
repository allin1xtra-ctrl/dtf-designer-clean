import { describe, it, expect, vi, afterEach } from "vitest";
import { POST } from "../../app/api/process-image/route";

afterEach(() => {
  vi.restoreAllMocks();
});

function makeFormDataRequest(
  fileContent: Uint8Array | string = "fake",
  options: { removeBackground?: boolean; enhanceImage?: boolean } = {}
) {
  const file = new File(
    [typeof fileContent === "string" ? fileContent : fileContent],
    "test.png",
    { type: "image/png" }
  );
  const formData = new FormData();
  formData.append("file", file);
  if (options.removeBackground !== undefined) {
    formData.append("removeBackground", String(options.removeBackground));
  }
  if (options.enhanceImage !== undefined) {
    formData.append("enhanceImage", String(options.enhanceImage));
  }
  return new Request("http://localhost/api/process-image", {
    method: "POST",
    body: formData,
  });
}

// Create a minimal valid PNG (1x1 transparent) using raw bytes
function makeMinimalPng(): Uint8Array {
  // 1x1 RGBA PNG generated from a known base64
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

describe("POST /api/process-image", () => {
  it("returns 400 when no file is uploaded", async () => {
    const formData = new FormData();
    const request = new Request("http://localhost/api/process-image", {
      method: "POST",
      body: formData,
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/no file/i);
  });

  it("returns base64 data URL without processing when no flags set", async () => {
    const response = await POST(makeFormDataRequest("fake png bytes"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(true);
    expect(body.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(body.note).toMatch(/no processing/i);
  });

  it("returns dataUrl with correct MIME type matching file type", async () => {
    const file = new File(["fake"], "test.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);
    const request = new Request("http://localhost/api/process-image", {
      method: "POST",
      body: formData,
    });
    const response = await POST(request);
    const body = await response.json();
    expect(body.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("processes a real PNG with removeBackground=true", async () => {
    const png = makeMinimalPng();
    const response = await POST(
      makeFormDataRequest(png, { removeBackground: true })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(true);
    expect(body.backgroundRemoved).toBe(true);
    expect(body.dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("processes a real PNG with enhanceImage=true", async () => {
    const png = makeMinimalPng();
    const response = await POST(
      makeFormDataRequest(png, { enhanceImage: true })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(true);
    expect(body.enhanced).toBe(true);
    expect(body.dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("processes with both removeBackground and enhanceImage set", async () => {
    const png = makeMinimalPng();
    const response = await POST(
      makeFormDataRequest(png, { removeBackground: true, enhanceImage: true })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(true);
    expect(body.backgroundRemoved).toBe(true);
    expect(body.enhanced).toBe(true);
  });

  it("returns 500 when sharp cannot process an invalid image buffer", async () => {
    // Pass invalid binary that sharp cannot decode
    const response = await POST(
      makeFormDataRequest("this is not a valid image file at all %%%", {
        removeBackground: true,
      })
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Image processing failed.");
  });
});
