import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/settings";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The admin panel and internal APIs should never be crawled.
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
