import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { ADMIN_NO_STORE_HEADERS, verifyAdminApiRequest } from "@/lib/admin-customizer/session";
import {
  addCustomGhost360FrameSet,
  addMediaAsset,
  readAdminCustomizerStore,
  updateCustomGhost360FrameSet,
} from "@/lib/admin-customizer/store";
import type { AdminMediaAsset, CustomGhost360EffectStyle, CustomGhost360Frame, CustomGhost360FrameSet } from "@/lib/admin-customizer/types";
import {
  createStagingUploadedAsset,
  sanitizeAssetFilename,
  uploadCustomizerAssetToCloudinary,
  validateCustomizerUploadFile,
} from "@/lib/storage/customizer-assets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GHOST_360_MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const GHOST_360_ALLOWED_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"];
const GHOST_360_ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
const SUPPORTED_FRAME_COUNTS = [1, 2, 4, 8, 12, 16, 24, 36] as const;
const BASE_FRAME_LABELS = [
  "Front",
  "Front angled",
  "Side",
  "Back angled",
  "Back",
  "Back angled opposite",
  "Side opposite",
  "Front angled opposite",
];
const EFFECT_STYLES: CustomGhost360EffectStyle[] = ["studio", "ghost-fade", "floor-shadow", "reflection"];

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

function normalizeEffectStyle(value: unknown): CustomGhost360EffectStyle {
  return EFFECT_STYLES.includes(value as CustomGhost360EffectStyle) ? value as CustomGhost360EffectStyle : "studio";
}

function normalizeFrameCount(value: unknown) {
  const requested = Number(value);
  return SUPPORTED_FRAME_COUNTS.includes(requested as (typeof SUPPORTED_FRAME_COUNTS)[number]) ? requested : 8;
}

function frameLabel(index: number, frameCount: number) {
  if (frameCount === 1) return "Front";
  if (frameCount === 2) return index === 0 ? "Front" : "Back";
  if (frameCount === 4) return ["Front", "Side", "Back", "Side opposite"][index] || `Frame ${index + 1}`;
  if (frameCount === 8) return BASE_FRAME_LABELS[index] || `Frame ${index + 1}`;
  const degrees = Math.round((index / frameCount) * 360);
  return BASE_FRAME_LABELS[index] || `Frame ${index + 1} (${degrees} deg)`;
}

function sortFrames(frames: CustomGhost360Frame[]) {
  return [...frames]
    .sort((left, right) => left.order - right.order)
    .map((frame, index) => ({ ...frame, order: index }));
}

function warningsForFrames(frames: CustomGhost360Frame[], frameCount: number, existingWarnings: string[] = []) {
  const warnings = [...existingWarnings];
  const sortedFrames = sortFrames(frames);
  const dimensions = new Set(sortedFrames.map((frame) => `${frame.width || 0}x${frame.height || 0}`).filter((value) => value !== "0x0"));
  if (dimensions.size > 1) {
    warnings.push("Frames have different pixel dimensions. Use matching image sizes for the smoothest rotation.");
  }
  if (sortedFrames.length < frameCount) {
    warnings.push(`Frame order is incomplete: ${sortedFrames.length} of ${frameCount} slots are filled.`);
  }
  return [...new Set(warnings)];
}

async function readImageDimensions(file: File) {
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(input).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
    };
  } catch {
    return {};
  }
}

async function storeUploadedFrame(file: File, label: string, order: number) {
  const validation = validateCustomizerUploadFile(file, {
    maxSizeBytes: GHOST_360_MAX_IMAGE_BYTES,
    allowedExtensions: GHOST_360_ALLOWED_EXTENSIONS,
    allowedContentTypes: GHOST_360_ALLOWED_CONTENT_TYPES,
  });
  if (!validation.ok) return { errors: validation.errors, warnings: validation.warnings, frame: null };

  const dimensions = await readImageDimensions(file);
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
    uploadedBy: "admin_custom_ghost_360",
    storage: stagingAsset.storage || (stagingAsset.url ? "cloudinary" : "metadata_only"),
    publicId: stagingAsset.publicId,
    createdAt: now(),
  };
  await addMediaAsset(mediaAsset);

  const frame: CustomGhost360Frame = {
    id: `ghost360_frame_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    label,
    imageUrl: mediaAsset.url || "",
    fileName: sanitizeAssetFilename(file.name || `frame-${order + 1}.png`),
    mediaAssetId: mediaAsset.id,
    order,
    width: dimensions.width,
    height: dimensions.height,
  };

  return {
    errors: frame.imageUrl ? [] : ["Frame was uploaded but no hosted URL is available. Configure Cloudinary before production use."],
    warnings: [...validation.warnings, ...storageResult.warnings],
    frame,
  };
}

function configuredStatus() {
  const adminConfig = getAdminConfig();
  return {
    shopify: {
      configured: Boolean(adminConfig.storeDomain && adminConfig.adminAccessToken),
      storeDomainConfigured: Boolean(adminConfig.storeDomain),
      adminAccessTokenConfigured: Boolean(adminConfig.adminAccessToken),
      apiVersion: adminConfig.apiVersion,
    },
    storage: {
      productionPublicUrlsRequired: true,
    },
  };
}

async function syncGhost360Metafields(frameSet: CustomGhost360FrameSet, productIdOverride?: string) {
  const { storeDomain, apiVersion, adminAccessToken } = getAdminConfig();
  const productId = normalizeProductId(productIdOverride || frameSet.productId || "");
  if (!storeDomain || !adminAccessToken) throw new Error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN.");
  if (!productId) throw new Error("Missing Shopify product ID.");

  const frameUrls = sortFrames(frameSet.frames).map((frame) => frame.imageUrl).filter(Boolean);
  if (!frameUrls.length) throw new Error("Add at least one frame before syncing Shopify metafields.");
  if (frameUrls.some((url) => !url.startsWith("https://"))) {
    throw new Error("Ghost 360 frames need public HTTPS URLs before Shopify metafields can be synced.");
  }

  const metafields = [
    {
      ownerId: productId,
      namespace: "custom",
      key: "ghost_360_frames",
      type: "json",
      value: JSON.stringify(frameUrls),
    },
    {
      ownerId: productId,
      namespace: "custom",
      key: "ghost_360_enabled",
      type: "boolean",
      value: frameSet.enabled ? "true" : "false",
    },
    {
      ownerId: productId,
      namespace: "custom",
      key: "ghost_360_fallback_image",
      type: "url",
      value: frameSet.fallbackImageUrl || frameUrls[0],
    },
    {
      ownerId: productId,
      namespace: "custom",
      key: "ghost_360_effect_style",
      type: "single_line_text_field",
      value: frameSet.effectStyle,
    },
  ];

  const query = `
    mutation SaveCustomGhost360Metafields($metafields: [MetafieldsSetInput!]!) {
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

  const response = await fetch(`https://${storeDomain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminAccessToken,
    },
    body: JSON.stringify({ query, variables: { metafields } }),
  });
  const json = await response.json().catch(() => ({}));
  const userErrors = json?.data?.metafieldsSet?.userErrors || [];
  if (!response.ok || json.errors?.length || userErrors.length) {
    throw new Error(json.errors?.[0]?.message || userErrors?.[0]?.message || "Ghost 360 metafields were not saved.");
  }
  return json.data.metafieldsSet.metafields;
}

export async function GET(req: NextRequest) {
  const authError = verifyAdminApiRequest(req);
  if (authError) return authError;
  const store = await readAdminCustomizerStore();
  const productId = req.nextUrl.searchParams.get("productId") || "";
  const normalizedProductId = normalizeProductId(productId);
  const frameSets = normalizedProductId
    ? store.customGhost360FrameSets.filter((frameSet) => frameSet.productId === normalizedProductId || frameSet.productId === productId)
    : store.customGhost360FrameSets;
  return NextResponse.json({ frameSets, ...configuredStatus() }, { headers: ADMIN_NO_STORE_HEADERS });
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

  const productId = normalizeProductId(String(formData.get("productId") || ""));
  const productHandle = String(formData.get("productHandle") || "").trim();
  const name = String(formData.get("name") || productHandle || productId || "Custom Ghost 360 frame set").trim();
  const enabled = String(formData.get("enabled") || "true") !== "false";
  const effectStyle = normalizeEffectStyle(formData.get("effectStyle"));
  const frameCount = normalizeFrameCount(formData.get("frameCount"));
  const frameResults = [];

  for (let index = 0; index < frameCount; index += 1) {
    const file = formData.get(`frame_${index}`);
    if (!(file instanceof File) || file.size === 0) continue;
    const label = String(formData.get(`label_${index}`) || frameLabel(index, frameCount));
    frameResults.push(await storeUploadedFrame(file, label, frameResults.length));
  }

  const errors = frameResults.flatMap((result) => result.errors);
  const warnings = frameResults.flatMap((result) => result.warnings);
  const frames = frameResults.map((result) => result.frame).filter(Boolean) as CustomGhost360Frame[];

  if (!frames.length) {
    return NextResponse.json({ errors: ["Upload at least one product image frame."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
  }
  if (errors.length) {
    return NextResponse.json({ errors, warnings }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
  }

  const timestamp = now();
  const frameSet: CustomGhost360FrameSet = {
    id: `ghost360_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    name,
    productId: productId || undefined,
    productHandle: productHandle || undefined,
    enabled,
    frameCount,
    fallbackImageUrl: frames[0]?.imageUrl,
    effectStyle,
    frames: sortFrames(frames),
    warnings: [
      ...warningsForFrames(frames, frameCount, warnings),
      "Custom Ghost 360 is a presentation effect only. It does not alter logos, prints, garment color, or product shape.",
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await addCustomGhost360FrameSet(frameSet);
  return NextResponse.json({ status: "saved", frameSet }, { headers: ADMIN_NO_STORE_HEADERS });
}

export async function PATCH(req: NextRequest) {
  const authError = verifyAdminApiRequest(req);
  if (authError) return authError;
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const action = String(body.action || "");
  if (!id) {
    return NextResponse.json({ errors: ["Missing Custom Ghost 360 frame set ID."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
  }

  const store = await readAdminCustomizerStore();
  const frameSet = store.customGhost360FrameSets.find((item) => item.id === id);
  if (!frameSet) {
    return NextResponse.json({ errors: ["Custom Ghost 360 frame set not found."] }, { status: 404, headers: ADMIN_NO_STORE_HEADERS });
  }

  try {
    if (action === "move-frame") {
      const frameIndex = Number(body.frameIndex);
      const direction = String(body.direction || "");
      const frames = sortFrames(frameSet.frames);
      const targetIndex = direction === "up" ? frameIndex - 1 : frameIndex + 1;
      if (!Number.isInteger(frameIndex) || targetIndex < 0 || targetIndex >= frames.length) {
        return NextResponse.json({ errors: ["Frame cannot be moved in that direction."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
      }
      const nextFrames = [...frames];
      const current = nextFrames[frameIndex];
      nextFrames[frameIndex] = nextFrames[targetIndex];
      nextFrames[targetIndex] = current;
      const framesAfterMove = nextFrames.map((frame, index) => ({ ...frame, order: index }));
      const result = await updateCustomGhost360FrameSet(id, {
        frames: framesAfterMove,
        warnings: warningsForFrames(framesAfterMove, frameSet.frameCount || framesAfterMove.length || 8),
      });
      return NextResponse.json({ frameSet: result.value, errors: result.errors }, { headers: ADMIN_NO_STORE_HEADERS });
    }

    if (action === "delete-frame") {
      const frameId = String(body.frameId || "");
      const frameIndex = Number(body.frameIndex);
      const frames = sortFrames(frameSet.frames);
      if (frames.length <= 1) {
        return NextResponse.json({ errors: ["Frame set must keep at least one frame."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
      }
      const nextFrames = frames
        .filter((frame, index) => (frameId ? frame.id !== frameId : index !== frameIndex))
        .map((frame, index) => ({ ...frame, order: index }));
      if (nextFrames.length === frames.length) {
        return NextResponse.json({ errors: ["Frame not found."] }, { status: 404, headers: ADMIN_NO_STORE_HEADERS });
      }
      const result = await updateCustomGhost360FrameSet(id, {
        frames: nextFrames,
        fallbackImageUrl: nextFrames[0]?.imageUrl,
        warnings: warningsForFrames(nextFrames, frameSet.frameCount || frames.length || 8),
      });
      return NextResponse.json({ frameSet: result.value, errors: result.errors }, { headers: ADMIN_NO_STORE_HEADERS });
    }

    if (action === "update-settings") {
      const nextFrames = sortFrames(frameSet.frames);
      const nextFrameCount = normalizeFrameCount(body.frameCount || frameSet.frameCount || nextFrames.length || 8);
      const result = await updateCustomGhost360FrameSet(id, {
        name: String(body.name || frameSet.name).trim() || frameSet.name,
        enabled: body.enabled === undefined ? frameSet.enabled : Boolean(body.enabled),
        frameCount: nextFrameCount,
        effectStyle: normalizeEffectStyle(body.effectStyle || frameSet.effectStyle),
        warnings: warningsForFrames(nextFrames, nextFrameCount),
      });
      return NextResponse.json({ frameSet: result.value, errors: result.errors }, { headers: ADMIN_NO_STORE_HEADERS });
    }

    if (action === "assign-product") {
      const productId = normalizeProductId(String(body.productId || frameSet.productId || ""));
      const productHandle = String(body.productHandle || frameSet.productHandle || "").trim();
      if (!productId && !productHandle) {
        return NextResponse.json({ errors: ["Add a product ID or product handle before assigning this frame set."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
      }
      const result = await updateCustomGhost360FrameSet(id, {
        productId: productId || undefined,
        productHandle: productHandle || undefined,
        enabled: body.enabled === undefined ? frameSet.enabled : Boolean(body.enabled),
        frameCount: normalizeFrameCount(body.frameCount || frameSet.frameCount || frameSet.frames.length || 8),
        effectStyle: normalizeEffectStyle(body.effectStyle || frameSet.effectStyle),
        assignedAt: now(),
      });
      return NextResponse.json({ frameSet: result.value, errors: result.errors }, { headers: ADMIN_NO_STORE_HEADERS });
    }

    if (action === "sync-shopify-metafields") {
      const productId = normalizeProductId(String(body.productId || frameSet.productId || ""));
      const metafields = await syncGhost360Metafields(frameSet, productId);
      const result = await updateCustomGhost360FrameSet(id, {
        productId: productId || frameSet.productId,
        metafieldsSyncedAt: now(),
      });
      return NextResponse.json({ frameSet: result.value, metafields, errors: result.errors }, { headers: ADMIN_NO_STORE_HEADERS });
    }

    return NextResponse.json({ errors: ["Unknown action."] }, { status: 400, headers: ADMIN_NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { errors: [error instanceof Error ? error.message : "Custom Ghost 360 action failed."] },
      { status: 500, headers: ADMIN_NO_STORE_HEADERS }
    );
  }
}
