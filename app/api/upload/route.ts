import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

const CLOUDINARY_URL_PREFIX = "https://res.cloudinary.com/";

export async function POST(request: Request) {
  try {
    const cloudName = (
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    )?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      return Response.json(
        {
          error:
            "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME), CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
        },
        { status: 503 }
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file uploaded." }, { status: 400 });
    }

    const folder = process.env.CLOUDINARY_FOLDER?.trim();
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { ...(folder && { folder }), resource_type: "image" },
          (error, result) => {
            if (error || !result) {
              reject(error ?? new Error("Cloudinary upload returned no result."));
            } else {
              resolve(result);
            }
          }
        );
        stream.end(buffer);
      }
    );

    const secureUrl = uploadResult.secure_url?.trim();

    if (typeof secureUrl !== "string" || !secureUrl) {
      return Response.json(
        { error: "Cloudinary did not return a hosted URL." },
        { status: 502 }
      );
    }

    if (!secureUrl.startsWith(CLOUDINARY_URL_PREFIX)) {
      return Response.json(
        { error: "Cloudinary returned an unexpected URL format." },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      url: secureUrl,
      publicId: uploadResult.public_id,
      storage: "cloudinary",
    });
  } catch (error) {
    console.error("Upload route failed:", error);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
