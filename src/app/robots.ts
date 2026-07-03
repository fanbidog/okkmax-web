import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// 放行公开页,禁抓 API 与登录后私有页;指向 sitemap。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/me", "/points", "/favorites", "/reset", "/uploads/", "/r/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
