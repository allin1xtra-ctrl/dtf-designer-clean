export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file uploaded." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const mimeType = file.type || "image/png";
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return Response.json({
      ok: true,
      url: `data:${mimeType};base64,${base64}`,
      publicId: `inline-${Date.now()}`,
      storage: "vercel-inline-fallback",
    });
  } catch (error) {
    console.error("Upload route failed:", error);
    return Response.json({ error: "Upload failed." }, { status: 500 });
  }
}
