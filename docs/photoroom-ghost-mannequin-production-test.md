# Photoroom Ghost Mannequin Production Test

Status: implemented and sandbox/dev verified. Not production-verified yet.

## Required Environment Variables

- `ADMIN_PANEL_TOKEN`: Required to access the admin API and admin UI.
- `ADMIN_SESSION_SECRET`: Recommended for signed admin sessions. Falls back to `ADMIN_PANEL_TOKEN` when missing.
- `PHOTOROOM_ENABLED=true`: Enables real ghost mannequin generation.
- `PHOTOROOM_API_KEY`: Required for production Photoroom Image Editing API calls.
- `PHOTOROOM_SANDBOX`: Leave unset for production. Use `true` for local mock success or `fail` for local mock failure only.
- `SHOPIFY_STORE_DOMAIN`: Shopify store domain without protocol, for example `example.myshopify.com`.
- `SHOPIFY_ADMIN_ACCESS_TOKEN`: Admin API token with product media and metafield permissions.
- `SHOPIFY_ADMIN_API_VERSION`: Optional. Defaults to `2024-10` when unset.
- Cloudinary storage variables used by the customizer asset storage layer. If missing, local dev storage can be used, but production publishing needs public HTTPS asset URLs.

## Real Photoroom Generation Test

1. Deploy or run the app with `PHOTOROOM_ENABLED=true`, a real `PHOTOROOM_API_KEY`, and `PHOTOROOM_SANDBOX` unset.
2. Sign in to `/admin/product-images`.
3. Upload a real apparel product photo or provide a public source image URL.
4. Click `Generate Ghost Mannequin`.
5. Confirm the generated item appears in the review queue.
6. Confirm the original preview and generated preview are shown separately.
7. Confirm the original asset was not overwritten.
8. Confirm the generated asset is stored as a separate asset with its own URL.
9. Reject any output that changes apparel color, logo, print placement, stitching, label details, fabric texture, or garment shape.

## Shopify Media Publishing Test

1. Configure `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ADMIN_ACCESS_TOKEN`.
2. Use a real Shopify product ID in `gid://shopify/Product/...` format or a numeric product ID.
3. Generate a ghost mannequin image and review the previews.
4. Click `Approve`.
5. Confirm `Add to Shopify product media` becomes enabled only after approval.
6. Click `Add to Shopify product media`.
7. Confirm the API returns the Shopify media result.
8. Open the Shopify product in admin and confirm the generated image was added to product media.
9. Confirm ghost mannequin metafields were saved. If metafield save returns warnings, treat publishing as partial and fix the warnings before calling the test complete.
10. Confirm no product image was auto-replaced.

## Approve And Reject Flow

1. Generate an asset.
2. Confirm the Shopify publish action is disabled while status is `generated`.
3. Click `Approve`.
4. Confirm status changes to `approved` and the Shopify publish action becomes enabled.
5. Click `Reject` on another generated asset.
6. Confirm status changes to `rejected` and the Shopify publish action remains disabled.
7. Confirm rejected assets do not publish to Shopify.

## 360 Frame Set Test

1. Open `/admin/product-images`.
2. Select `Generate Angle Set / 360`.
3. Upload at least four frame angles. Preferred set: front, front-left, left, back-left, back, back-right, right, front-right.
4. Generate the frame set.
5. Review each generated frame for consistent garment details.
6. Approve only frames that match the source apparel.
7. Open `/admin/product-images/viewer-test` or a product/page that renders `GhostMannequin360Viewer`.
8. Confirm drag works on desktop.
9. Confirm swipe works on mobile.
10. Confirm fewer than four frames render as a static fallback image.
11. Confirm frames lazy-load and do not create visible layout shift or horizontal overflow.

## Known Limitations

- Sandbox mode does not call Photoroom and does not prove real AI output quality.
- AI 360 beta can introduce inconsistent garment details between frames.
- Production Shopify publishing requires generated assets to be available at public HTTPS URLs.
- Missing Shopify Admin API variables disable production publishing checks.
- Missing product ID must block Shopify publishing.
- Metafield warnings mean publishing is only partially complete.
- The workflow is review-first; it must not auto-publish or auto-replace product images.

## Apparel Quality-Control Checklist

Before approving or publishing, confirm:

- Color matches the source garment.
- Logo is accurate and not warped, moved, or redrawn.
- Print placement matches the source.
- Stitching and seams remain realistic.
- Neck label, hem label, and tags are preserved when visible.
- Fabric texture, weight, and drape are believable.
- Garment shape, sleeve length, neckline, collar, placket, pockets, and hem match the product.
- No extra artifacts, fake shadows, duplicate edges, or missing garment areas appear.
- Background is clean and appropriate for ecommerce.
- The generated image does not imply a different product variant.
- Original asset remains stored separately.
- Generated asset remains a separate reviewable asset.
- Shopify publishing happens only after manual approval.
