import { NextRequest, NextResponse } from "next/server";

import {
  createStagingUploadedAsset,
  isUploadPurpose,
  uploadCustomizerAssetToCloudinary,
  validateCustomizerUploadFile,
  validateUploadPurpose,
} from "@/lib/storage/customizer-assets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STAGING_UPLOAD_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      {
        ok: false,
        errors: ["Expected multipart/form-data request."],
        warnings: [],
      },
      { status: 400, headers: STAGING_UPLOAD_HEADERS }
    );
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      {
        ok: false,
        errors: ["Invalid multipart/form-data body."],
        warnings: [],
      },
      { status: 400, headers: STAGING_UPLOAD_HEADERS }
    );
  }

  const fileField = formData.get("file");
  const purposeField = formData.get("purpose");
  const purposeValidation = validateUploadPurpose(purposeField);
  const file = fileField instanceof File ? fileField : null;
  const fileValidation = validateCustomizerUploadFile(file);

  const errors = [...purposeValidation.errors, ...fileValidation.errors];
  const warnings = [...purposeValidation.warnings, ...fileValidation.warnings];

  if (errors.length > 0 || !file || !isUploadPurpose(purposeField)) {
    return NextResponse.json(
      {
        ok: false,
        errors,
        warnings,
      },
      { status: 400, headers: STAGING_UPLOAD_HEADERS }
    );
  }

  try {
    const storageResult = await uploadCustomizerAssetToCloudinary(file, purposeField);
    const asset = createStagingUploadedAsset(
      file,
      purposeField,
      storageResult.url
        ? {
            url: storageResult.url,
            publicId: storageResult.publicId,
            storage: storageResult.storage,
          }
        : {}
    );

    return NextResponse.json(
      {
        ok: true,
        errors: [],
        warnings: storageResult.url
          ? [
              ...warnings,
              ...storageResult.warnings,
              "Staging upload created a hosted asset URL. Shopify was not changed and checkout was not connected.",
            ]
          : [
              ...warnings,
              ...storageResult.warnings,
              "Staging upload accepted for validation only. No hosted URL was created, Shopify was not changed, and checkout was not connected.",
            ],
        asset,
      },
      { headers: STAGING_UPLOAD_HEADERS }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errors: [error instanceof Error ? error.message : "Cloudinary staging upload failed."],
        warnings: [
          ...warnings,
          "Local canvas preview should remain active. No production upload route, Shopify save, or checkout connection was used.",
        ],
      },
      { status: 502, headers: STAGING_UPLOAD_HEADERS }
    );
  }
}
