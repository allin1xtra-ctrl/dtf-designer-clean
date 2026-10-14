# Premium blank garment replacement preparation

Date: October 13, 2026. Base: merged main aefc7e9. Branch: codex/premium-garment-mockups-20261013.

## Delivered

- Original AI-generated charcoal front/back concept board for oversized T-shirt, hoodie, sweatpants and shorts, created with the built-in imagegen tool. No supplier photos were used. Visual inspection shows no MADE, supplier logos, labels, printed artwork or baked guides.
- Review-only page at /mockup-review, with noindex/nofollow metadata and responsive optimized Next Image delivery. It is not linked into customer navigation and does not change active garment mappings.
- Versioned 1254x1254 WebP board at public/premium-mockups/v1/reference-board.webp (80,552 bytes), with the original PNG preserved in task outputs. This is a whole-board concept reference, not a set of production-resolution individual editor assets.
- docs/premium-mockup-replacement-manifest.json records 126 pending individual assets: seven existing colors x five T-shirt views, five hoodie views, four pants/sweatpants views and four shorts views. Every pending target is explicitly marked pending-production; no missing target is referenced by the editor. Existing product/view/color ids and hex values are retained. New guide-free assets will use hasBakedPrintGuide=false.
- SHA-256 fingerprints of all 36 existing local garment images support retention and rollback.

## Hosted audit

Read the current dtf-designer-pro production deployment /api/customizer/mockups through the authenticated Vercel connector: HTTP 200, seven seeded products, zero stored variants, source hardcoded_fallback_expected. No hosted admin records or protection settings were changed. The repository's 36 local images are therefore the current fallback asset set; pants, shorts and hoodies still use generated placeholders where no individual assets exist.

## Preserve behavior

Active garment URLs, the production garment preview CSS, prototype placement/scaling/color/boundary logic and all original garment assets remain unchanged. The generated board must not be substituted directly into an editor background. Produce each individual view at suitable resolution, aligned to the existing placement coordinates, before registering replacement URLs.

The prior gallery PR was merged at 8617eae before the later 13x60 correction ac7d12c was added. This branch carries that correction as 9351d4f so the confirmed 13x60 sheet AND artwork area are included in the next PR. Other presets, default 12x12 behavior and legacy saved-project support remain intact.

## Validation

Production build and TypeScript: passed; the existing admin-health file-tracing warning remains. Review-page ESLint and git diff checks pass. All seven designer-model tests pass.

Chromium review page at 1440x1000 and 390x844: image decodes, four garment descriptions render, no horizontal overflow, no failed responses and no page errors; robots metadata is noindex,nofollow. Review-page screenshots are saved in outputs.

Gang-sheet regression: homepage opens 13x60, manual preset selection works, image upload and text editing work, saved project reopen retains artwork geometry and colors, and real PNG export is 3900x18000 pixels. Desktop/mobile show no horizontal overflow or page errors. All 36 original garment hashes match the retained manifest, and pending asset targets are unique.

## Remaining production work

Review garment silhouettes and fabric direction, then generate individual high-resolution front/back/sleeve/neck/leg views and matching colorways. Do not enlarge the small reference-board cells and claim them as production assets. Validate alignment using identical saved designs before changing active URLs. Keep original assets and rollback mappings. The active production designer currently supports only a T-shirt preview; adding hoodie/pants/shorts selection is a separate editor feature.

This PR prepares replacement. It does not activate the replacement mockups or claim that the 126 individual assets have been produced. No changes were made to Shopify, payments, DNS or Vercel billing.
