import Link from "next/link";
import { ArrowRight, Palette, Store, UsersRound } from "lucide-react";

const moments = [
  { title: "Выберите основу", text: "Начните с шаблона под свою нишу: одежда, beauty, мебель, аксессуары и другие розничные категории.", icon: Store },
  { title: "Соберите свой вид", text: "Загрузите логотип, добавьте товары и выберите палитру. В Premium доступны акции и AI-инструменты.", icon: Palette },
  { title: "Работайте из одного кабинета", text: "Заказы, остатки и клиенты сохраняют общий контекст. Дополнительные интеграции подключаются отдельно после проверки.", icon: UsersRound },
] as const;

export function LaunchSection() {
  return <section className="story-launch"><div className="container">
    <div className="story-section-intro"><div><h2>Запуск не должен превращаться в проект на месяцы.</h2></div><p>Готовая система помогает начать с главного и оставить пространство для роста бренда.</p></div>
    <div className="launch-sequence">{moments.map(({ title, text, icon: Icon }) => <article key={title}><Icon aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
    <Link href="/register" className="story-text-link">Начать сборку магазина <ArrowRight size={17} /></Link>
  </div></section>;
}
