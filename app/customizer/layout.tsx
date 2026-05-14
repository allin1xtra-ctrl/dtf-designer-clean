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
      {/* Hide the global site footer and lock the body to the viewport so the
          canvas workspace fills exactly 100dvh with no black gaps. */}
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bangers&family=Bebas+Neue&family=Black+Ops+One&family=Dancing+Script:wght@400;700&family=Graduate&family=Great+Vibes&family=Inter:wght@300;400;500;700;900&family=Lato:wght@300;400;700;900&family=League+Spartan:wght@400;700;900&family=Lobster&family=Montserrat:wght@400;500;700;900&family=Nunito:wght@400;600;700;900&family=Open+Sans:wght@400;600;700;800&family=Oswald:wght@400;500;700&family=Pacifico&family=Permanent+Marker&family=Poppins:wght@400;500;700;900&family=Raleway:wght@400;500;700;900&family=Racing+Sans+One&family=Roboto:wght@300;400;500;700;900&family=Russo+One&family=Work+Sans:wght@400;500;700;900&display=swap");
        html, body { height: 100%; overflow: hidden; }
        body > footer { display: none; }
      `}</style>
      {children}
    </>
  );
}
