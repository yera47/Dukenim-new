import { siteUrl, siteName, siteDescription, absoluteUrl } from "@/lib/site";
import { planPrice, planAnnualPrice } from "@/lib/plans";

// Truthful structured data only: no ratings, reviews, or performance claims
// (see marketing/CONTEXT.md evidence rules). Prices mirror the confirmed public tariffs.
export function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: siteName,
        url: siteUrl,
        logo: absoluteUrl("/icon-512.png"),
        description: siteDescription,
        areaServed: { "@type": "Country", name: "Kazakhstan" },
        sameAs: ["https://www.instagram.com/dukenim.kz/"],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: siteName,
        inLanguage: "ru-KZ",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: siteName,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "ru-KZ",
        url: siteUrl,
        publisher: { "@id": `${siteUrl}/#organization` },
        offers: [
          {
            "@type": "Offer",
            name: "Старт",
            price: planPrice.basic,
            priceCurrency: "KZT",
            url: absoluteUrl("/register?plan=basic"),
            description: "Каталог, корзина, заказы и CRM Dukenim. 7 дней полного доступа без карты.",
          },
          {
            "@type": "Offer",
            name: "Старт — год",
            price: planAnnualPrice.basic,
            priceCurrency: "KZT",
            url: absoluteUrl("/register?plan=basic&billing=year"),
          },
          {
            "@type": "Offer",
            name: "Бренд",
            price: planPrice.standard,
            priceCurrency: "KZT",
            url: absoluteUrl("/register?plan=standard"),
            description: "Собственный домен, точная палитра, акции, кампании и AI Studio.",
          },
          {
            "@type": "Offer",
            name: "Бренд — год",
            price: planAnnualPrice.standard,
            priceCurrency: "KZT",
            url: absoluteUrl("/register?plan=standard&billing=year"),
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Server-rendered from static, trusted values only.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
