import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DTF Designer Pro | Your Favorite DTF Plug",
  description:
    "Create custom DTF transfers, apparel designs, sleeve prints, neck labels, and live product previews before checkout.",
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
