"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Package, Pause, Play, ShoppingBag } from "lucide-react";
import styles from "./commerce-motion.module.css";

const steps = [
  { title: "Выбор", copy: "Покупатель видит товар, цену и условия. Всё на одной витрине." },
  { title: "Заказ", copy: "Выбирает получение и отправляет заказ без длинной переписки." },
  { title: "Кабинет", copy: "Вы видите состав заказа и контакты. Подтверждаете и готовите к выдаче." },
];

export function CommerceMotion() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPlaying(!motion.matches);
    const change = () => setPlaying(!motion.matches);
    motion.addEventListener("change", change);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .3 });
    if (stage.current) observer.observe(stage.current);
    return () => { observer.disconnect(); motion.removeEventListener("change", change); };
  }, []);
  useEffect(() => {
    if (!playing || !visible) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setStep(value => (value + 1) % steps.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [playing, visible]);
  return <div ref={stage} className={styles.story}>
    <div className={styles.scene} data-step={step} aria-label="Демонстрация пути заказа, не настоящий магазин">
      <div className={styles.phone}>
        <div className={styles.speaker}/><small>ПРИМЕР МАГАЗИНА</small>
        <div key={step === 0 ? "product" : "order"} className={styles.screen}>
          {step === 0 ? <><div className={styles.product}><ShoppingBag size={64} strokeWidth={1}/></div><small>НОВАЯ КОЛЛЕКЦИЯ</small><h3>Сумка Essential</h3><b>24 900 ₸</b><div className={styles.mockButton}>В корзину <ArrowRight size={14}/></div></> : <><h3>Ваш заказ</h3><div className={styles.line}><ShoppingBag size={25}/><span>Сумка Essential<br/><small>1 шт. · 24 900 ₸</small></span></div><div className={styles.field}>Получение <b>Самовывоз</b></div><div className={styles.field}>Оплата <b>При получении</b></div><div className={styles.check}><Check size={23}/></div><b>Заказ отправлен</b><p>Магазин подтвердит готовность.</p></>}
        </div>
      </div>
      <div className={styles.transfer} aria-hidden="true"><ArrowRight size={24}/></div>
      <div className={styles.workspace}>
        <header><b>dukenim.</b><span>Пример кабинета</span></header>
        <div className={styles.body}><aside><span>Обзор</span><span>Каталог</span><b>Заказы</b><span>AI Studio</span></aside><div className={styles.content}><small>РАБОЧЕЕ ПРОСТРАНСТВО</small><h3>Заказы</h3><div className={styles.metrics}><div><small>Новые</small><strong>{step === 2 ? "1" : "0"}</strong></div><div><small>К сборке</small><strong>0</strong></div></div><div className={styles.incoming} data-ready={step === 2}><Package size={24}/><div><b>{step === 2 ? "Новый заказ · 24 900 ₸" : "Здесь появится ваш заказ"}</b><p>{step === 2 ? "Сумка Essential · 1 шт. · Самовывоз" : "Покупатель оформляет его на витрине."}</p></div>{step === 2 && <Check size={18}/>}</div><p className={styles.note}>{step === 2 ? "Далее: свяжитесь с покупателем и подтвердите заказ." : "Остатки, клиенты и аналитика — на тарифе «Бренд»."}</p></div></div>
      </div>
    </div>
    <div className={styles.controls}><div role="group" aria-label="Этап демонстрации">{steps.map((item, index) => <button type="button" key={item.title} aria-pressed={step === index} onClick={() => { setStep(index); setPlaying(false); }}><span>0{index + 1}</span>{item.title}</button>)}</div><button type="button" onClick={() => setPlaying(value => !value)} aria-label={playing ? "Приостановить анимацию" : "Включить анимацию"}>{playing ? <Pause size={17}/> : <Play size={17}/>}</button></div>
    <p className={styles.caption}>{steps[step].copy}</p>
  </div>;
}
