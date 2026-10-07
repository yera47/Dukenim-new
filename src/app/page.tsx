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
import { LivingSystemVisual } from "@/components/marketing/living-system-visual";
import styles from "./home.module.css";

export const metadata: Metadata = { title: { absolute: siteTitle }, description: siteDescription, alternates: { canonical: "/" }, openGraph: openGraph({ url: "/" }) };

export default function Home() {
  return <main className={styles.home}>
    <StructuredData/>
    <header className={styles.header}><Link href="/" className={styles.logo}><DukenimLogo/></Link><nav aria-label="Основная навигация"><a href="#products">Продукт</a><a href="#system">Как начать</a><a href="#pricing">Тарифы</a></nav><div><Link href="/login">Войти</Link><Link href="/register" className={styles.primary}>Начать бесплатно <ArrowRight size={15}/></Link></div></header>
    <section className={styles.hero}><div className={styles.heroCopy}><small>Ваш магазин. В вашем стиле.</small><h1>Меньше рутины.<br/><span>Больше порядка.</span></h1><p>Покупатель выбирает и оформляет заказ по одной ссылке.<br/>Вы управляете каталогом, заказами и брендом в Dukenim.</p><div className={styles.actions}><Link href="/register?plan=basic" className={styles.primary}>Создать магазин <ArrowRight size={17}/></Link><Link href="/demo" className={styles.secondary}>Смотреть примеры</Link></div><small>Пробный период без списаний и привязки карты</small></div><LivingSystemVisual/><div className={styles.prompt}><b><Sparkles size={20}/> С чего начать?</b><p>После регистрации откроется пошаговая настройка магазина. AI-инструменты не входят в Base; в пробном Premium доступна одна генерация для одного товара.</p><div><Link href="/register?plan=basic"><Package size={15}/>Собрать каталог</Link><a href="#ai"><Sparkles size={15}/>Узнать про AI</a><a href="#system">Как это работает <ArrowRight size={15}/></a></div></div></section>
    <PromoFilm/>
    <section id="products" className={styles.section}><div className={styles.heading}><small>От витрины до заказа</small><h2>Покупателю — удобно.<br/>Вам — ясная картина.</h2><p>Витрина и рабочий кабинет связаны между собой. Не нужно переносить данные между мессенджерами и таблицами.</p></div><RecordedCommerce/><div className={styles.columns}>{[["Каталог","Фото, цены, варианты и наличие — всё в одном месте."],["Заказы","Контакты и состав заказа в одной карточке. Подтвердите в пару нажатий."],["Управление","Скидки, истории и аналитика доступны из кабинета." ]].map(([title,text])=><article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className={styles.section}><div className={styles.heading}><small>Магазины с характером</small><h2>Мода, косметика<br/>и Bulka для еды.</h2><p>Не один безликий шаблон. Каждая витрина собирается под характер бизнеса, его логотип и цвета.</p></div><NicheShowcase/></section>
    <section id="ai" className={styles.section}><div className={styles.heading}><small>AI-инструменты в Premium</small><h2>От двух до пяти вариантов<br/>за один запуск.</h2><p>Base работает без AI. В пробном Premium можно обработать один товар и получить 2–5 вариантов за один запуск. Постоянный пакет станет известен после проверки цены Azure.</p></div><div className={styles.conversation}><div className={styles.question}>Когда списываются кредиты?</div><div className={styles.answer}><Sparkles size={23}/><div><b>Только после успешной генерации.</b><p>Неудачный технический запуск не должен уменьшать баланс. Покупка дополнительных кредитов появится после запуска защищённой оплаты.</p><small>90 изображений — только расчётный пример, не обещанный пакет</small></div></div><Link href="/register?plan=standard" className={styles.primary}>Попробовать Premium <ArrowRight size={16}/></Link><p className={styles.support}><MessageCircle size={18}/>Premium стоит 35 000 ₸ в месяц.</p></div></section>
    <section id="system" className={styles.section}><div className={styles.heading}><small>Понятный старт</small><h2>Один шаг за другим.</h2></div><div className={styles.columns}>{[["Создайте аккаунт","Войдите через Google или email, выберите тариф и тип бизнеса. Деньги не списываются автоматически."],["Соберите каталог","Добавьте логотип, цвета, товары, варианты, цены и способы получения. Каталог и заказы доступны в Base."],["Проверьте и опубликуйте","Откройте витрину глазами покупателя, пройдите корзину и оформление заказа, затем поделитесь ссылкой."]].map(([title,text],i)=><article key={title}><span className={styles.number}>0{i+1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <PricingSection/><MarketingFaq/>
    <section id="security" className={styles.trust}><h2>Ваш бизнес — под вашим контролем.</h2><p>Заказы и настройки хранятся на сервере. Данные разных магазинов разделены. Dukenim не хранит данные банковских карт; онлайн-оплата для покупателей подключается отдельно.</p></section>
    <section className={styles.final}><h2>Начните с первого товара.</h2><p>Создайте магазин и проверьте его в течение семи бесплатных дней.</p><Link href="/register" className={styles.primary}>Создать магазин <ArrowRight size={17}/></Link></section>
    <footer className={styles.footer}><Link href="/" className={styles.logo}><DukenimLogo/></Link><span>Сделано для бизнеса в Казахстане</span><div><Link href="/login">Войти</Link><a href="https://wa.me/77025224262">WhatsApp</a><Link href="/legal/offer">Условия</Link><Link href="/legal/privacy">Конфиденциальность</Link><Link href="/legal/refund">Отмена и возвраты</Link><Link href="/legal/cookies">Cookies</Link></div></footer>
  </main>;
}
