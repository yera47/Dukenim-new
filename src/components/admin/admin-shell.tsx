"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  ExternalLink,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { logout } from "@/app/login/actions";
import { TrialTimer } from "./trial-timer";

const nav = [
  ["/admin", "Обзор", LayoutDashboard],
  ["/admin/catalog", "Каталог", Package],
  ["/admin/orders", "Заказы", ReceiptText],
  ["/admin/stock", "Склад", Boxes],
  ["/admin/analytics", "Аналитика", BarChart3],
  ["/admin/customers", "Клиенты", Users],
  ["/admin/ai-studio", "AI Studio", Sparkles],
  ["/admin/requests", "Поддержка", MessageSquare],
  ["/admin/integrations", "Интеграции", Link2],
  ["/admin/plan", "Тариф", WalletCards],
  ["/admin/settings", "Настройки", Settings],
] as const;

const mobilePrimary = nav.slice(0, 4);
const standardOnly = new Set(["/admin/stock", "/admin/analytics", "/admin/customers"]);

type AdminShellProps = {
  children: React.ReactNode;
  role: "owner" | "superadmin";
  tenant: {
    name: string;
    slug: string;
    plan: string;
    status: string;
    trialEndsAt: string | null;
  };
};

function isCurrent(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export function AdminShell({ children, role, tenant }: AdminShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const section = nav.find(([href]) => isCurrent(pathname, href));
  const isLocked = (href: string) => role === "owner" && tenant.status !== "trial" && tenant.plan === "basic" && standardOnly.has(href);

  return (
    <div className="admin-frame min-h-[100dvh]">
      <aside className="admin-sidebar panel-dark fixed inset-y-0 left-0 z-30 hidden w-72 p-5 md:flex md:flex-col">
        <Link href="/admin" className="admin-brand flex items-center gap-3 text-xl font-extrabold">
          <span className="tumar-mark"><Store size={18} /></span>
          <span className="min-w-0 truncate">{tenant.name}</span>
        </Link>
        <div className="data-label mt-3 pl-13 text-white/38">ПАНЕЛЬ МАГАЗИНА</div>

        <nav className="admin-desktop-nav mt-8 flex-1 space-y-1" aria-label="Разделы кабинета">
          {nav.map(([href, label, Icon]) => {
            const active = isCurrent(pathname, href);
            const locked = isLocked(href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}>
                <Icon size={18} />
                <span>{label}</span>
                {locked ? <LockKeyhole size={13} className="ml-auto" aria-label="Доступно на тарифе Бренд" /> : active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {role === "superadmin" && (
          <Link href="/root" className="admin-root-link">
            <ShieldCheck size={17} />
            Управление платформой
          </Link>
        )}
        <Link href={`/s/${tenant.slug}`} className="admin-store-link">
          <span>Открыть витрину</span>
          <ExternalLink size={16} />
        </Link>
        <form action={logout} className="mt-2">
          <button className="admin-logout"><LogOut size={17} />Выйти</button>
        </form>
      </aside>

      <div className="pb-24 md:pl-72 md:pb-0">
        <header className="admin-topbar sticky top-0 z-20 flex h-18 items-center justify-between border-b border-[var(--line)] px-5 md:px-8">
          <div className="min-w-0">
            <small>{section?.[1] ?? "Кабинет"}</small>
            <div className="flex min-w-0 items-center gap-2.5">
              <b className="truncate">{tenant.name}</b>
              <span className="badge hidden sm:inline-flex">{tenant.plan.toUpperCase()}</span>
              {tenant.status === "trial" && tenant.trialEndsAt && <TrialTimer endsAt={tenant.trialEndsAt} />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {role === "superadmin" && <Link href="/root" className="admin-root-chip"><ShieldCheck size={15} />Root</Link>}
            <span className="admin-avatar">{tenant.name.slice(0, 2).toUpperCase()}</span>
          </div>
        </header>
        <main className="p-5 md:p-8">{children}</main>
      </div>

      <nav aria-label="Основная навигация" className="admin-mobile-nav md:hidden">
        {mobilePrimary.map(([href, label, Icon]) => {
          const active = isCurrent(pathname, href);
          const locked = isLocked(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}>
              <Icon size={19} />
              <span>{label}{locked && " · Бренд"}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="admin-mobile-sheet" className={nav.slice(4).some(([href]) => isCurrent(pathname, href)) ? "is-active" : undefined}>
          <Menu size={19} />
          <span>Ещё</span>
        </button>
      </nav>

      {menuOpen && (
        <div className="admin-sheet-layer md:hidden" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setMenuOpen(false)}>
          <section id="admin-mobile-sheet" className="admin-sheet" role="dialog" aria-modal="true" aria-label="Все разделы кабинета">
            <div className="admin-sheet-head">
              <div><small>Все инструменты</small><b>{tenant.name}</b></div>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Закрыть меню"><X size={20} /></button>
            </div>
            <nav>
              {nav.slice(4).map(([href, label, Icon]) => {
                const active = isCurrent(pathname, href);
                const locked = isLocked(href);
                return <Link key={href} href={href} className={active ? "is-active" : undefined}><Icon size={19} /><span>{label}{locked && <small>Тариф Бренд</small>}</span>{locked ? <LockKeyhole size={15} aria-label="Требуется тариф Бренд" /> : <ChevronRight size={16} />}</Link>;
              })}
            </nav>
            <div className="admin-sheet-actions">
              {role === "superadmin" && <Link href="/root"><ShieldCheck size={17} />Управление платформой</Link>}
              <Link href={`/s/${tenant.slug}`}><ExternalLink size={17} />Открыть витрину</Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
