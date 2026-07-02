import { NextRequest, NextResponse } from "next/server";

import { ADMIN_NO_STORE_HEADERS, verifyAdminApiRequest } from "@/lib/admin-customizer/session";
import {
  addGhostMannequinAsset,
  addMediaAsset,
  readAdminCustomizerStore,
  updateGhostMannequinAsset,
} from "@/lib/admin-customizer/store";
import type { AdminMediaAsset, GhostMannequinAngle, GhostMannequinAsset } from "@/lib/admin-customizer/types";
import {
  DEFAULT_GHOST_MANNEQUIN_PROMPT,
  GHOST_MANNEQUIN_ANGLES,
  PHOTOROOM_ALLOWED_CONTENT_TYPES,
  PHOTOROOM_ALLOWED_EXTENSIONS,
  PHOTOROOM_MAX_IMAGE_BYTES,
  generateGhostMannequinImage,
} from "@/lib/photoroom";
import {
  createStagingUploadedAsset,
  sanitizeAssetFilename,
  uploadCustomizerAssetToCloudinary,
  validateCustomizerUploadFile,
} from "@/lib/storage/customizer-assets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GenerationMode = "single" | "angle-set" | "ai-360-beta";

const ANGLES = GHOST_MANNEQUIN_ANGLES.map((item) => item.angle);

function now() {
  return new Date().toISOString();
}

function cleanEnv(value: unknown) {
  return String(value || "").trim();
}

function cleanDomain(value: unknown) {
  return cleanEnv(value).replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function normalizeProductId(productId: string) {
  const trimmed = productId.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("gid://shopify/Product/")) return trimmed;
  if (/^\d+$/.test(trimmed)) return `gid://shopify/Product/${trimmed}`;
  return trimmed;
}

function getAdminConfig() {
  return {
    storeDomain: cleanDomain(process.env.SHOPIFY_STORE_DOMAIN),
    apiVersion: cleanEnv(process.env.SHOPIFY_ADMIN_API_VERSION) || "2024-10",
    adminAccessToken: cleanEnv(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN),
  };
}

async function uploadGeneratedBuffer(buffer: Buffer, contentType: string, filename: string) {
  const generatedFile = new File([new Uint8Array(buffer)], filename, { type: contentType });
  return uploadCustomizerAssetToCloudinary(generatedFile, "mockup_image");
}

async function storeOriginalFile(file: File, sourceType: "upload" | "url") {
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
    uploadedBy: `admin_ghost_mannequin_${sourceType}`,
    storage: stagingAsset.storage || (stagingAsset.url ? "cloudinary" : "metadata_only"),
    publicId: stagingAsset.publicId,
    createdAt: now(),
  };
  await addMediaAsset(mediaAsset);
  return mediaAsset;
}

async function fileFromImageUrl(imageUrl: string) {
  const response = await fetch(imageUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Source image URL could not be fetched (${response.status}).`);
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = sanitizeAssetFilename(new URL(imageUrl).pathname.split("/").pop() || "source-product-image.jpg");
  return new File([new Uint8Array(buffer)], filename, { type: contentType });
}

function validateImageFile(file: File | null) {
  return validateCustomizerUploadFile(file, {
    maxSizeBytes: PHOTOROOM_MAX_IMAGE_BYTES,
    allowedExtensions: PHOTOROOM_ALLOWED_EXTENSIONS,
    allowedContentTypes: PHOTOROOM_ALLOWED_CONTENT_TYPES,
  });
}

function buildPrompt(basePrompt: string, anglePrompt?: string) {
  if (!anglePrompt) return basePrompt;
  return `${basePrompt} Angle requirement: ${anglePrompt}. Preserve the exact logos, print placement, fabric texture, stitching, label details, garment color, proportions, and silhouette.`;
}

async function generateOne({
  file,
  imageUrl,
  sourceType,
  productId,
  productHandle,
  prompt,
  mode,
  angle,
  outputSize,
  size,
}: {
  file?: File;
  imageUrl?: string;
  sourceType: "upload" | "url";
  productId?: string;
  productHandle?: string;
  prompt: string;
  mode: GenerationMode;
  angle?: GhostMannequinAngle;
  outputSize?: string;
  size?: string;
}) {
  const sourceFile = file || (imageUrl ? await fileFromImageUrl(imageUrl) : null);
  const validation = validateImageFile(sourceFile);
  if (!validation.ok || !sourceFile) {
    return {
      errors: validation.errors,
      warnings: validation.warnings,
      asset: null,
    };
  }

  const originalAsset = await storeOriginalFile(sourceFile, sourceType);
  const generated = await generateGhostMannequinImage({
    imageFile: sourceFile,
    prompt,
    outputSize,
    size,
    format: "png",
  });
  const generatedFilename = `${sourceFile.name.replace(/\.[^.]+$/, "")}-ghost${angle ? `-${angle}` : ""}.png`;
  const generatedStorage = await uploadGeneratedBuffer(generated.buffer, generated.contentType, generatedFilename);
  const generatedMediaAsset: AdminMediaAsset = {
    id: `ghost_generated_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    fileName: sanitizeAssetFilename(generatedFilename),
    url: generatedStorage.url,
    type: generated.contentType,
    uploadedBy: "admin_ghost_mannequin_generated",
    storage: generatedStorage.storage || (generatedStorage.url ? "cloudinary" : "metadata_only"),
    publicId: generatedStorage.publicId,
    createdAt: now(),
  };
  await addMediaAsset(generatedMediaAsset);

  const timestamp = now();
  const asset: GhostMannequinAsset = {
    id: `ghost_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    productId: normalizeProductId(productId || "") || undefined,
    productHandle: productHandle || undefined,
    sourceType,
    sourceFileName: sourceFile.name,
    sourceImageUrl: imageUrl,
    originalAssetUrl: originalAsset.url,
    generatedImageUrl: generatedMediaAsset.url,
    generatedPublicId: generatedMediaAsset.publicId,
    generatedContentType: generated.contentType,
    prompt,
    mode,
    angle,
    frameUrls: generatedMediaAsset.url ? [generatedMediaAsset.url] : [],
    status: generatedMediaAsset.url ? "generated" : "failed",
    reviewRequired: true,
    errors: generatedMediaAsset.url ? [] : ["Generated image was processed but no hosted URL is available. Configure Cloudinary before publishing."],
    warnings: [
      ...validation.warnings,
      ...generatedStorage.warnings,
      "Review required before replacing originals or adding to Shopify product media.",
      mode === "ai-360-beta" ? "AI-generated 360 beta can change product details. Approve each frame manually." : "",
    ].filter(Boolean),
    photoroomRequestId: generated.metadata.requestId,
    processingTimeMs: generated.metadata.processingTimeMs,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await addGhostMannequinAsset(asset);

  console.info("ghost-mannequin-generation", {
    productId: asset.productId || null,
    originalFileName: asset.sourceFileName || null,
    generatedAssetUrl: asset.generatedImageUrl || null,
    photoroomRequestId: asset.photoroomRequestId || null,
    processingTimeMs: asset.processingTimeMs || null,
    status: asset.status,
    reviewRequired: asset.reviewRequired,
  });

  return { errors: [], warnings: asset.warnings, asset };
}

async function addGeneratedImageToShopifyProduct(asset: GhostMannequinAsset, productIdOverride?: string) {
  const { storeDomain, apiVersion, adminAccessToken } = getAdminConfig();
  const productId = normalizeProductId(productIdOverride || asset.productId || "");
  if (!storeDomain || !adminAccessToken) {
    throw new Error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN.");
  }
  if (!productId) throw new Error("Missing Shopify product ID.");
  if (!asset.generatedImageUrl || !asset.generatedImageUrl.startsWith("https://")) {
    throw new Error("Generated image needs a public HTTPS URL before it can be added to Shopify media.");
  }

  const mediaQuery = `
    mutation AddGhostMannequinMedia($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media {
          ... on MediaImage {
            id
            image {
              url
            }
          }
        }
        mediaUserErrors {
          field
          message
        }
      }
    }
  `;

  const response = await fetch(`https://${storeDomain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminAccessToken,
    },
    body: JSON.stringify({
      query: mediaQuery,
      variables: {
        productId,
        media: [
          {
            originalSource: asset.generatedImageUrl,
            alt: "Approved ghost mannequin product image",
            mediaContentType: "IMAGE",
          },
        ],
      },
    }),
  });

  const json = await response.json().catch(() => ({}));
  const userErrors = json?.data?.productCreateMedia?.mediaUserErrors || [];
  if (!response.ok || json.errors?.length || userErrors.length) {
    throw new Error(json.errors?.[0]?.message || userErrors?.[0]?.message || "Shopify media upload failed.");
  }

  const metafieldWarnings = await saveGhostMannequinMetafields({
    storeDomain,
    apiVersion,
    adminAccessToken,
    productId,
    asset,
  });

  return {
    media: json.data.productCreateMedia.media,
    metafieldWarnings,
  };
}

async function saveGhostMannequinMetafields({
  storeDomain,
  apiVersion,
  adminAccessToken,
  productId,
  asset,
}: {
  storeDomain: string;
  apiVersion: string;
  adminAccessToken: string;
  productId: string;
  asset: GhostMannequinAsset;
}) {
  const metafields = [
    asset.generatedImageUrl
      ? {
          ownerId: productId,
          namespace: "custom",
          key: "ghost_mannequin_image",
          type: "url",
          value: asset.generatedImageUrl,
        }
      : null,
    asset.originalAssetUrl || asset.sourceImageUrl
      ? {
          ownerId: productId,
          namespace: "custom",
          key: "ghost_mannequin_source_image",
          type: "url",
          value: asset.originalAssetUrl || asset.sourceImageUrl,
        }
      : null,
    {
      ownerId: productId,
      namespace: "custom",
      key: "ghost_mannequin_360_frames",
      type: "json",
      value: JSON.stringify(asset.frameUrls || []),
    },
    {
      ownerId: productId,
      namespace: "custom",
      key: "ghost_mannequin_status",
      type: "single_line_text_field",
      value: "added_to_product",
    },
    {
      ownerId: productId,
      namespace: "custom",
      key: "ghost_mannequin_review_required",
      type: "boolean",
      value: "false",
    },
  ].filter(Boolean);

  const query = `
    mutation SaveGhostMannequinMetafields($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://${storeDomain}/admin/api/${apiVersion}/graphql.json`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminAccessToken,
      },
      body: JSON.stringify({
        query,
        variables: { metafields },
      }),
    });
    const json = await response.json().catch(() => ({}));
    const userErrors = json?.data?.metafieldsSet?.userErrors || [];
    if (!response.ok || json.errors?.length || userErrors.length) {
      return [json.errors?.[0]?.message || userErrors?.[0]?.message || "Ghost mannequin metafields were not saved."];
    }
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : "Ghost mannequin metafields were not saved."];
  }
}

export async function GET(req: NextRequest) {
  const authError = verifyAdminApiRequest(req);
  if (authError) return authError;
  const store = await readAdminCustomizerStore();
  const productId = req.nextUrl.searchParams.get("productId") || "";
  const adminConfig = getAdminConfig();
  const assets = productId
    ? store.ghostMannequinAssets.filter((asset) => asset.productId === normalizeProductId(productId) || asset.productId === productId)
    : store.ghostMannequinAssets;
  return NextResponse.json(
    {
      assets,
      photoroom: {
        enabled: cleanEnv(process.env.PHOTOROOM_ENABLED).toLowerCase() === "true",
        configured: Boolean(cleanEnv(process.env.PHOTOROOM_API_KEY)),
        sandbox: ["true", "success", "fail"].includes(cleanEnv(process.env.PHOTOROOM_SANDBOX).toLowerCase()),
        sandboxMode: cleanEnv(process.env.PHOTOROOM_SANDBOX).toLowerCase(),
        maxImageBytes: PHOTOROOM_MAX_IMAGE_BYTES,
      },
      shopify: {
        configured: Boolean(adminConfig.storeDomain && adminConfig.adminAccessToken),
        storeDomainConfigured: Boolean(adminConfig.storeDomain),
        adminAccessTokenConfigured: Boolean(adminConfig.adminAccessToken),
        apiVersion: adminConfig.apiVersion,
      },
    },
    { headers: ADMIN_NO_STORE_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  const authError = verifyAdminApiRequest(req);
  if (authError) return authError;
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json({ errors: ["Expected multipart/form-data request."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ errors: ["Invalid multipart form data."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
  }

  const mode = String(formData.get("mode") || "single") as GenerationMode;
  const prompt = String(formData.get("prompt") || DEFAULT_GHOST_MANNEQUIN_PROMPT);
  const productId = String(formData.get("productId") || "");
  const productHandle = String(formData.get("productHandle") || "");
  const imageUrl = String(formData.get("imageUrl") || "").trim();
  const outputSize = String(formData.get("outputSize") || "").trim() || undefined;
  const size = String(formData.get("size") || "").trim() || undefined;

  if (!["single", "angle-set", "ai-360-beta"].includes(mode)) {
    return NextResponse.json({ errors: ["Invalid mode. Use single, angle-set, or ai-360-beta."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
  }

  try {
    if (mode === "angle-set") {
      const results = [];
      for (const angle of ANGLES) {
        const file = formData.get(`angle_${angle}`);
        if (!(file instanceof File) || file.size === 0) continue;
        results.push(await generateOne({
          file,
          sourceType: "upload",
          productId,
          productHandle,
          prompt: buildPrompt(prompt, `${angle} real uploaded angle`),
          mode,
          angle,
          outputSize,
          size,
        }));
      }
      if (!results.length) {
        return NextResponse.json({ errors: ["Upload at least one angle file."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
      }
      return NextResponse.json({ status: "review_required", assets: results.map((result) => result.asset).filter(Boolean) }, { headers: ADMIN_NO_STORE_HEADERS });
    }

    const file = formData.get("file");
    const sourceFile = file instanceof File && file.size > 0 ? file : undefined;
    if (!sourceFile && !imageUrl) {
      return NextResponse.json({ errors: ["Upload a file or provide an image URL."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
    }

    if (mode === "ai-360-beta") {
      const results = [];
      for (const angleInfo of GHOST_MANNEQUIN_ANGLES) {
        results.push(await generateOne({
          file: sourceFile,
          imageUrl,
          sourceType: sourceFile ? "upload" : "url",
          productId,
          productHandle,
          prompt: buildPrompt(prompt, angleInfo.prompt),
          mode,
          angle: angleInfo.angle,
          outputSize,
          size,
        }));
      }
      return NextResponse.json({ status: "review_required", beta: true, assets: results.map((result) => result.asset).filter(Boolean) }, { headers: ADMIN_NO_STORE_HEADERS });
    }

    const result = await generateOne({
      file: sourceFile,
      imageUrl,
      sourceType: sourceFile ? "upload" : "url",
      productId,
      productHandle,
      prompt,
      mode,
      outputSize,
      size,
    });

    if (result.errors.length || !result.asset) {
      return NextResponse.json({ errors: result.errors, warnings: result.warnings }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
    }

    return NextResponse.json(
      {
        status: "review_required",
        originalImageUrl: result.asset.originalAssetUrl,
        generatedImageUrl: result.asset.generatedImageUrl,
        asset: result.asset,
        warnings: result.warnings,
      },
      { headers: ADMIN_NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("ghost-mannequin-generation-failed", {
      productId: normalizeProductId(productId) || null,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { errors: [error instanceof Error ? error.message : "Ghost mannequin generation failed."] },
      { status: 500, headers: ADMIN_NO_STORE_HEADERS }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const authError = verifyAdminApiRequest(req);
  if (authError) return authError;
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const action = String(body.action || "");

  if (!id) {
    return NextResponse.json({ errors: ["Missing ghost mannequin asset ID."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
  }

  const store = await readAdminCustomizerStore();
  const existing = store.ghostMannequinAssets.find((asset) => asset.id === id);
  if (!existing) {
    return NextResponse.json({ errors: ["Ghost mannequin asset not found."] }, { status: 404, headers: ADMIN_NO_STORE_HEADERS });
  }

  try {
    if (action === "approve") {
      const result = await updateGhostMannequinAsset(id, { status: "approved", approvedAt: now(), reviewRequired: false });
      return NextResponse.json({ asset: result.value, errors: result.errors }, { headers: ADMIN_NO_STORE_HEADERS });
    }

    if (action === "reject") {
      const result = await updateGhostMannequinAsset(id, { status: "rejected", reviewRequired: true });
      return NextResponse.json({ asset: result.value, errors: result.errors }, { headers: ADMIN_NO_STORE_HEADERS });
    }

    if (action === "add-to-product-gallery") {
      if (existing.status !== "approved") {
        return NextResponse.json({ errors: ["Approve the generated image before adding it to Shopify product media."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
      }
      const targetProductId = normalizeProductId(String(body.productId || existing.productId || ""));
      if (!targetProductId) {
        return NextResponse.json({ errors: ["Missing Shopify product ID."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
      }
      const mediaResult = await addGeneratedImageToShopifyProduct(existing, targetProductId);
      const result = await updateGhostMannequinAsset(id, { status: "added_to_product", addedToProductAt: now(), reviewRequired: false });
      return NextResponse.json(
        {
          asset: result.value,
          media: mediaResult.media,
          metafieldWarnings: mediaResult.metafieldWarnings,
          errors: result.errors,
        },
        { headers: ADMIN_NO_STORE_HEADERS }
      );
    }

    return NextResponse.json({ errors: ["Unknown action."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { errors: [error instanceof Error ? error.message : "Ghost mannequin review action failed."] },
      { status: 500, headers: ADMIN_NO_STORE_HEADERS }
    );
  }
}
