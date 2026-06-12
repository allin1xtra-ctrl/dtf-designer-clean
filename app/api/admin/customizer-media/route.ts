import { NextRequest, NextResponse } from "next/server";

import { ADMIN_NO_STORE_HEADERS, verifyAdminApiRequest } from "@/lib/admin-customizer/session";
import { addMediaAsset, readAdminCustomizerStore } from "@/lib/admin-customizer/store";
import type { AdminMediaAsset } from "@/lib/admin-customizer/types";
import {
  createStagingUploadedAsset,
  uploadCustomizerAssetToCloudinary,
  validateCustomizerUploadFile,
} from "@/lib/storage/customizer-assets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authError = verifyAdminApiRequest(req);
  if (authError) return authError;
  const store = await readAdminCustomizerStore();
  return NextResponse.json({ mediaAssets: store.mediaAssets }, { headers: ADMIN_NO_STORE_HEADERS });
}

export async function POST(req: NextRequest) {
  const authError = verifyAdminApiRequest(req);
  if (authError) return authError;
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json({ errors: ["Expected multipart/form-data request."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
  }
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  const validation = validateCustomizerUploadFile(file instanceof File ? file : null, {
    allowedExtensions: ["png", "jpg", "jpeg", "webp"],
    allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
  });
  if (!validation.ok || !(file instanceof File)) {
    return NextResponse.json({ errors: validation.errors, warnings: validation.warnings }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
  }

  const storageResult = await uploadCustomizerAssetToCloudinary(file, "mockup_image");
  const stagingAsset = createStagingUploadedAsset(
    file,
    "mockup_image",
    storageResult.url
      ? { url: storageResult.url, publicId: storageResult.publicId, storage: storageResult.storage }
      : {}
  );
  const mediaAsset: AdminMediaAsset = {
    id: stagingAsset.id,
    fileName: stagingAsset.filename,
    url: stagingAsset.url,
    type: stagingAsset.contentType,
    uploadedBy: "admin",
    storage: stagingAsset.storage || (stagingAsset.url ? "cloudinary" : "metadata_only"),
    publicId: stagingAsset.publicId,
    createdAt: new Date().toISOString(),
  };
  await addMediaAsset(mediaAsset);

  return NextResponse.json(
    {
      mediaAsset,
      warnings: [
        ...validation.warnings,
        ...storageResult.warnings,
        mediaAsset.url
          ? "Admin media uploaded to staging storage. Shopify and checkout were not changed."
          : "Admin media metadata saved. Configure Cloudinary env vars for persistent hosted URLs.",
      ],
    },
    { headers: ADMIN_NO_STORE_HEADERS }
  );
}
