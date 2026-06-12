# Staging Storage Setup

This staging customizer uses Cloudinary only for preview/staging asset hosting. It must not call the production upload route, Shopify checkout, or Shopify Admin APIs.

## Required Environment Variables

Add these server-side environment variables:

```txt
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Optional staging folder override:

```txt
CLOUDINARY_STAGING_FOLDER=dtf-designer-pro/staging/customizer
```

The folder value must start with `dtf-designer-pro/staging/customizer`. If it does not, the app falls back to the default staging folder. This prevents shared Cloudinary credentials from writing into old app or production folders.

## Local Setup

Add the variables to `.env.local` in the project root.

Expected local path:

```txt
C:\Users\Truea\OneDrive\Documents\Playground\dtf-designer-clean\.env.local
```

Do not commit `.env.local`, `.env`, or any secret-bearing environment file.

Restart the local Next.js dev server after changing `.env.local`. Next.js reads env files when the server process starts.

## Vercel Preview/Staging Setup

In Vercel, add the variables to the Preview or staging environment for this project.

Do not add the Cloudinary API secret to client-exposed variables. The staging upload route reads secrets server-side only.

## Status Check

The staging upload route exposes a safe status check:

```txt
GET /api/customizer/staging-upload
```

It returns whether Cloudinary staging storage is configured, but never returns secret values.

The response also includes:

```json
{
  "cloudinaryConfigured": false,
  "hasCloudName": false,
  "hasApiKey": false,
  "hasApiSecret": false,
  "storageNamespace": "dtf-designer-pro/staging/customizer"
}
```

## Expected Missing-Env Behavior

When Cloudinary env vars are missing:

- `Test Staging Upload` returns metadata and a warning only.
- Admin mockup upload returns metadata and a warning only.
- `Test Save Design JSON` returns metadata and a warning only.
- `Test Generate Preview Image` returns metadata and a warning only.
- No hosted URL is returned.
- The preview remains usable.
- Shopify, checkout, and production upload are not called.

## Expected Configured-Env Behavior

When Cloudinary env vars are configured:

- Artwork uploads return `artworkOriginalUrl`.
- Admin mockup uploads return hosted mockup URLs.
- Design JSON uploads return `designJsonUrl`.
- Preview image uploads return `previewImageUrl`.
- Assets are stored in staging folders by upload purpose.
- Shopify, checkout, and production upload remain disconnected.

## Manual QA

1. Start the staging app locally.
2. Open `/api/customizer/staging-upload` and confirm `cloudinaryConfigured`.
3. Open `/customizer-preview`.
4. Upload artwork and run `Test Staging Upload`.
5. Run `Test Save Design JSON`.
6. Run `Test Generate Preview Image`.
7. Run `Test Save Payload` and confirm only hosted HTTP URLs are included when available.
8. Open `/admin/customizer-setup`.
9. Test each mockup upload control.
10. Save staging config and load it in `/customizer-preview`.

This setup is staging-only until a separate production approval connects Shopify and checkout.
