import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom Design Studio | Your Favorite T-Shirt",
  description:
    "Upload artwork, use editable templates, preview mockups, and prepare DTF transfers, gang sheets, and apparel designs.",
};

export default function CustomizerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* Keep footer hidden in the customizer route, but do not lock global
          page scrolling to avoid Shopify host-page clipping issues. */}
      <style>{`
        body > footer { display: none; }
      `}</style>
      {children}
    </>
  );
}
