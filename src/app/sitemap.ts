import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// Public, indexable platform routes only. Tenant storefronts (/s/[slug]) are
// per-owner surfaces and are intentionally excluded from the platform sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/register", priority: 0.9, changeFrequency: "monthly" },
    { path: "/legal/offer", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/cookies", priority: 0.3, changeFrequency: "yearly" },
  ];

  return entries.map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
