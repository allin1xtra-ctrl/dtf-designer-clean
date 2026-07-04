"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const ADMIN_LINKS = [
  ["Dashboard", "/admin"],
  ["Templates", "/admin/templates"],
  ["Mockups / Product Types", "/admin/product-types"],
  ["Media Library", "/admin/media"],
  ["Product Images", "/admin/product-images"],
  ["Ghost 360", "/admin/product-images/ghost-360"],
  ["Customizer Setup", "/admin/customizer-setup"],
  ["AI Doctor", "/admin/ai-doctor"],
] as const;

export default function AdminNav() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/session/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <nav className="border-b border-[#1e343c] bg-[#071015] px-4 py-3 text-neutral-100">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <Link href="/admin" className="text-sm font-black uppercase tracking-[0.18em] text-cyan-300">
          DTF Admin
        </Link>
        <div className="flex flex-wrap gap-2">
          {ADMIN_LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-md border border-[#2c424a] bg-[#0b1519] px-3 py-1.5 text-xs font-semibold text-neutral-200 transition hover:border-cyan-300">
              {label}
            </Link>
          ))}
          <button type="button" onClick={logout} className="rounded-md border border-red-400/50 bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-100 transition hover:border-red-300">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
