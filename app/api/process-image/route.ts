import sharp from "sharp";

export const runtime = "nodejs";

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function sampleAverageBackground(pixels: Uint8ClampedArray, width: number, height: number) {
  const samplePoints = [
    [0, 0],
    [Math.max(0, width - 1), 0],
    [0, Math.max(0, height - 1)],
    [Math.max(0, width - 1), Math.max(0, height - 1)],
    [Math.floor(width * 0.5), 0],
    [Math.floor(width * 0.5), Math.max(0, height - 1)],
    [0, Math.floor(height * 0.5)],
    [Math.max(0, width - 1), Math.floor(height * 0.5)],
  ];

  const totals = samplePoints.reduce(
    (acc, [x, y]) => {
      const index = (y * width + x) * 4;
      acc.r += pixels[index] ?? 0;
      acc.g += pixels[index + 1] ?? 0;
      acc.b += pixels[index + 2] ?? 0;
      return acc;
    },
    { r: 0, g: 0, b: 0 }
  );

  return {
    r: totals.r / samplePoints.length,
    g: totals.g / samplePoints.length,
    b: totals.b / samplePoints.length,
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const removeBackground = String(formData.get("removeBackground") ?? "false") === "true";
    const enhanceImage = String(formData.get("enhanceImage") ?? "false") === "true";

    if (!(file instanceof File)) {
      return Response.json({ error: "No file uploaded." }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    if (!removeBackground && !enhanceImage) {
      return Response.json({
        processed: true,
        dataUrl: `data:${file.type || "image/png"};base64,${inputBuffer.toString("base64")}`,
        note: "No processing requested.",
      });
    }

    const baseImage = sharp(inputBuffer, { animated: false }).rotate().ensureAlpha();
    const { data, info } = await baseImage.raw().toBuffer({ resolveWithObject: true });
    const pixels = new Uint8ClampedArray(data);

    if (removeBackground) {
      const background = sampleAverageBackground(pixels, info.width, info.height);

      for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index] ?? 0;
        const green = pixels[index + 1] ?? 0;
        const blue = pixels[index + 2] ?? 0;
        const alpha = pixels[index + 3] ?? 255;

        if (alpha === 0) continue;

        const distance = colorDistance(red, green, blue, background.r, background.g, background.b);
        const nearWhite = red > 245 && green > 245 && blue > 245;

        if (nearWhite || distance < 38) {
          pixels[index + 3] = 0;
          continue;
        }

        if (distance < 64) {
          const fade = (distance - 38) / 26;
          pixels[index + 3] = clampByte(alpha * fade);
        }
      }
    }

    let output = sharp(Buffer.from(pixels), {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
    });

    if (enhanceImage) {
      output = output.modulate({ brightness: 1.03, saturation: 1.08 }).sharpen();
    }

    const outputBuffer = await output.png().toBuffer();

    return Response.json({
      processed: true,
      backgroundRemoved: removeBackground,
      enhanced: enhanceImage,
      dataUrl: `data:image/png;base64,${outputBuffer.toString("base64")}`,
      note: removeBackground ? "Background cleanup applied." : "Image enhanced.",
    });
  } catch (error) {
    console.error("Process-image route failed:", error);
    return Response.json({ error: "Image processing failed." }, { status: 500 });
  }
}
