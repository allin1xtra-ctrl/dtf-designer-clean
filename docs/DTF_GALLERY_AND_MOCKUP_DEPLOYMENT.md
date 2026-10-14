# Publishing portfolio images

The public DTF gallery at `/samples` displays WebP images from `public/printing-samples/`. Each image is independently rendered with a safe fallback when a file is unavailable.

## Install the approved 18 files
1. Download `DTF_Gallery_18_Samples.zip` from the completed ChatGPT image package.
2. Extract the archive. It contains a directory called `printing-samples` with 18 WebP images.
3. Upload **the individual WebP files** into the GitHub repository's `public/printing-samples/` directory. Keep their filenames unchanged, including hyphens and capitalization.
4. Check `/samples` after the Vercel deployment. Look at the gallery on desktop and mobile. All 18 previews should appear, without fallback text.
5. Preserve the original high-resolution PNGs for actual print production. These WebPs are lower-size portfolio previews only, not DTF print masters.

Do not enable customers to download or order these example graphics as stock artwork. The rights holder authorized their use as a demonstration portfolio.

## Customizer mockups — replacement protocol
The existing mockup system uses both hardcoded assets and admin-managed product variants. Do not remove or overwrite the fallback graphics before verifying every new asset.
- Customer-facing blank mockups must have **no MADE or other supplier branding**.
- Product categories: T-shirt, hoodie, sweatpants/pants, shorts.
- Required views: front/back and applicable left/right sleeve or leg views; neck tag where appropriate.
- Images should have consistent camera angle, cropping and transparent or uniform backgrounds, with calibrated printable rectangles.
- Test black/white/gray colorways, front/back selection, artwork positioning, zoom, export, and mobile preview before retiring old references.
- The gang-sheet workspace and standalone transfer canvases must be left intact.
- For the final Shopify integration, verify real product variant IDs, checkout, order storage, and transaction test before connecting the purchased domain.
