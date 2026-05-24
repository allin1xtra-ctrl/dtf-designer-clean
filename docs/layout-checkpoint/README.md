# Customizer Layout Checkpoint

**Frozen on:** 2026-05-16  
**Purpose:** Reference snapshot of the working customizer page layout (desktop + mobile). Use these files to verify that no layout-breaking changes have been introduced by future fixes.

---

## What Is Frozen

The following files were copied verbatim from the working state:

| Snapshot file | Source file |
|---|---|
| `customizer.page.tsx.snapshot` | `app/customizer/page.tsx` |
| `shopify-theme.dtf-product-designer-pro.liquid.snapshot` | `shopify-theme/sections/dtf-product-designer-pro.liquid` |
| `shopify-upload-package.dtf-product-designer-pro.liquid.snapshot` | `shopify-upload-package/sections/dtf-product-designer-pro.liquid` |
| `embed.js.snapshot` | `public/embed.js` |

These `.snapshot` files are **read-only reference copies**. Do not modify them.

---

## Layout Rules — DO NOT CHANGE

The following behaviors are confirmed working and must be preserved:

### Desktop
- Page scrolling behavior
- Customizer page height
- iframe / container layout
- Canvas positioning
- Desktop page spacing
- Add to Cart visibility and position
- Overall page structure

### Mobile
- Mobile page height
- Mobile scroll behavior (`allowTouchScrolling: true` on Fabric canvas — see `app/customizer/page.tsx` ~line 1592)
- Mobile iframe / container spacing
- Canvas position
- Add to Cart visibility
- Button spacing
- Sticky / footer behavior
- Responsive layout structure (grid breakpoints, `clamp()` values, etc.)

---

## What Future Work May Change

Future fixes must target **only** the variant / sizeMockup switching logic:

- `sizeMockup` state updates when a size variant is selected
- Variant ID normalisation and Shopify postMessage handshake
- Which mockup image is displayed per variant

Any PR that touches layout CSS, iframe sizing, scroll handling, canvas dimensions, or mobile spacing **must diff against these snapshot files** before merging to confirm no regressions.

---

## How to Diff Against the Snapshot

```bash
# Check customizer page for layout drift
diff docs/layout-checkpoint/customizer.page.tsx.snapshot app/customizer/page.tsx

# Check Shopify theme section
diff docs/layout-checkpoint/shopify-theme.dtf-product-designer-pro.liquid.snapshot \
     shopify-theme/sections/dtf-product-designer-pro.liquid

# Check upload-package section
diff docs/layout-checkpoint/shopify-upload-package.dtf-product-designer-pro.liquid.snapshot \
     shopify-upload-package/sections/dtf-product-designer-pro.liquid

# Check embed script
diff docs/layout-checkpoint/embed.js.snapshot public/embed.js
```

Any diff output in layout-related regions (CSS, iframe height, scroll handling, canvas dimensions) is a warning sign and should be reviewed carefully before merging.
