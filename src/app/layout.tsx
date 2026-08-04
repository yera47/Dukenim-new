import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import {CookieConsent} from "@/components/cookie-consent";

const manrope=Manrope({subsets:["latin","cyrillic"],variable:"--font-manrope",display:"swap"});
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000"),title:{default:"Dukenim — платформа для магазинов",template:"%s · Dukenim"},description:"Витрина, товары, склад, заказы и аналитика в одной платформе.",applicationName:"Dukenim"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ru"><body className={manrope.variable}>{/* THESIS: Kazakh modernism turns websites, apps and CRM into one ownable business architecture. OWN-WORLD: steppe light, limestone, rich emerald, bronze tumar geometry and kinetic interface planes. STORY: understand the system, start a seven-day trial, configure a real business. FIRST VIEWPORT: monumental promise left, responsive 3D product architecture right, trial action above the fold. FORM: Steppe Light plus Tumar, user approved. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md */}{children}<CookieConsent/></body></html>}
