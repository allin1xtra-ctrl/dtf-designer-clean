import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "DTF Design Studio | True Authentic" },
  description:
    "Create your custom print layout with True Authentic. Upload artwork, add text, preview placement and download your design.",
  alternates: { canonical: "https://www.ta-apparel.com/pages/customizer" },
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
