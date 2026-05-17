# Draft Mobile Customizer Screen Fix

This draft branch is for fixing the mobile customizer preview without touching production.

## Problem

On mobile, the DTF Designer Pro customizer preview can shift to the right because the canvas stage is fixed at 500px by 600px and then scaled inside a narrow iframe/screen. This can create horizontal overflow, extra black space, and make the checkout/Add to Cart area harder to reach.

## Target file

`app/customizer/page.tsx`

## Required code fix

Patch the mobile layout in `app/customizer/page.tsx` so that:

- The root customizer wrapper has `w-full max-w-full overflow-x-hidden`.
- The mobile preview pane has `min-w-0 w-full max-w-full overflow-hidden`.
- The preview stage remains centered with `mx-auto`/centered transform origin.
- The mobile preview height is reduced enough to keep controls and checkout reachable.
- Fabric canvas layers remain absolute and aligned to the scaled stage.
- Desktop grid behavior remains unchanged.

## Acceptance checklist

- No sideways scrolling on phone.
- Mockup/canvas centered on mobile.
- No mockup shifted off to the right.
- Checkout/Add to Cart visible below preview.
- Desktop layout unchanged.
- `npm run build` passes before merge.

## Shopify/Vercel review

Open the Vercel preview for this branch and test:

- `/customizer?source=shopify&product=custom-dtf-transfer-by-size-upload-your-design`
- `/customizer?source=shopify&product=custom-t-shirt-upload-customize`
- `/customizer?source=shopify&product=custom-hoodie-upload-customize`

Review on iPhone-size viewport before merging to `main`.