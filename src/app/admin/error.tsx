"use client";

import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-[60vh] place-items-center"><section className="card max-w-lg p-8 text-center"><TriangleAlert className="mx-auto text-[var(--accent)]" size={34} /><h1 className="mt-4 text-2xl font-extrabold">Не удалось открыть раздел</h1><p className="mt-3 text-[var(--ink-60)]">Данные магазина не изменены. Обновите страницу или вернитесь в кабинет и повторите действие.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><button onClick={reset} className="btn btn-primary"><RefreshCw size={17} />Попробовать снова</button><Link href="/admin" className="btn btn-secondary">В кабинет</Link></div></section></main>;
}
