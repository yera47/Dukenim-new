import Link from "next/link";
import { DukenimLogo } from "@/components/dukenim-logo";
import { operatorDetails } from "@/lib/legal-policy";

const legalLinks = [
  ["Условия", "/legal/offer"],
  ["Конфиденциальность", "/legal/privacy"],
  ["Отмена и возвраты", "/legal/refund"],
  ["Cookies", "/legal/cookies"],
] as const;

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen bg-[var(--surface)]">
    <header className="border-b border-[var(--line)]">
      <div className="container flex min-h-18 flex-wrap items-center justify-between gap-4 py-3">
        <Link href="/"><DukenimLogo/></Link>
        <nav aria-label="Юридические документы" className="flex flex-wrap items-center justify-end gap-4 text-sm">
          {legalLinks.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          <a href={operatorDetails.supportWhatsAppUrl}>WhatsApp</a>
        </nav>
      </div>
    </header>
    <article className="legal-copy container max-w-3xl py-14">{children}</article>
  </main>;
}
