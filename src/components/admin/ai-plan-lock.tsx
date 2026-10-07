import React from "react";
import Link from "next/link";

export function AiPlanLock() {
  return <div className="card mx-auto max-w-3xl p-7 sm:p-10" data-ai-plan-lock>
    <p className="data-label">AI Studio · Premium</p>
    <h1 className="mt-3 text-3xl font-extrabold">AI-инструменты не входят в Base</h1>
    <p className="muted mt-3 max-w-2xl leading-7">Каталог, корзина и заказы продолжают работать. Перейдите на Premium, чтобы создавать тексты и изображения товаров с AI.</p>
    <div className="mt-6 flex flex-wrap gap-3"><Link href="/admin/plan" className="btn btn-primary">Посмотреть Premium</Link><Link href="/admin/catalog" className="btn btn-secondary">Вернуться в каталог</Link></div>
  </div>;
}
