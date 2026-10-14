# Premium garment asset test report

Tested October 13, 2026 against the production build on localhost:3200.

## Accepted assets

75 unbranded previews are enabled: 35 T-shirt, 24 hoodie, 12 sweatpants, and 4 shorts views. All retain their original proportions and transparency. Accepted WebP files are 1254 × 1254 pixels, 101–392 KB each, totaling 15.65 MB; Next.js serves responsive optimized previews.

80 existing files passed decoding, transparency, size, and original URL checks. Five hoodie right-sleeve variants (white, heather grey, regular grey, red, off-white) failed visual review because their torso remained black. They are excluded from the active registry and accepted download. The remaining 46 planned variants are deferred at the user's instruction. No additional images were generated after the stop instruction.

## Verification results

- All 80 original asset requests returned HTTP 200; all 75 accepted Next.js optimized image requests returned HTTP 200 and decoded successfully.
- All 75 inspector selections displayed successfully. All 126 staged product/color/view states were exercised: 75 exact matches and 51 explicit black fallbacks, with no broken premium image requests.
- Desktop (1440 px) and mobile (390 px) inspector/editor checks passed. Removed an inherited mobile rule forcing the preview to 1180 px; all three tested routes now fit the viewport. View controls remain horizontally scrollable where needed.
- Artwork layers and transforms remained identical when changing garment and color. Seven placement, scaling, and boundary functions match the merged baseline; production designer CSS is unchanged.
- All 36 original mockups retain their recorded SHA-256 hashes.
- Gang sheet artwork area and sheet are both 13 × 60 inches. Project download/reopen retained artwork geometry and colors; PNG export measured 3900 × 18000 pixels.
- Quote form validation and request-copy flow passed; no customer email was sent during testing.
- Browser console: zero errors and zero warnings in the final smoke checks.
- Production build, TypeScript/integrity guard, targeted ESLint, and git diff whitespace checks passed. Asset regression tests: 3 passed. Designer model tests: 7 passed.

The build retains an existing nonfatal Turbopack trace warning involving the admin doctor health route; those files were unchanged.

## Installation scope

The production designer uses the accepted black T-shirt front illustration. The other garment/color/view combinations are available in the isolated, noindex premium garment preview and mockup inspector. These are illustrative garment previews; staging preserves the existing printing guide algorithms and does not introduce manufacturing calibration claims.

Existing artwork, mockups, editor geometry, customer payment integrations, Shopify, DNS, and Vercel billing were preserved. The accepted asset archive contains only the 75 approved files. The branch is submitted for review and is not merged by this task. Deployment preview testing remains separate from the completed local production-build testing.
