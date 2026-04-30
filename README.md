This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Performance Optimization Checklist (Shopify/Next.js)

### 1. Fix Forced Reflows (Layout Thrashing)
- Refactor all DOM reads (offsetHeight, getBoundingClientRect) to occur before DOM writes (style changes, element insertion).
- If a read must happen after a write, wrap it in requestAnimationFrame().
- Example:
  ```js
  // BAD
  element.style.height = '100px';
  const height = element.offsetHeight; // Forces reflow

  // GOOD
  const height = element.offsetHeight;
  element.style.height = '100px';

  // Or, if you must read after write:
  element.style.height = '100px';
  requestAnimationFrame(() => {
    const height = element.offsetHeight;
    // ...use height
  });
  ```

### 2. Reduce LCP Render Delay
- Use SSR (getServerSideProps/getStaticProps) for H1 and main layout.
- Code split non-critical components (React.lazy, dynamic()).
- Defer non-essential JS until after main content renders.

### 3. Stabilize Layout Shifts (CLS)
- Pre-allocate space for iframes and dynamic containers (min-height, aspect-ratio, or skeleton loaders).
- Example:
  ```jsx
  <div style={{ minHeight: 900, aspectRatio: '4/3' }}>
    {isLoaded ? <iframe ... /> : <Skeleton />}
  </div>
  ```

### 4. Remove Legacy JavaScript
- Set build targets to esnext or modern browsers in Babel/Vite/Next.js config.
- Use browserslist: ["defaults", "not IE 11", "not dead"] in package.json.
- Remove polyfills for features supported by your target browsers.
- Use <script type="module"> for modern JS and <script nomodule> for legacy fallback if needed.

---

## Shopify Admin Performance Fixes (Implementation Plan)

### 1. Eliminate Forced Reflows (Layout Thrashing)
- Audit setTopBarOffset and setGlobalRibbonHeight in render-common-d44506a258ea.js.
- Refactor: Ensure all DOM reads (offsetHeight, getBoundingClientRect) happen before DOM writes (style changes, element insertion).
- If a read must happen after a write, wrap it in requestAnimationFrame().

### 2. Optimize LCP & Reduce Render Delay
- Ensure H1 and main content are rendered server-side (SSR), not injected by JS.
- Inline critical CSS for header/above-the-fold content.
- Defer non-critical JS until after main content is visible.

### 3. Fix Layout Shifts (CLS)
- Reserve space for iframes and dynamic containers using min-height or aspect-ratio.
- Example: `.dynamic-container { min-height: 900px; }`

### 4. Remove Legacy JavaScript
- Update build config (Vite, Babel, Next.js) to target modern browsers (esnext or similar).
- In package.json, use: `"browserslist": ["defaults", "not IE 11", "not dead"]`
- Remove unnecessary polyfills for supported features.

---

> For more details, see the performance diagnostics and recommendations in your project documentation or ask your AI assistant for targeted code reviews.
