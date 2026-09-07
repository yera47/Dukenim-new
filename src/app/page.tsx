import type { Metadata } from "next";
import Link from "next/link";
import { DukenimLogo } from "@/components/dukenim-logo";
import { ArrowRight, Sparkles, Package, MessageCircle } from "lucide-react";
import { PricingSection } from "@/components/marketing/pricing-section";
import { MarketingFaq } from "@/components/marketing/marketing-faq";
import { StructuredData } from "@/components/marketing/structured-data";
import { siteTitle, siteDescription, openGraph } from "@/lib/site";
import { RecordedCommerce } from "@/components/marketing/recorded-commerce";
import { NicheShowcase } from "@/components/marketing/niche-showcase";
import { PromoFilm } from "@/components/marketing/promo-film";
import styles from "./home.module.css";

export const metadata: Metadata = { title: { absolute: siteTitle }, description: siteDescription, alternates: { canonical: "/" }, openGraph: openGraph({ url: "/" }) };

export default function Home() {
  return <main className={styles.home}>
    <StructuredData/>
    <header className={styles.header}><Link href="/" className={styles.logo}><DukenimLogo/></Link><nav aria-label="Главная навигация"><a href="#products">Продукт</a><a href="#system">Как начать</a><a href="#pricing">Тарифы</a></nav><div><Link href="/login">Войти</Link><Link href="/register" className={styles.primary}>Начать бесплатно <ArrowRight size={15}/></Link></div></header>
    <section className={styles.hero}><small>Ваш магазин. В одном пространстве.</small><h1>Меньше переписки.<br/><span>Больше порядка.</span></h1><p>Покупатель выбирает и заказывает по одной ссылке.<br/>Вы управляете каталогом, заказами и бизнесом в Dukenim.</p><div className={styles.actions}><Link href="/register" className={styles.primary}>Создать магазин <ArrowRight size={17}/></Link><Link href="/demo" className={styles.secondary}>Посмотреть пример</Link></div><small>7 дней бесплатно · Без банковской карты</small><div className={styles.prompt}><b><Sparkles size={20}/> С чего начнём ваш магазин?</b><p>После регистрации откроется AI Studio. Опишите магазин, создайте основу каталога и добавьте товары в одном рабочем пространстве.</p><div><Link href="/register"><Package size={15}/>Создать каталог</Link><a href="#ai"><Sparkles size={15}/>Познакомиться с AI Studio</a><a href="#system">Как это работает <ArrowRight size={15}/></a></div></div></section>
    <PromoFilm/>
    <section id="products" className={styles.section}><div className={styles.heading}><small>ОТ ВЫБОРА ДО ЗАКАЗА</small><h2>Покупателю — магазин.<br/>Вам — ясная картина.</h2><p>Витрина и рабочий кабинет связаны между собой. Не нужно переносить каждый заказ из переписки в таблицу.</p></div><RecordedCommerce/><div className={styles.columns}>{[["Каталог","Фото, цены, варианты и наличие. Всё необходимое для выбора."],["Заказы","Контакты и состав заказа в одном месте. Подтверждайте и меняйте статус."],["Управление","На «Бренде» — остатки, клиенты и аналитика, связанные с продажами."]].map(([title,text])=><article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className={styles.section}><div className={styles.heading}><small>ПОД ВАШ АССОРТИМЕНТ</small><h2>Не один макет<br/>для любого бизнеса.</h2><p>Тип бизнеса меняет структуру и подсказки. Переключите примеры: покупателю остаётся знакомый путь — посмотреть, выбрать и заказать.</p></div><NicheShowcase/></section>
    <section id="ai" className={styles.section}><div className={styles.heading}><small>AI STUDIO</small><h2>От вашей идеи —<br/>к первому каталогу.</h2><p>AI Studio встречает вас после регистрации: предложит разделы и тексты. Проверьте предложение, сохраните разделы и добавьте свои товары. Поддержка человека всегда рядом.</p></div><div className={styles.conversation}><div className={styles.question}>Помоги описать новую коллекцию для моего магазина.</div><div className={styles.answer}><Sparkles size={23}/><div><b>Начнём с того, что важно покупателю.</b><p>Расскажите о товарах, аудитории и стиле бренда. AI Studio подготовит заголовок, описание и текст кнопки для вашей витрины.</p><small>Пример сценария · результат требует проверки</small></div></div><Link href="/register" className={styles.primary}>Начать с AI Studio <ArrowRight size={16}/></Link><p className={styles.support}><MessageCircle size={18}/>Нужен человек? Поддержка доступна отдельно из кабинета и AI Studio.</p></div></section>
    <section id="system" className={styles.section}><div className={styles.heading}><small>ПОНЯТНЫЙ СТАРТ</small><h2>Один шаг за другим.</h2></div><div className={styles.columns}>{[["Создайте аккаунт","Войдите через Google или email. Выберите тип бизнеса и подходящий тариф."],["Соберите каталог","В AI Studio опишите свой бизнес, сохраните основу и разделы каталога. Добавьте фотографии, цены и условия получения."],["Проверьте и поделитесь","Откройте витрину как покупатель, проверьте путь заказа и разместите ссылку в Instagram."]].map(([title,text],i)=><article key={title}><span className={styles.number}>0{i+1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <PricingSection/><MarketingFaq/>
    <section id="security" className={styles.trust}><h2>Ваши данные — под вашим контролем.</h2><p>Доступ к магазину проверяется на сервере. Данные разных магазинов разделены. Данные банковских карт обрабатывает платёжный провайдер.</p></section>
    <section className={styles.final}><h2>Начните с первого товара.</h2><p>Соберите магазин и проверьте его в течение 7 бесплатных дней.</p><Link href="/register" className={styles.primary}>Создать магазин <ArrowRight size={17}/></Link></section>
    <footer className={styles.footer}><Link href="/" className={styles.logo}><DukenimLogo/></Link><span>Для бизнеса в Казахстане</span><div><Link href="/login">Войти</Link><Link href="/legal/offer">Оферта</Link><Link href="/legal/privacy">Конфиденциальность</Link><Link href="/legal/cookies">Cookies</Link></div></footer>
  </main>;
}
