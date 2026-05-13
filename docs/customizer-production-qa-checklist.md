# DTF Designer Pro — Production QA Checklist

**Production test URL:**
https://dtf-designer-clean.vercel.app/customizer?product=custom-t-shirt-upload-customize&debugAI=1&v=final-qa

## 1. Product / mockup loading
- [ ] Custom T-Shirt product loads
- [ ] Front mockup loads
- [ ] Back mockup loads
- [ ] Left Sleeve mockup loads
- [ ] Right Sleeve mockup loads
- [ ] Neck Label mockup loads
- [ ] No hoodie mockup appears on T-shirt
- [ ] `dtf.print_locations` data is read correctly
- [ ] Design area dashed box appears for every print location

## 2. Print area switching
- [ ] Front tab works
- [ ] Back tab works
- [ ] Left Sleeve tab works and shows **4 in × 5 in**
- [ ] Right Sleeve tab works and shows **4 in × 5 in**
- [ ] Neck Label tab works and shows **3 in × 3 in**
- [ ] Switching views does not erase artwork from other saved views
- [ ] No warning appears when no object is selected
- [ ] No stale warning appears after switching views

## 3. Layout / mobile usability
- [ ] White canvas appears near the top
- [ ] No huge black blank area above or below canvas
- [ ] Sleeve/tag mockups fit better inside the white box
- [ ] Layout is usable on desktop
- [ ] Layout is usable on mobile
- [ ] Sidebar controls scroll properly
- [ ] Canvas/mockup stays visible and not confusing

## 4. Upload tools
- [ ] Upload Artwork opens file picker
- [ ] Uploaded image appears inside current print area
- [ ] Uploaded image is selected after upload
- [ ] Upload works on front, back, sleeve, and neck views
- [ ] Oversized images fail gracefully, if applicable

## 5. Object controls
- [ ] Add Text works
- [ ] Duplicate works
- [ ] Center works
- [ ] Lock / Unlock works
- [ ] Flip H works
- [ ] Flip V works
- [ ] Delete works
- [ ] Rotate works
- [ ] Bring Forward works
- [ ] Send Backward works

## 6. Text / font tools
- [ ] Font dropdown works
- [ ] Font size slider works
- [ ] Font size input works
- [ ] Text color works
- [ ] Outline color works
- [ ] Outline width works
- [ ] Letter spacing works
- [ ] Bold works
- [ ] Italic works
- [ ] Uppercase works
- [ ] Shadow works
- [ ] Glow works
- [ ] Arc Up works
- [ ] Arc Down works
- [ ] Wave works
- [ ] Bend / Curve works

## 7. AI design tools
- [ ] Remove Background works
- [ ] Enhance Image works
- [ ] Upscale / Sharpen works
- [ ] Vectorize Artwork works
- [ ] Clean Up Colors works
- [ ] Remove White Background works
- [ ] Suggest Design Improvements works
- [ ] Generate Idea works with prompt: `create a vector image of a dog`
- [ ] Expected success message appears: `Design idea added to canvas.`
- [ ] Generated design appears on canvas
- [ ] AI errors show clean messages
- [ ] `OPENAI_API_KEY` and `AI_IMAGE_MODEL` are working in production

## 8. Transfer size / print limits
- [ ] Front / back transfer size dropdown works
- [ ] Left Sleeve shows **4 in × 5 in**
- [ ] Right Sleeve shows **4 in × 5 in**
- [ ] Neck Label shows **3 in × 3 in**
- [ ] No warning appears when no object is selected
- [ ] Warning appears only when selected object exceeds design area
- [ ] Add to cart is not blocked by stale 12x12 on sleeve / neck

## 9. Download and checkout
- [ ] Download Print File works
- [ ] Size field works
- [ ] Quantity field works
- [ ] Add Custom Design to Cart works
- [ ] Preview / artwork uploads to Cloudinary
- [ ] Cart receives correct variant ID
- [ ] Cart receives custom line item properties
- [ ] Cart receives properties: Design ID, Size, Transfer Size, Placement, Print Location, Artwork URL, Preview URL, Mockup URL, Max Print Width, Max Print Height, Boundary Warning

## 10. Shopify cart bridge
- [ ] `postMessage` sends `DTF_ADD_TO_CART`
- [ ] Shopify theme receives event
- [ ] `/cart/add.js` succeeds
- [ ] Customer redirects to cart
- [ ] Cart item contains custom design data
- [ ] Checkout can continue

## 11. Browser console / network health
- [ ] No red runtime errors
- [ ] No broken API routes
- [ ] No missing env var errors
- [ ] No CORS / `postMessage` origin errors
- [ ] No Cloudinary upload errors
- [ ] No OpenAI config errors

## 12. Final acceptance criteria
- [ ] Everything above works on Desktop Chrome
- [ ] Everything above works on mobile viewport / phone
- [ ] At least one T-shirt product passes
- [ ] At least one hoodie product passes, if available
- [ ] Critical checks pass:
  - [ ] Left Sleeve shows 4 in × 5 in
  - [ ] Right Sleeve shows 4 in × 5 in
  - [ ] Neck Label shows 3 in × 3 in
  - [ ] No warning appears when no object is selected
  - [ ] No huge black blank area above or below canvas
  - [ ] Generate Idea works with prompt: `create a vector image of a dog`
  - [ ] Add Custom Design to Cart works
  - [ ] Cart receives custom line item properties

## 13. Failure reporting format
- [ ] Failing feature:
- [ ] Exact error message:
- [ ] Steps to reproduce:
- [ ] Affected URL / product / view:
- [ ] Suspected file / function:
- [ ] Recommended fix:
- [ ] Severity: Blocking / High / Medium / Low
