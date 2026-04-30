# Shopify theme starter for DTF Designer Pro

This folder contains a safe starter theme layer that matches the designer app.

## Included

- sections/dtf-pro-hero.liquid
  - Homepage hero with two launch buttons:
    - Start customizing
    - Upload your artwork

- sections/dtf-product-designer.liquid
  - Product-page designer embed that connects to the live app and Shopify cart

- assets/dtf-pro-theme.css
  - Matching styles for the hero and embed container

## How to use in Shopify

1. Upload the files in assets and sections into your Shopify theme.
2. Assign the included product template or add the pro sections in the Theme Editor so Shopify uses the animated DTF layout.
3. In the Theme Editor, upload the hero and card images through the image picker settings on the DTF Pro sections.
4. Set the designer app URL to your deployed app URL, for example your live Vercel domain.
5. Make sure the product has at least one live Shopify variant selected.
6. Test the product page by loading the designer, selecting a variant, and sending an item to cart.

## Production checklist

- Shopify Payments or another payment gateway is enabled in Shopify admin.
- The product page uses the DTF product designer section.
- The live app domain is entered in the section setting for the designer URL.
- The product variant selector is visible and active on the product page.
- The cart drawer or cart page is available after add to cart.
- Store policies are published and linked in the storefront.

## Hero button behavior

- Customize button launches the designer in apparel mode.
- Upload button launches in transfer mode and prompts the shopper to add artwork.

## Notes

- The live embed script is loaded from the app at /embed.js.
- The app now supports mode and upload launch parameters safely.
- These theme files are isolated from the Next app, so they do not affect the build pipeline.
