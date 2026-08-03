import type{Metadata}from"next";import{Inter,Space_Grotesk}from"next/font/google";import"./globals.css";
const inter=Inter({subsets:["latin","cyrillic"],variable:"--font-inter",display:"swap"});
const space=Space_Grotesk({subsets:["latin"],variable:"--font-space-grotesk",display:"swap"});
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000"),title:{default:"Dukenim",template:"%s · Dukenim"},description:"Мультитенантная SaaS-платформа для магазинов",applicationName:"Dukenim"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ru"><head><meta charSet="utf-8"/></head><body className={`${inter.variable} ${space.variable}`}>{children}</body></html>}
