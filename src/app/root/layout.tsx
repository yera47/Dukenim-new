import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["superadmin"]);
  return (
    <>
      {children}
      <Link href="/root/diagnostics" className="fixed bottom-20 right-5 z-40 rounded-full border border-neutral-300 bg-white px-4 py-3 text-sm font-bold text-neutral-900 shadow-sm">Диагностика</Link>
      <Link href="/admin" className="root-store-switch" aria-label="Открыть кабинет моего магазина">
        <Store size={17} />
        Мой магазин
      </Link>
    </>
  );
}
