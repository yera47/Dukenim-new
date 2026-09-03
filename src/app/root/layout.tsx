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
      <Link href="/admin" className="root-store-switch" aria-label="Открыть кабинет моего магазина">
        <Store size={17} />
        Мой магазин
      </Link>
    </>
  );
}
