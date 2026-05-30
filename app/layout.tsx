import type { Metadata } from "next";
import localFont from "next/font/local";
import GangSheetCustomizerUiPatch from "./components/GangSheetCustomizerUiPatch";
import "./globals.css";

const geistSans = localFont({
  src: "../public/fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "../public/fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dtf-designer-clean.vercel.app"),
  title: {
    default: "Custom DTF Transfers, Gang Sheets & Custom Apparel | Your Favorite DTF Plug",
    template: "%s | Your Favorite DTF Plug",
  },
  description:
    "Order premium custom DTF transfers, gang sheets, custom t-shirts, and hoodies with no minimums, vibrant color, fast turnaround, and easy online artwork upload.",
  openGraph: {
    type: "website",
    title: "Custom DTF Transfers, Gang Sheets & Custom Apparel | Your Favorite DTF Plug",
    description:
      "Order premium custom DTF transfers, gang sheets, custom t-shirts, and hoodies with no minimums, vibrant color, fast turnaround, and easy online artwork upload.",
    url: "https://dtf-designer-clean.vercel.app",
    siteName: "Your Favorite DTF Plug",
  },
  twitter: {
    card: "summary_large_image",
    title: "Custom DTF Transfers, Gang Sheets & Custom Apparel | Your Favorite DTF Plug",
    description:
      "Order premium custom DTF transfers, gang sheets, custom t-shirts, and hoodies with no minimums, vibrant color, fast turnaround, and easy online artwork upload.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-white">
        <GangSheetCustomizerUiPatch />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-white/10 bg-slate-950/95 px-4 py-4 text-sm text-slate-300">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <span>Your Favorite DTF Plug</span>
            <nav className="flex flex-wrap gap-4">
              <a href="/terms" className="hover:text-white">Terms</a>
              <a href="/privacy" className="hover:text-white">Privacy</a>
              <a href="/refund-policy" className="hover:text-white">Refunds</a>
              <a href="/shipping-policy" className="hover:text-white">Shipping</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
