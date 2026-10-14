# Blank garment mockup audit and replacement preparation

Audit date: October 13, 2026. Scope: repository main at 201b339 and local production runtime. No existing mockups were modified or removed. Hosted production admin data was not queried; remote variants must be inventoried before replacement.

## Current inventory and usage

36 local PNG assets in public/customizer-preview/mockups: seven colors (black, white, heather-grey, regular-grey, royal-blue, red, off-white), five views each (front, back, left sleeve, right sleeve, neck tag), plus white-front-alt.png. The alternate white front is not referenced by the hardcoded mockup mapping. Dimensions and file sizes for every asset are listed below.

Production /customizer -> CustomizerProductionShell -> TrueAuthenticDesigner uses only black-front.png for its illustrative T-shirt preview. Its CSS places the artwork canvas at top 27%, left 34%, width 32%, max-height 53%; those values and layer transforms must remain stable during asset replacement.

/customizer-preview uses CustomizerPrototype. It has hardcoded mappings for the seven T-shirt colors and supports admin overrides through /api/customizer/mockups. The local API returns seven product seeds, zero variants, and hardcoded_fallback_expected. No committed admin store exists. Hoodie, pants and shorts views currently use generic generated placeholders unless hosted admin overrides supply actual assets. Pants is the current product id to use for sweatpants; do not rename ids during an asset-only change.

Visual review of the full 36-asset contact sheet shows basic T-shirts, uneven color treatment (particularly red and royal blue), and baked dotted printing guides on several views. No obvious MADE or supplier branding is visible in that contact sheet; final source assets and neck/label details require full-resolution review. The current hasBakedPrintGuide metadata is inconsistent with some visibly baked guides (for example black-right-sleeve is flagged false). Audit and resolve these flags during replacement so guides are rendered once.

## Replacement brief

Create independent, unbranded premium oversized garments with boxy silhouettes, dropped shoulders, realistic fabric texture, consistent studio lighting, and consistent front/back scale. All neck labels, tags, drawcord hardware, packaging, and fabric surfaces must be free of MADE and supplier branding. Use original owned photography or newly commissioned/generated independent assets; do not reuse supplier product photographs as the final assets. Confirm rights for any source references.

| Garment | Existing product id | Required views | Initial colors |
| --- | --- | --- | --- |
| Premium oversized T-shirt | t-shirts | front, back, leftSleeve, rightSleeve, neckTag | existing seven colors |
| Premium oversized hoodie | hoodies | front, back, leftSleeve, rightSleeve, neckTag | match existing palette |
| Premium sweatpants | pants | front, back, leftLeg, rightLeg | match existing palette |
| Premium shorts | shorts | front, back, leftLeg, rightLeg | match existing palette |

The active production designer currently supports only a T-shirt preview. New garment selection is a separate editor feature and should not be silently introduced with asset replacement.

## Preserve editor behavior

- Snapshot current active hosted variants and their URL mappings, color ids/hex values, printAreas and hasBakedPrintGuide flags before writing any replacement records.
- Preserve artwork layer ids, x/y positions, width/height, proportional scaling, rotation, opacity, fill/text colors, saved project format, export dimensions and order.
- Match existing image canvas size, garment anchor and usable print surface. Align new garment photography to the existing artwork placement coordinate system; do not change boundaries simply to fit a photograph.
- Keep product/view ids and existing fallback order. Keep color hex values independent of background photography.
- Use guide-free new assets and set hasBakedPrintGuide=false for new variants. Keep the editor's existing dynamic guide/boundary overlay.
- Prototype baseline center/width/height percent areas: front (50,50.5,38,61), back (49,48.5,48,59), left sleeve (51,50,30,42), right sleeve (49,50,30,42), neck tag (50,43,28,17), legs (50,52,32,52). Hosted per-variant overrides take precedence and must be preserved exactly. Production T-shirt CSS placement is separate from this prototype mapping.

## Rollout and acceptance

1. Export an inventory of hosted active variants, view URLs and placement metadata. Retain originals and a rollback map.
2. Produce neutral front/back reference sets, approve fit and fabric appearance, then produce matching sleeve/neck/leg views and colorways. Prefer 2000px or wider originals; export compressed transparent/background-consistent PNG or WebP as appropriate.
3. Add new assets under a separate versioned directory. Do not overwrite the old URLs during preparation. Keep all original garment assets available.
4. Register new view URLs in a preview branch or staging data, preserving all placement records. Reconcile baked-guide metadata only for the new guide-free assets.
5. Compare identical saved designs before/after across every product/color/view on desktop and mobile. Confirm artwork transform/color equality, boundary alignment, uploads, text, undo/redo, project reopen, PNG export and gang-sheet behavior. Check every image URL and absence of supplier marks at full resolution.
6. Switch active mappings only after acceptance passes; keep a rollback path. Do not modify Shopify, payments, DNS or Vercel billing as part of this phase.

## Complete local asset inventory

| Asset | Dimensions | Bytes |
| --- | --- | --- |
| public/customizer-preview/mockups/black-back.png | 1254 x 1254 | 1605603 |
| public/customizer-preview/mockups/black-front.png | 1254 x 1254 | 1524955 |
| public/customizer-preview/mockups/black-left-sleeve.png | 1254 x 1254 | 1751028 |
| public/customizer-preview/mockups/black-neck-tag.png | 1254 x 1254 | 2360683 |
| public/customizer-preview/mockups/black-right-sleeve.png | 1254 x 1254 | 1681930 |
| public/customizer-preview/mockups/heather-grey-back.png | 1254 x 1254 | 2016630 |
| public/customizer-preview/mockups/heather-grey-front.png | 1254 x 1254 | 2283021 |
| public/customizer-preview/mockups/heather-grey-left-sleeve.png | 1254 x 1254 | 2249022 |
| public/customizer-preview/mockups/heather-grey-neck-tag.png | 1254 x 1254 | 2948799 |
| public/customizer-preview/mockups/heather-grey-right-sleeve.png | 1254 x 1254 | 2474753 |
| public/customizer-preview/mockups/off-white-back.png | 1254 x 1254 | 1243910 |
| public/customizer-preview/mockups/off-white-front.png | 1254 x 1254 | 1171091 |
| public/customizer-preview/mockups/off-white-left-sleeve.png | 1254 x 1254 | 1298479 |
| public/customizer-preview/mockups/off-white-neck-tag.png | 1254 x 1254 | 1619047 |
| public/customizer-preview/mockups/off-white-right-sleeve.png | 1254 x 1254 | 1468312 |
| public/customizer-preview/mockups/red-back.png | 1254 x 1254 | 823164 |
| public/customizer-preview/mockups/red-front.png | 1254 x 1254 | 694879 |
| public/customizer-preview/mockups/red-left-sleeve.png | 1254 x 1254 | 743488 |
| public/customizer-preview/mockups/red-neck-tag.png | 1254 x 1254 | 792256 |
| public/customizer-preview/mockups/red-right-sleeve.png | 1254 x 1254 | 661449 |
| public/customizer-preview/mockups/regular-grey-back.png | 1254 x 1254 | 2305835 |
| public/customizer-preview/mockups/regular-grey-front.png | 1254 x 1254 | 2358853 |
| public/customizer-preview/mockups/regular-grey-left-sleeve.png | 1254 x 1254 | 2463253 |
| public/customizer-preview/mockups/regular-grey-neck-tag.png | 1254 x 1254 | 2850047 |
| public/customizer-preview/mockups/regular-grey-right-sleeve.png | 1254 x 1254 | 2547132 |
| public/customizer-preview/mockups/royal-blue-back.png | 1254 x 1254 | 832847 |
| public/customizer-preview/mockups/royal-blue-front.png | 1254 x 1254 | 766109 |
| public/customizer-preview/mockups/royal-blue-left-sleeve.png | 1254 x 1254 | 797692 |
| public/customizer-preview/mockups/royal-blue-neck-tag.png | 1254 x 1254 | 876157 |
| public/customizer-preview/mockups/royal-blue-right-sleeve.png | 1254 x 1254 | 729080 |
| public/customizer-preview/mockups/white-back.png | 1254 x 1254 | 1459391 |
| public/customizer-preview/mockups/white-front-alt.png | 1254 x 1254 | 1427099 |
| public/customizer-preview/mockups/white-front.png | 1254 x 1254 | 1427099 |
| public/customizer-preview/mockups/white-left-sleeve.png | 1254 x 1254 | 1541731 |
| public/customizer-preview/mockups/white-neck-tag.png | 1254 x 1254 | 2135749 |
| public/customizer-preview/mockups/white-right-sleeve.png | 1254 x 1254 | 1715880 |
