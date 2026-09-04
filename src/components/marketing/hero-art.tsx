"use client";

import { useRef } from "react";

/**
 * The hero artwork is intentionally a single composed scene.
 * Catalog, CRM and phone are separate objects inside the approved reference;
 * duplicating them with CSS panels made the previous hero visually collide.
 */
export function HeroArt() {
  const ref = useRef<HTMLDivElement>(null);

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    ref.current?.style.setProperty("--mx", `${x * 6}px`);
    ref.current?.style.setProperty("--my", `${y * 4}px`);
  }

  return (
    <div
      ref={ref}
      className="hero-art-sculpture hero-art-clean"
      onPointerMove={move}
      onPointerLeave={() => {
        ref.current?.style.setProperty("--mx", "0px");
        ref.current?.style.setProperty("--my", "0px");
      }}
      aria-label="Витрина, CRM и мобильный заказ Dukenim"
    >
      <img
        className="hero-room-reference"
        src="/design/dukenim-home-hero-reference-v6.png"
        alt="Интерфейс магазина Dukenim: каталог, CRM и мобильный заказ"
      />
    </div>
  );
}
