import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { CookieConsent } from "@/components/cookie-consent";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { siteUrl, siteName, siteTitle, siteDescription, siteLocale, siteKeywords, brand } from "@/lib/site";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteTitle, template: "%s · Dukenim" },
  description: siteDescription,
  applicationName: siteName,
  keywords: siteKeywords,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: "business",
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName,
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    locale: siteLocale,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "512x512", type: "image/png" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brand.paleStone },
    { media: "(prefers-color-scheme: dark)", color: brand.blackJade },
  ],
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={manrope.variable}>
        {/* THESIS: Dukenim turns one storefront link into a controlled sales operation. OWN-WORLD: Kinetic Atelier Ledger — Black Jade, aged-gold edges, pale-stone interfaces and architectural monoliths. STORY: customer chooses, checkout is clear, owner operates one system. FIRST VIEWPORT: sales promise, real product-to-order motion and a clear seven-day entry. FORM: cinematic commerce, compact operational UI, purposeful motion. FINISH: every state must be usable without a film asset; the Higgsfield film enhances, never replaces, the interface. */}
        {children}
        <ServiceWorkerRegistration />
        <CookieConsent />
      </body>
    </html>
  );
}
