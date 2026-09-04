import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight, ShieldCheck } from "lucide-react";
import { HeroArt } from "@/components/marketing/hero-art";
import { PricingSection } from "@/components/marketing/pricing-section";
import { LaunchSection } from "@/components/marketing/launch-section";
import { AiStudioSection } from "@/components/marketing/ai-studio-section";
import { MarketingFaq } from "@/components/marketing/marketing-faq";
import { StructuredData } from "@/components/marketing/structured-data";
import { siteTitle, siteDescription, openGraph } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: siteTitle },
  description: siteDescription,
  alternates: { canonical: "/" },
  openGraph: openGraph({ url: "/" }),
};

const systemRows = [
  ["Витрина", "Покупатель выбирает товар в магазине, который выглядит как ваш бренд."],
  ["Покупка", "Каталог, корзина и оформление заказа не рассыпаются по разным сервисам."],
  ["Кабинет", "Товары, остатки, заказы и клиенты возвращаются владельцу в одну CRM."],
] as const;

export default function Home() {
  return <main className="nomad-site dukenim-story">
    <StructuredData />
    <header className="nomad-header fixed inset-x-0 top-0 z-50 border-b border-[#2e3633] bg-[color:rgb(7_11_11/.94)] text-[#f2ede0] backdrop-blur-xl"><div className="container flex h-20 items-center justify-between gap-4">
      <Link href="/" aria-label="Dukenim — на главную" className="flex shrink-0 items-center"><Image src="/brand/dukenim-flat-master-reversed.png" alt="Dukenim" width={310} height={104} priority className="h-auto w-[154px]" /></Link>
      <nav className="desktop-only flex items-center gap-7 text-sm font-bold text-[#dbd6c9]"><a href="#products">Продукт</a><a href="#system">Как работает</a><a href="#pricing">Тарифы</a><a href="#security">Безопасность</a></nav>
      <div className="flex shrink-0 items-center gap-2"><Link href="/login" className="desktop-only px-4 py-2 text-sm font-bold text-[#e5e0d4]">Войти</Link><Link href="/register" className="btn btn-primary">7 дней бесплатно <ArrowRight size={17} /></Link></div>
    </div></header>

    <section className="landing-hero"><div className="container landing-hero-grid"><div className="landing-hero-copy">
      <p className="landing-kicker">DUKENIM — ПРОДАЖИ 24/7</p><h1 className="landing-hero-title">Одна ссылка<br />вместо сотни<br /><span className="text-[#c7a35e]">сообщений.</span></h1>
      <p className="mt-7 max-w-[48ch] text-lg leading-8">Покупатель выбирает и заказывает сам. Вы управляете товарами, остатками и заказами в одном кабинете.</p>
      <div className="landing-hero-actions"><Link href="/register" className="btn btn-primary">Создать магазин <ArrowRight size={18} /></Link><a href="#system" className="btn border-[#d9c6a0]/30 bg-transparent text-[#eee8dd]">Посмотреть систему</a></div>
      <div className="landing-hero-proof"><span className="flex items-center gap-2"><Check size={17} className="text-[#c7a35e]" />7 дней без оплаты</span><span className="flex items-center gap-2"><Check size={17} className="text-[#c7a35e]" />Без банковской карты</span></div>
    </div><HeroArt /></div></section>

    <section id="products" className="story-products"><div className="container"><div className="story-section-intro"><div><h2>Один магазин — вместо хаоса из чатов, таблиц и ссылок.</h2></div><p>Покупатель видит понятный путь к заказу. Владелец — всё, что происходит с бизнесом.</p></div><div className="story-product-rail"><article><b>Витрина</b><span>Ваш адрес, товары и оформление — в одном месте.</span><i>Готовый шаблон становится основой, а не ограничением.</i></article><article><b>Каталог</b><span>Товар ведёт к карточке, корзине и заказу без лишних шагов.</span><i>Фото и товары не ограничены тарифом.</i></article><article><b>CRM</b><span>Каждый заказ становится рабочей задачей для команды.</span><i>Остатки и клиенты сохраняют контекст каждой продажи.</i></article></div></div></section>

    <section id="system" className="story-system"><div className="container story-system-grid"><div className="story-system-copy"><h2>От первого товара до заказа — в одном маршруте.</h2><Link className="story-text-link" href="/register">Создать свой магазин <ArrowRight size={17} /></Link></div><div className="story-ledger">{systemRows.map(([name, text], index) => <div key={name} className={index === 1 ? "is-current" : ""}><span>{name}</span><p>{text}</p><ChevronRight size={22} /></div>)}</div></div></section>

    <LaunchSection />
    <AiStudioSection />
    <PricingSection />

    <MarketingFaq />

    <section id="security" className="story-security"><div className="container story-security-grid"><div><ShieldCheck size={42} /><h2>Данные магазина остаются разделёнными и защищёнными.</h2></div><div><p>Доступы проверяются на сервере, а данные одного магазина не доступны другому. Dukenim не хранит данные банковских карт.</p><div className="story-security-points"><span><Check size={18} />Изоляция данных магазинов</span><span><Check size={18} />Роли владельца и сотрудников</span><span><Check size={18} />Безопасное подключение оплаты</span></div></div></div></section>

    <section className="story-final"><div className="container"><p>Проверьте путь покупателя до того, как начнёте платить.</p><h2>Соберите витрину, которой удобно управлять завтра.</h2><Link href="/register" className="btn">Начать 7 дней бесплатно <ArrowRight size={18} /></Link></div></section>
    <footer className="story-footer"><div className="container story-footer-grid"><div><b>DUKENIM</b><p>Витрина, каталог, CRM и приложение для роста розничного бизнеса в Казахстане.</p></div><div><Link href="/register">Создать каталог на Dukenim <ArrowRight size={16} /></Link><Link href="/login">Войти в кабинет</Link></div><div><Link href="/legal/offer">Оферта</Link><Link href="/legal/privacy">Конфиденциальность</Link><Link href="/legal/cookies">Cookies</Link></div></div></footer>
  </main>;
}
