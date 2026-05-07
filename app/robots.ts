import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/static/", "/admin/", "/admin/*"],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/image-sitemap.xml`],
    host: SITE_URL,
  };
}
