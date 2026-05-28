# DTF Designer Pro Function Status

Audit date: 2026-05-27

Scope audited:
- `app/customizer/page.tsx`
- `app/api/ai/remove-background/route.ts`
- `app/api/process-image/route.ts`
- `components/customizer/ArtworkCanvas.jsx`
- `components/admin/AdvancedAdminSettings.jsx`
- `app/admin/mockups/page.tsx`

## Text Tools

| Feature | Status | File location | Root cause / notes | Recommended fix |
| --- | --- | --- | --- | --- |
| Add text | Working | `app/customizer/page.tsx` | Fabric `Textbox` is added to active canvas. | Keep; now waits for selected font before render. |
| Font dropdown | Working | `app/customizer/page.tsx` | Dropdown applies to active Fabric text object. | Keep; now includes required premium font set. |
| Font loading | Working | `app/customizer/page.tsx` | Previously Google fonts were referenced but not loaded before Fabric render. | Fixed with runtime font stylesheet injection and `document.fonts.load`. |
| Font rendering | Working | `app/customizer/page.tsx` | Fabric needed a render after font availability. | Fixed with `canvas.requestRenderAll()` after async font load. |
| Font persistence | Working | `app/customizer/page.tsx` | Fabric JSON preserves `fontFamily`; restore rendered before fonts were ready. | Fixed by loading fonts from saved JSON before `loadFromJSON` render. |
| Text color | Working | `app/customizer/page.tsx` | Uses Fabric `fill`. | Keep. |
| Outline | Working | `app/customizer/page.tsx` | Uses Fabric `stroke`. | Keep. |
| Stroke width | Working | `app/customizer/page.tsx` | Uses Fabric `strokeWidth`. | Keep. |
| Shadow | Working | `app/customizer/page.tsx` | Uses Fabric `Shadow`. | Keep. |
| Glow | Working | `app/customizer/page.tsx` | Uses centered blurred Fabric `Shadow`. | Keep. |
| Letter spacing | Working | `app/customizer/page.tsx` | Uses Fabric `charSpacing`. | Keep. |
| Line height | Working | `app/customizer/page.tsx` | Was missing from controls. | Added line-height control and persistence through Fabric JSON. |
| Alignment | Working | `app/customizer/page.tsx` | Was missing from controls. | Added left/center/right alignment controls. |
| Bold | Working | `app/customizer/page.tsx` | Uses Fabric `fontWeight`. | Keep. |
| Italic | Working | `app/customizer/page.tsx` | Uses Fabric `fontStyle`. | Keep. |
| Uppercase | Working | `app/customizer/page.tsx` | Converts active textbox text. | Keep; future improvement could preserve original mixed-case text separately. |
| Curved text | Working | `app/customizer/page.tsx` | Uses Fabric path text for arc/wave and persists curve metadata with draft JSON. | Keep current curve modes; add more warp presets later if needed. |
| Warp/bend | Partially Working | `app/customizer/page.tsx` | Bend amount controls path amplitude but is not a full Kittl-style warp engine. | Add advanced mesh/text warp only after current path text is stable. |
| Rotate text | Working | `app/customizer/page.tsx` | Rotate selected object by 15 degrees. | Keep. |
| Duplicate text | Working | `app/customizer/page.tsx` | Clones active Fabric object. | Keep. |
| Delete text | Working | `app/customizer/page.tsx` | Removes active Fabric object. | Keep. |
| Text opacity | Working | `app/customizer/page.tsx` | Was missing from controls. | Added opacity control. |

## Image Tools

| Feature | Status | File location | Root cause / notes | Recommended fix |
| --- | --- | --- | --- | --- |
| Upload PNG/JPG/WebP | Working | `app/customizer/page.tsx` | Uses file input and Fabric image from data URL. | Keep. |
| Resize image | Working | `app/customizer/page.tsx` | Fabric object controls support scaling. | Keep. |
| Rotate image | Working | `app/customizer/page.tsx` | Rotate selected object by 15 degrees. | Keep. |
| Move image | Working | `app/customizer/page.tsx` | Fabric drag/move enabled. | Keep; snap-to-center now improves placement. |
| Crop/fit | Partially Working | `app/customizer/page.tsx` | Upload fits artwork to printable area, but no crop UI exists. | Add non-destructive crop/fit modes later. |
| Duplicate image | Working | `app/customizer/page.tsx` | Clones active Fabric object. | Keep. |
| Delete image | Working | `app/customizer/page.tsx` | Removes active image or all artwork. | Keep. |
| Remove background | Working / API-dependent | `app/customizer/page.tsx`, `app/api/ai/remove-background/route.ts` | UI calls server route; route uses OpenAI `images.edit` with transparent PNG output and safe diagnostics. | Keep; now has clearer loading state in UI. |
| AI image generation | Working / API-dependent | `app/customizer/page.tsx`, `app/api/ai/generate-idea/route.ts`, `app/api/ai/generate-design/route.ts` | UI calls generate-idea route and adds returned image. | Keep; loading/error display is preserved. |
| AI design ideas | Working / API-dependent | `app/customizer/page.tsx` | Suggestions returned by AI route are shown. | Keep. |
| Quality warning | Working | `app/customizer/page.tsx` | Was missing for low-resolution uploads. | Added low-resolution upload warning. |
| Legacy process-image remover | Partially Working | `app/api/process-image/route.ts` | Uses local threshold-style cleanup and is not the main customizer remove-background route. | Keep as utility route; do not use for premium background removal unless explicitly selected. |

## Canvas And Layout

| Feature | Status | File location | Root cause / notes | Recommended fix |
| --- | --- | --- | --- | --- |
| Desktop layout | Working | `app/customizer/page.tsx` | Tools and canvas are side-by-side. | Upgraded stage size and mockup fit ratio. |
| Mobile layout | Working | `app/customizer/page.tsx` | Previously mobile used cramped side-by-side columns. | Updated mobile to show canvas above independently scrollable tools. |
| Centering | Working | `app/customizer/page.tsx` | Product mockup and canvas stage are centered. | Keep. |
| Scaling | Working | `app/customizer/page.tsx` | ResizeObserver scales preview to pane. | Upgraded base canvas size and mockup fit. |
| Page movement | Working | `app/customizer/page.tsx` | Root uses `100dvh` and hidden overflow. | Keep. |
| Scroll behavior | Working | `app/customizer/page.tsx` | Sidebar/tools panel scrolls independently. | Keep. |
| Side-by-side desktop | Working | `app/customizer/page.tsx` | Desktop grid keeps tools beside canvas. | Keep. |
| Snap-to-center guides | Partially Working | `app/customizer/page.tsx` | Center snapping is implemented without visual guide lines. | Add visible guide lines later if needed. |
| Bigger editing preview | Working | `app/customizer/page.tsx` | Previous base canvas was smaller. | Increased actual Fabric/mockup stage from 500x600 to 620x744 and increased mockup fit ratio. |

## Layers And Object Controls

| Feature | Status | File location | Root cause / notes | Recommended fix |
| --- | --- | --- | --- | --- |
| Select layer | Working | `app/customizer/page.tsx` | Layer panel was missing. | Added layer list that selects Fabric objects. |
| Rename layer | Working | `app/customizer/page.tsx` | Layer names are stored on Fabric object `name` and included in saved canvas JSON. | Keep. |
| Hide/show layer | Working | `app/customizer/page.tsx` | Was missing. | Added visibility toggle. |
| Lock/unlock layer | Working | `app/customizer/page.tsx` | Active object lock existed; layer-level lock was missing. | Added layer-level lock toggle. |
| Bring forward | Working | `app/customizer/page.tsx` | Active object control existed. | Added layer-level control too. |
| Send backward | Working | `app/customizer/page.tsx` | Active object control existed. | Added layer-level control too. |
| Duplicate layer | Working | `app/customizer/page.tsx` | Active duplicate existed. | Added layer-level duplicate. |
| Delete layer | Working | `app/customizer/page.tsx` | Active delete existed. | Added layer-level delete. |

## Product Customization

| Feature | Status | File location | Root cause / notes | Recommended fix |
| --- | --- | --- | --- | --- |
| Front view | Working | `app/customizer/page.tsx` | Reads `front` print location. | Keep. |
| Back view | Working | `app/customizer/page.tsx` | Reads `back` print location. | Keep. |
| Left sleeve | Working | `app/customizer/page.tsx` | Supports `leftSleeve` and `left_sleeve`. | Keep. |
| Right sleeve | Working | `app/customizer/page.tsx` | Supports `rightSleeve` and `right_sleeve`. | Keep. |
| Neck tag | Working | `app/customizer/page.tsx` | Supports neck aliases including `neck_tag`. | Keep. |
| Mockup rendering | Working | `app/customizer/page.tsx` | Uses metafield, color, size, and fallback mockup resolution. | Keep. |
| Size mockups | Working | `app/customizer/page.tsx` | `sizeMockups` are resolved before color/default mockups. | Keep. |
| Color mockups | Working | `app/customizer/page.tsx` | `colorMockups` are resolved by selected variant color. | Keep. |
| Design area boundaries | Working | `app/customizer/page.tsx`, `app/admin/mockups/page.tsx` | Uses metafield design area and boundary warnings. | Keep. |
| Admin mockup settings | Working | `app/admin/mockups/page.tsx` | Loads products with admin token and saves `dtf.print_locations`. | Keep. |

## Save And Cart

| Feature | Status | File location | Root cause / notes | Recommended fix |
| --- | --- | --- | --- | --- |
| Autosave | Working | `app/customizer/page.tsx` | Saves per product/variant with views, selected size/color, transfer size, quantity, artwork URLs. | Keep. |
| Restore draft | Working | `app/customizer/page.tsx` | Restores per product/variant draft. | Fixed font preloading before restored Fabric render. |
| Cloudinary uploads | Working | `app/customizer/page.tsx`, `app/api/upload/route.ts` | Preview blob uploads server-side through `/api/upload`. | Keep. |
| Preview generation | Working | `app/customizer/page.tsx` | Exports lower Fabric canvas to blob. | Keep. |
| Print file generation | Working | `app/customizer/page.tsx` | Downloads high-resolution PNG. | Keep. |
| Shopify add-to-cart | Working | `app/customizer/page.tsx` | Sends line item payload to Shopify parent window. | Keep. |
| Line item properties | Working | `app/customizer/page.tsx` | Includes design ID, size, placement, artwork URL, mockup URL, print limits, warnings, transfer size. | Keep. |
| Checkout compatibility | Working | `app/customizer/page.tsx`, `app/api/checkout/route.ts` | Existing checkout/add-to-cart flow was not changed. | Keep protected. |

## Admin And Legacy Components

| Feature | Status | File location | Root cause / notes | Recommended fix |
| --- | --- | --- | --- | --- |
| `components/customizer/ArtworkCanvas.jsx` | Partially Working | `components/customizer/ArtworkCanvas.jsx` | Legacy/manual canvas component supports mockup/artwork drag but is not the main Fabric editor. | Avoid upgrading unless this path becomes active. |
| `components/ArtworkCanvas.jsx` | Partially Working | `components/ArtworkCanvas.jsx` | Older canvas export path uploads directly to Cloudinary using public unsigned preset envs. | Prefer current `/api/upload` server route in main customizer. |
| `components/admin/AdvancedAdminSettings.jsx` | Partially Working | `components/admin/AdvancedAdminSettings.jsx` | Contains simulated admin actions and an old `/api/openai` prompt helper. | Treat as legacy/admin prototype; do not rely on for production customizer. |
| `/admin/mockups` | Working | `app/admin/mockups/page.tsx` | Admin token UX and product save flow are wired to Shopify metafield route. | Keep as fallback/admin setup tool. |

## Validation

- `npm.cmd run build`: Passed after rerunning with elevated filesystem access for Turbopack's inferred workspace-root read.
- Initial sandboxed build failed before TypeScript because Turbopack attempted to read `C:\Users\Truea`.
- No Shopify auth, token names, checkout route, Cloudinary upload route, or metafield schema changes were made.
