import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Custom Apparel Studio | True Authentic" },
  description:
    "Customize apparel with True Authentic. Add artwork to the front, back, both sleeves and neck, then save your garment design.",
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
