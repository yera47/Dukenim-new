import React from "react";
import Link from "next/link";

export function AiPlanLock() {
  return <div className="card mx-auto max-w-3xl p-7 sm:p-10" data-ai-plan-lock>
    <p className="data-label">AI Studio · тариф «Каталог»</p>
    <h1 className="mt-3 text-3xl font-extrabold">Пробный период завершён</h1>
    <p className="muted mt-3 max-w-2xl leading-7">Платный доступ к функциям магазина можно подключить отдельно. AI-инструменты также зависят от доступности сервиса генерации.</p>
    <div className="mt-6 flex flex-wrap gap-3"><Link href="/admin/plan" className="btn btn-primary">Условия тарифа</Link><Link href="/admin/catalog" className="btn btn-secondary">Вернуться в каталог</Link></div>
  </div>;
}
