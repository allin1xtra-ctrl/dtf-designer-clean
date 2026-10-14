# DTF gallery installation — October 13, 2026

Base: main at 201b339. Branch: codex/install-dtf-gallery-20261013.

Installed the 18 approved WebP files under public/printing-samples with original filenames and byte-for-byte unchanged contents. Existing gallery titles, four categories, and TRUE AUTHENTIC attribution are preserved. Removed preparation placeholders, added responsive Next Image previews with object-contain and lazy loading, and added a visible View Printing Samples homepage link. A neutral checkerboard improves visibility of both light and dark transparent artwork. Homepage actions wrap within the available width.

## Verification

- npm ci and npm run build: passed, including customizer integrity guard and TypeScript.
- ESLint on the three edited TSX files and git diff --check: passed.
- Exactly 18 unique gallery references match 18 existing, decodable WebP files.
- All installed images match extracted source bytes. Original proportions remain unchanged.
- Original image URLs: 18/18 HTTP 200. Next image optimizer at width 640, quality 75: 18/18 HTTP 200.
- Chromium production-server gallery at 1440 x 1000 and 390 x 844: 18/18 images successfully decoded at each size, four categories, object-fit contain, responsive srcset, lazy loading, no horizontal overflow, no failed HTTP responses, and no browser console errors or warnings.
- Homepage View Printing Samples link opens /samples; gallery Request a Print Quote opens /quote.
- Quote form: empty required fields fail validation; valid name/email/product/quantity/dimensions pass validation; Copy Order Request copies the expected populated summary and shows Copied request. No email was sent; external email-client delivery was not tested.
- Designer route and canvas render. Quote source, prototype placement/scaling logic, garment assets, dependency manifests and config files are unchanged relative to main. Production size selection and URL initialization were corrected at the user request to support a 13x60 artwork area and sheet.

## Existing limitations

Production build emits a non-fatal Turbopack file-tracing warning through next.config.ts -> lib/admin-doctor/checks.ts -> app/api/admin/ai-doctor/health/route.ts. Those files are unchanged.

The user confirmed that both the artwork area and sheet are 13x60 inches. The production designer consumes transferSize=13x60, opens that canvas from the homepage, and offers a 13x60 Gang Sheet preset in place of 16x20. Other presets and the default 12x12 canvas are preserved. Legacy saved projects up to 20 inches remain valid; only the exact 13x60 size extends that limit. Artwork placement, proportional scaling, colors and boundary logic are unchanged.

Additional verification: seven designer-model tests pass. Browser tests confirm homepage initialization, manual preset selection, image upload and text editing, identical artwork transforms/dimensions/colors after downloading and reopening a 13x60 project, and transparent PNG export at 3900x18000 pixels (300 DPI). Desktop 1440x1000 and mobile 390x844 show no horizontal overflow or page errors. Targeted lint reports zero errors and one existing garment img optimization warning.

Testing used the local production build. Deployed preview/production and real device browsers are not certified by these checks. PR is left as a draft and must not be merged until outstanding acceptance concerns are resolved.
