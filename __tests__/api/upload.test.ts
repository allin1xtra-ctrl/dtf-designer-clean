import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { POST } from "../../app/api/upload/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

vi.mock("cloudinary", () => {
  const upload_stream = vi.fn((options: unknown, callback: (err: unknown, result: unknown) => void) => {
    const mockResult = {
      secure_url: "https://res.cloudinary.com/demo/image/upload/test.png",
      public_id: "test/image",
    };
    callback(null, mockResult);
    return { end: vi.fn() };
  });

  return {
    v2: {
      config: vi.fn(),
      uploader: { upload_stream },
    },
  };
});

function makeFormDataRequest(fileContent = "fake image data", fileName = "test.png", mimeType = "image/png") {
  const file = new File([fileContent], fileName, { type: mimeType });
  const formData = new FormData();
  formData.append("file", file);
  return new Request("http://localhost/api/upload", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/upload", () => {
  it("returns 503 when Cloudinary env vars are not set", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "");
    vi.stubEnv("CLOUDINARY_API_KEY", "");
    vi.stubEnv("CLOUDINARY_API_SECRET", "");
    const response = await POST(makeFormDataRequest());
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toMatch(/cloudinary/i);
  });

  it("returns 503 when only CLOUD_NAME is missing", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "");
    vi.stubEnv("CLOUDINARY_API_KEY", "testkey");
    vi.stubEnv("CLOUDINARY_API_SECRET", "testsecret");
    const response = await POST(makeFormDataRequest());
    expect(response.status).toBe(503);
  });

  it("returns 400 when no file is uploaded", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "testcloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "testkey");
    vi.stubEnv("CLOUDINARY_API_SECRET", "testsecret");
    const formData = new FormData();
    const request = new Request("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/no file/i);
  });

  it("returns 200 with Cloudinary URL on success", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "testcloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "testkey");
    vi.stubEnv("CLOUDINARY_API_SECRET", "testsecret");
    const response = await POST(makeFormDataRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.url).toBe("https://res.cloudinary.com/demo/image/upload/test.png");
    expect(body.publicId).toBe("test/image");
    expect(body.storage).toBe("cloudinary");
  });

  it("returns 502 when Cloudinary returns a non-cloudinary URL", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "testcloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "testkey");
    vi.stubEnv("CLOUDINARY_API_SECRET", "testsecret");

    const { v2: cloudinary } = await import("cloudinary");
    vi.mocked(cloudinary.uploader.upload_stream).mockImplementationOnce(
      (_opts: unknown, cb: (err: unknown, result: unknown) => void) => {
        cb(null, { secure_url: "https://evil.example.com/image.png", public_id: "x" });
        return { end: vi.fn() };
      }
    );

    const response = await POST(makeFormDataRequest());
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toMatch(/unexpected url/i);
  });

  it("returns 502 when Cloudinary returns no URL", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "testcloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "testkey");
    vi.stubEnv("CLOUDINARY_API_SECRET", "testsecret");

    const { v2: cloudinary } = await import("cloudinary");
    vi.mocked(cloudinary.uploader.upload_stream).mockImplementationOnce(
      (_opts: unknown, cb: (err: unknown, result: unknown) => void) => {
        cb(null, { secure_url: "", public_id: "x" });
        return { end: vi.fn() };
      }
    );

    const response = await POST(makeFormDataRequest());
    expect(response.status).toBe(502);
  });

  it("returns 500 when Cloudinary upload throws an error", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "testcloud");
    vi.stubEnv("CLOUDINARY_API_KEY", "testkey");
    vi.stubEnv("CLOUDINARY_API_SECRET", "testsecret");

    const { v2: cloudinary } = await import("cloudinary");
    vi.mocked(cloudinary.uploader.upload_stream).mockImplementationOnce(
      (_opts: unknown, cb: (err: unknown, result: unknown) => void) => {
        cb(new Error("Network error"), undefined);
        return { end: vi.fn() };
      }
    );

    const response = await POST(makeFormDataRequest());
    expect(response.status).toBe(500);
  });
});
