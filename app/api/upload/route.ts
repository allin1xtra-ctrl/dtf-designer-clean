export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();
    const folder = process.env.CLOUDINARY_FOLDER?.trim();

    if (!(file instanceof File)) {
      return Response.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!cloudName || !uploadPreset) {
      return Response.json(
        { error: "Cloudinary upload is not configured." },
        { status: 503 }
      );
    }

    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append("file", file);
    cloudinaryFormData.append("upload_preset", uploadPreset);

    if (folder) {
      cloudinaryFormData.append("folder", folder);
    }

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: cloudinaryFormData,
      }
    );
    const uploadResult = await uploadResponse.json();

    if (
      !uploadResponse.ok ||
      typeof uploadResult?.secure_url !== "string" ||
      !uploadResult.secure_url.trim()
    ) {
      return Response.json(
        {
          error: uploadResult?.error?.message || "Cloudinary upload failed.",
        },
        { status: 502 }
      );
    }

    return Response.json({
      ok: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      storage: "cloudinary",
    });
  } catch (error) {
    console.error("Upload route failed:", error);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
