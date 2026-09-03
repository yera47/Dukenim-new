// Single source of truth for public-facing site identity.
// Used by metadata, the web manifest, robots, sitemap, the OG image and JSON-LD
// so a shared Dukenim link renders consistently wherever it is pasted.

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://dukenim.kz";
export const siteUrl = rawSiteUrl.replace(/\/+$/, "");

export const siteName = "Dukenim";

// Approved Stage 2 sales hierarchy: brand eyebrow, then the customer-facing promise.
export const siteEyebrow = "Dukenim — продажи 24/7";
export const sitePromise = "Одна ссылка вместо сотни сообщений";

export const siteTitle = "Dukenim — продажи 24/7, одна ссылка вместо сотни сообщений";
export const siteDescription =
  "Dukenim — платформа для розничного бизнеса в Казахстане. Покупатель выбирает и оформляет заказ сам, а владелец ведёт товары, остатки, заказы и клиентов в одном кабинете. 7 дней полного доступа без карты.";

export const siteLocale = "ru_KZ";

export const brand = {
  blackJade: "#071B17",
  agedGold: "#B08A50",
  paleStone: "#F4F0E8",
  graphite: "#101713",
  warmSand: "#E8DFD0",
} as const;

export const siteKeywords = [
  "Dukenim",
  "каталог для магазина",
  "интернет-магазин Казахстан",
  "CRM для розницы",
  "витрина Instagram",
  "приём заказов",
  "учёт остатков",
  "магазин без сайта",
  "продажи в Instagram",
  "Kaspi магазин",
];

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return new URL(path, `${siteUrl}/`).toString();
}

// Next.js replaces (does not deep-merge) `openGraph` when a page sets its own, and the
// file-based opengraph-image is not always re-attached to that override — so pages that need
// a distinct title/description spread this to keep type/locale/site and the share image.
export function openGraph(overrides: {
  title?: string;
  description?: string;
  url?: string;
}) {
  return {
    type: "website" as const,
    siteName,
    locale: siteLocale,
    title: overrides.title ?? siteTitle,
    description: overrides.description ?? siteDescription,
    url: overrides.url ?? "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Dukenim — продажи 24/7. Одна ссылка вместо сотни сообщений.",
      },
    ],
  };
}
