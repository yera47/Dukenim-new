import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/root",
          "/onboarding",
          "/auth/",
          "/api/",
          "/forgot-password",
          "/reset-password",
          "/demo/",
          "/s/*/cart",
          "/s/*/checkout",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
