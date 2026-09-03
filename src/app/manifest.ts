import type { MetadataRoute } from "next";
import { siteName, siteDescription, brand } from "@/lib/site";

// Platform install manifest for dukenim.kz. Individual storefronts serve their own
// scoped manifest from /s/[slug]/manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteName} — платформа для магазинов`,
    short_name: siteName,
    description: siteDescription,
    lang: "ru",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: brand.paleStone,
    theme_color: brand.blackJade,
    categories: ["business", "productivity", "shopping"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
