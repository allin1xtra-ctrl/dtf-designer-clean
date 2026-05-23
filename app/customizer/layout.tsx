import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload Artwork & Customize DTF Transfers Online | DTF Designer Pro",
  description:
    "Use DTF Designer Pro to upload artwork, customize t-shirts, hoodies, transfers, and gang sheets, then send your custom design directly to checkout.",
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
