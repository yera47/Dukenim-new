import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Dukenim", description: "Мультитенантная платформа для магазинов" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><head><meta charSet="utf-8" /></head><body>{children}</body></html>;
}
