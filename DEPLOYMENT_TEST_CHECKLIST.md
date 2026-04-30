# DTF Designer Pro — End-to-End Deployment & Test Checklist

## 1. Vercel Environment Variables
- [ ] `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` set
- [ ] `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` set
- [ ] `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` set
- [ ] `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN` set
- [ ] All values match your local `.env.local`
- [ ] **Production deployment is live and iframe URL is correct**

## 2. Shopify Section Setup
- [ ] Section added to product page
- [ ] Iframe `id="dtf-customizer"` present
- [ ] Shopify section `<script>` uses correct Vercel origin (`VERCEL_ORIGIN`)
- [ ] postMessage bridge origin locked down (not '*')
- [ ] postMessage receiver script is in the section's `<script>` block

## 3. Cloudinary Upload Test
- [ ] Unsigned upload preset exists and is active
- [ ] Upload artwork via customizer
- [ ] Artwork uploads successfully and returns a valid `secure_url`
- [ ] URL is accessible and image renders

## 4. Product & Variant Selection
- [ ] ProductSelector fetches real products/variants from Storefront API
- [ ] User can select a product and variant
- [ ] Variant ID is numeric and passed to CartIntegration
- [ ] `extractNumericId()` correctly strips GID to numeric variant ID

## 5. Artwork Export & Cart Integration
- [ ] ArtworkCanvas exports design and uploads to Cloudinary
- [ ] CartIntegration receives artwork URL and variant ID
- [ ] "Add to Cart" triggers postMessage to Shopify parent
- [ ] Shopify section receives message and calls `/cart/add.js`
- [ ] `/cart/add.js` returns a valid response with `id`
- [ ] Artwork URL is attached as line item property

## 6. Order Placement & Verification
- [ ] Cart updates with custom product and artwork
- [ ] Checkout completes successfully
- [ ] Order in Shopify admin contains artwork URL in line item properties

## 7. UI/UX & Performance
- [ ] No layout shifts (CLS < 0.1)
- [ ] Loading states/skeletons visible during async actions
- [ ] All animations use transform/opacity only
- [ ] Font loads with `font-display: swap`

## 8. Security
- [ ] postMessage origins are locked down (Shopify <-> Vercel only)
- [ ] No sensitive keys exposed in client code

---

**Tip:**
- Test on both desktop and mobile
- Use Chrome DevTools → Lighthouse for performance and CLS
- Use Shopify’s order admin to verify line item properties

---

If any step fails, note the error and location for rapid debugging.
