import { siteUrl, siteName, siteDescription, absoluteUrl } from "@/lib/site";
import { planPrice } from "@/lib/plans";

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
        offers: [{
          "@type": "Offer",
          name: "Каталог",
          price: planPrice.basic,
          priceCurrency: "KZT",
          url: absoluteUrl("/register?plan=basic&billing=month"),
          description: "Все функции Dukenim в одном тарифе. 7 дней бесплатно, затем ежемесячная оплата после подтверждения владельца.",
        }],
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
