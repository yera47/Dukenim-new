"use client";
import Image from "next/image";
import { useRef } from "react";

export function HeroArt() {
  const ref = useRef<HTMLDivElement>(null);
  function move(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    ref.current?.style.setProperty("--rx", `${y * -7}deg`);
    ref.current?.style.setProperty("--ry", `${x * 9}deg`);
    ref.current?.style.setProperty("--mx", `${x * 18}px`);
    ref.current?.style.setProperty("--my", `${y * 14}px`);
    ref.current?.style.setProperty("--mx-back", `${x * -10}px`);
    ref.current?.style.setProperty("--my-back", `${y * -8}px`);
    ref.current?.style.setProperty("--mx-front", `${x * 15}px`);
    ref.current?.style.setProperty("--my-front", `${y * 12}px`);
  }
  function reset() { for (const [key, value] of [["--rx","0deg"],["--ry","0deg"],["--mx","0px"],["--my","0px"],["--mx-back","0px"],["--my-back","0px"],["--mx-front","0px"],["--my-front","0px"]]) ref.current?.style.setProperty(key, value); }
  return <div ref={ref} onPointerMove={move} onPointerLeave={reset} className="hero-art" aria-label="Сайт, приложение и CRM Dukenim работают как единая система">
    <div className="hero-portal" aria-hidden="true"><span/><span/><span/><i/><b/></div>
    <div className="hero-orbit hero-orbit-one" aria-hidden="true"/><div className="hero-orbit hero-orbit-two" aria-hidden="true"/>
    <div className="hero-layer hero-layer-crm"><Image src="/hero-crm-layer.png" alt="CRM-панель Dukenim" fill priority sizes="(max-width: 900px) 88vw, 52vw"/></div>
    <div className="hero-layer hero-layer-phone"><Image src="/hero-phone-layer.png" alt="Мобильный магазин Dukenim" fill priority sizes="(max-width: 900px) 38vw, 18vw"/></div>
    <div className="hero-tumar" aria-hidden="true"><span/><span/><span/><span/></div>
    <div className="hero-chip hero-chip-site">САЙТ <small>ONLINE</small></div>
    <div className="hero-chip hero-chip-crm">CRM <small>LIVE</small></div>
    <div className="hero-signal hero-signal-a"/><div className="hero-signal hero-signal-b"/>
    <div className="hero-float">САЙТ <span/> ПРИЛОЖЕНИЕ <span/> CRM</div>
  </div>;
}
