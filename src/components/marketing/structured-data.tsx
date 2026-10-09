import { siteUrl, siteName, siteDescription, absoluteUrl } from "@/lib/site";

// Truthful structured data only: no ratings, reviews, or performance claims
// Public price is the owner-confirmed monthly Catalog offer. Live automatic billing remains disabled until provider setup is verified.
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
          price: 24_900,
          priceCurrency: "KZT",
          url: absoluteUrl("/register?plan=basic"),
          description: "Единый тариф со всеми функциями магазина. 7 дней бесплатно, оплата подключается отдельно.",
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
