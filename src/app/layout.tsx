import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import {CookieConsent} from "@/components/cookie-consent";

const manrope=Manrope({subsets:["latin","cyrillic"],variable:"--font-manrope",display:"swap"});
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000"),title:{default:"Dukenim — платформа для магазинов",template:"%s · Dukenim"},description:"Витрина, товары, склад, заказы и аналитика в одной платформе.",applicationName:"Dukenim"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ru"><body className={manrope.variable}>{/* THESIS: Dukenim turns one storefront link into a controlled sales operation. OWN-WORLD: Kinetic Atelier Ledger — Black Jade, aged-gold edges, pale-stone interfaces and architectural monoliths. STORY: customer chooses, checkout is clear, owner operates one system. FIRST VIEWPORT: sales promise, real product-to-order motion and a clear seven-day entry. FORM: cinematic commerce, compact operational UI, purposeful motion. FINISH: every state must be usable without a film asset; the Higgsfield film enhances, never replaces, the interface. */}{children}<CookieConsent/></body></html>}
