import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://dtf-designer-clean-allin1xtra-2553-brandon-hodges-projects.vercel.app/sitemap.xml",
  };
}
