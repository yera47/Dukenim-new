"use client";

import { ArrowLeft, Check, ChevronRight, Minus, Plus, ShoppingBag } from "lucide-react";
import { PointerEvent, useEffect, useRef, useState } from "react";
import { money } from "@/lib/demo-data";

type Variant = "start" | "brand";
type Screen = "catalog" | "product" | "cart";

const plans: Record<Variant, { name: string; monthly: number; description: string; points: string[] }> = {
  start: { name: "Старт", monthly: 24900, description: "Готовая основа, с которой магазин начинает продавать без разового взноса за разработку.", points: ["Шаблоны «Ателье» и «Маркет" + "»", "Готовые палитры и логотип", "Каталог, CRM и сотрудники"] },
  brand: { name: "Бренд", monthly: 34900, description: "Витрина с собственной подачей, доменом, акциями и управляемыми AI-черновиками.", points: ["Шаблоны «Журнал» и «Галерея" + "»", "Свой домен и точная палитра", "Акции, кампании и AI Studio"] },
};

const products = {
  start: ["Поло", "Рубашка", "Свитер", "Брюки"],
  brand: ["Куртка", "Сумка", "Трикотаж", "Ботинки"],
};

function PhoneStore({ variant, screen, setScreen }: { variant: Variant; screen: Screen; setScreen: (screen: Screen) => void }) {
  const custom = variant === "brand";
  const item = custom ? "Куртка Harper" : "Поло Essential";
  const price = custom ? "42 900 ₸" : "18 900 ₸";
  const back = () => setScreen(screen === "cart" ? "product" : "catalog");
  return <div className={`catalog-store catalog-store-${variant} catalog-store-${screen}`}>
    <header><button aria-label="Вернуться" onClick={back} className={screen === "catalog" ? "is-hidden" : ""}><ArrowLeft size={13}/></button><b>{custom ? "NOOR STUDIO" : "DUKENIM STORE"}</b><button aria-label="Открыть корзину" onClick={() => setScreen("cart")}><ShoppingBag size={13}/><i/></button></header>
    {screen === "catalog" && <div className="catalog-screen-catalog"><div className="catalog-scroll-cue" aria-hidden="true"/><div className="catalog-banner">{custom ? <><small>ЛИМИТИРОВАННАЯ КОЛЛЕКЦИЯ</small><strong>Тепло<br/>в деталях.</strong><span>Смотреть историю <ChevronRight size={12}/></span></> : <><small>НОВАЯ КОЛЛЕКЦИЯ</small><strong>На каждый день</strong><span>Вещи, которые остаются с вами</span></>}</div><div className="catalog-product-grid">{products[variant].map((name, index) => <button key={name} onClick={() => setScreen("product")} className={`catalog-product-tile catalog-product-${index}`}><span/><b>{name}</b><small>{["18 900 ₸", "24 900 ₸", "22 500 ₸", "29 900 ₸"][index]}</small></button>)}</div></div>}
    {screen === "product" && <div className="catalog-screen-product"><div className="catalog-product-hero"><span/><em>{custom ? "−20% только сегодня" : "В наличии"}</em></div><div className="catalog-product-copy"><small>{custom ? "NOOR / OUTERWEAR" : "БАЗОВАЯ КОЛЛЕКЦИЯ"}</small><h3>{item}</h3><p>{price}</p><div className="catalog-sizes"><button>S</button><button className="active">M</button><button>L</button></div><button className="catalog-buy" onClick={() => setScreen("cart")}>В корзину <Plus size={14}/></button></div></div>}
    {screen === "cart" && <div className="catalog-screen-cart"><h3>Корзина <small>1 товар</small></h3><div className="catalog-cart-product"><span/><div><b>{item}</b><small>Размер M · Графит</small><strong>{price}</strong></div><button aria-label="Уменьшить количество"><Minus size={12}/></button><b>1</b><button aria-label="Увеличить количество"><Plus size={12}/></button></div><div className="catalog-cart-total"><span>Итого</span><b>{price}</b></div><button className="catalog-buy" onClick={() => setScreen("catalog")}>Перейти к оформлению <ChevronRight size={14}/></button></div>}
  </div>;
}

export function CatalogPlanShowcase() {
  const [variant, setVariant] = useState<Variant>("start");
  const [screen, setScreen] = useState<Screen>("catalog");
  const [paused, setPaused] = useState(false);
  const scene = useRef<HTMLDivElement>(null);
  const plan = plans[variant];

  useEffect(() => { setScreen("catalog"); }, [variant]);
  useEffect(() => {
    if (paused) return;
    const order: Screen[] = ["catalog", "product", "cart"];
    const timer = window.setInterval(() => setScreen(current => order[(order.indexOf(current) + 1) % order.length]), 3400);
    return () => window.clearInterval(timer);
  }, [paused]);
  function tilt(event: PointerEvent<HTMLDivElement>) { const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width - .5; const y = (event.clientY - rect.top) / rect.height - .5; event.currentTarget.style.setProperty("--tilt-x", `${x * 5}deg`); event.currentTarget.style.setProperty("--tilt-y", `${y * -4}deg`); }
  function resetTilt(event: PointerEvent<HTMLDivElement>) { event.currentTarget.style.setProperty("--tilt-x", "0deg"); event.currentTarget.style.setProperty("--tilt-y", "0deg"); }

  return <section id="storefront" className="catalog-offer"><div className="container catalog-offer-grid"><div className="catalog-offer-copy"><h2>Не картинка.<br/>Живая витрина.</h2><p>Покупатель видит каталог, акцию, карточку товара и путь до покупки. Выбирайте уровень подачи — без скрытой стоимости создания.</p><div className="catalog-tabs" role="tablist" aria-label="Выбор варианта витрины">{(Object.keys(plans) as Variant[]).map(item => <button key={item} type="button" role="tab" aria-selected={variant === item} onClick={() => setVariant(item)} className={variant === item ? "is-active" : ""}>{plans[item].name}</button>)}</div><div className="catalog-plan-detail"><div><span>ПОДКЛЮЧЕНИЕ</span><strong>0 ₸</strong><small>без разовой цены за запуск</small></div><div><span>ПЛАТФОРМА</span><strong>{money(plan.monthly)}</strong><small>в месяц после 7 дней</small></div></div><p className="catalog-plan-description">{plan.description}</p><ul>{plan.points.map(point => <li key={point}><Check size={18}/>{point}</li>)}</ul></div><div ref={scene} className="catalog-phone-stage" aria-live="polite" onPointerMove={tilt} onPointerLeave={resetTilt} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}><div className="catalog-scene-label"><span>01</span> Каталог <i/> <span>02</span> Товар <i/> <span>03</span> Покупка</div><div className="catalog-phone"><div className="catalog-phone-speaker"/><PhoneStore variant={variant} screen={screen} setScreen={setScreen}/></div><div className="catalog-scene-caption"><b>{plan.name}</b><span>{screen === "catalog" ? "Листаем каталог" : screen === "product" ? "Выбираем товар" : "Переходим к покупке"}</span></div></div></div></section>;
}
