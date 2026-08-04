import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope=Manrope({subsets:["latin","cyrillic"],variable:"--font-manrope",display:"swap"});
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000"),title:{default:"Dukenim — платформа для магазинов",template:"%s · Dukenim"},description:"Витрина, товары, склад, заказы и аналитика в одной платформе.",applicationName:"Dukenim"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ru"><body className={manrope.variable}>{/* THESIS: Dukenim is a live commerce control board, refusing the generic green SaaS card grid. OWN-WORLD: mineral white, graphite panels, electric green state signals, segmented operational blocks and tabular figures. STORY: see the whole trade flow, trust its synchronization, enter the cabinet. FIRST VIEWPORT: proposition left, live store board right, primary action above the fold. FORM: operational departure board, assigned direction, seed d1b08fed. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md */}{children}</body></html>}
