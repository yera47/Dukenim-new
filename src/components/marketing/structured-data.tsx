import { siteUrl, siteName, siteDescription, absoluteUrl } from "@/lib/site";
import { planPrice } from "@/lib/plans";

// Truthful structured data only: no ratings, reviews, or performance claims
// Prices are draft list amounts; no billing period or live checkout is claimed here.
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
          name: "Base",
          price: planPrice.basic,
          priceCurrency: "KZT",
          url: absoluteUrl("/register?plan=basic"),
          description: "Полноценный каталог и заказы без AI-генерации. Период и условия оплаты уточняются до checkout.",
        }, {
          "@type": "Offer",
          name: "Premium",
          price: planPrice.standard,
          priceCurrency: "KZT",
          url: absoluteUrl("/register?plan=standard"),
          description: "AI-фото и product credits. Период цены и live-оплата пока не подтверждены.",
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
