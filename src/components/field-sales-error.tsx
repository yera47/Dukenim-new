"use client";

import { useEffect } from "react";

export function FieldSalesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Field sales page error", error); }, [error]);
  return <main className="field-sales-shell"><div className="container field-sales-body"><section className="sales-agenda"><p>ВЫЕЗДНЫЕ ПРОДАЖИ</p><h1>Данные остались сохранены</h1><p>Страница не загрузилась. Повторите загрузку — введённые данные в базе не удаляются.</p><button className="sales-primary" onClick={reset}>Повторить</button></section></div></main>;
}
