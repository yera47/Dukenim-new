"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const states = ["Каталог", "Товар", "Корзина", "Заказ"];

const HERO_FILM_POSTER = "/design/dukenim-hero-monolith-base-v1.png";
const DEFAULT_HERO_FILM = "/design/dukenim-hero-atelier-loop-v1.mp4";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function HeroArt() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, getReducedMotion, () => true);

  useEffect(() => {
    const hero = ref.current?.closest<HTMLElement>(".landing-hero");
    if (!hero) return;
    let frame = 0;
    let currentStep = -1;
    const update = () => {
      frame = 0;
      const rect = hero.getBoundingClientRect();
      const total = Math.max(1, hero.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / total));
      const nextStep = Math.min(3, Math.floor(progress * 4));
      if (nextStep !== currentStep) {
        currentStep = nextStep;
        setStep(nextStep);
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    ref.current?.style.setProperty("--mx", `${x * 7}px`);
    ref.current?.style.setProperty("--my", `${y * 5}px`);
  }

  const filmUrl = process.env.NEXT_PUBLIC_HIGGSFIELD_HERO_VIDEO || DEFAULT_HERO_FILM;
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={() => { ref.current?.style.setProperty("--mx", "0px"); ref.current?.style.setProperty("--my", "0px"); }} className={`hero-art-sculpture hero-step-${step}`} aria-hidden="true">
      {filmUrl
        ? reducedMotion
          // Reduced motion: keep the atmospheric layer as a still frame, no autoplaying video.
          ? <img className="hero-higgsfield-film" src={HERO_FILM_POSTER} alt="" />
          : <video className="hero-higgsfield-film" autoPlay muted loop playsInline preload="metadata" poster={HERO_FILM_POSTER}><source src={filmUrl} type="video/mp4" /></video>
        : null}
      <div className="story-architecture" aria-hidden="true">
        <i className="story-monolith story-monolith-a"/><i className="story-monolith story-monolith-b"/><i className="story-monolith story-monolith-c"/><i className="story-monolith story-monolith-d"/><i className="story-monolith story-monolith-e"/>
        <i className="story-cable story-cable-a"/><i className="story-cable story-cable-b"/><i className="story-cable story-cable-c"/>
      </div>
      <div className="story-panel story-crm">
        <div className="story-window"><i/><i/><i/><b>DUKENIM / CRM</b><span>Сегодня</span></div>
        <div className="story-crm-body">
          <aside><strong>D</strong><em>Главная</em><em>Заказы</em><em>Клиенты</em><em>Товары</em><em>Настройки</em></aside>
          <div className="story-chart"><small>Продажи</small><b>8 246 190 ₸</b><svg viewBox="0 0 280 72" aria-hidden="true"><path d="M2 61 35 49 60 55 91 29 120 37 150 19 179 34 213 12 244 20 278 3"/></svg><div><i/><i/><i/><i/><i/><i/><i/><i/></div></div>
          <div className="story-orders"><small>Последние заказы</small><b>Новая покупка</b><span>Сумка · 48 900 ₸</span><b>Оплачено</b><span>Куртка · 29 900 ₸</span></div>
        </div>
      </div>

      <div className="story-panel story-product">
        <div className="story-product-photo"><span>СУМКА</span><div className="story-bag"><i/><i/></div></div>
        <div className="story-product-copy"><small>KERGEGE COLLECTION</small><b>Сумка Atelier</b><strong>48 900 ₸</strong><span className="story-action">Добавить в корзину</span></div>
      </div>

      <div className="story-phone">
        <div className="story-phone-top"><i/><b>{states[step]}</b><span>⌕</span></div>
        {step === 0 && <div className="story-catalog-grid"><article className="coat"/><article className="cap"/><article className="bag"/><article className="shoe"/></div>}
        {step === 1 && <div className="story-product-view"><div className="story-bag"><i/><i/></div><b>Сумка Atelier</b><span>48 900 ₸</span><span className="story-action">В корзину</span></div>}
        {step === 2 && <div className="story-cart"><b>Корзина</b><div><span className="bag"/><section><strong>Сумка Atelier</strong><small>48 900 ₸</small></section></div><p>Итого <strong>48 900 ₸</strong></p><span className="story-action">Перейти к оплате</span></div>}
        {step === 3 && <div className="story-success"><i>✓</i><b>Заказ оформлен</b><span>Владелец получил новый заказ</span><small>№ DK-2048</small></div>}
      </div>

      <div className="story-progress">{states.map((name, index) => <span className={index === step ? "is-active" : ""} key={name}><em>0{index + 1}</em>{name}</span>)}</div>
    </div>
  );
}
