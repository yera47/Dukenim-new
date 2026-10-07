import Link from "next/link";
import { ArrowRight } from "lucide-react";

const examples = [
  { href: "/demo/fashion/collection", name: "FORMA", kind: "Одежда", note: "Editorial grid, варианты размеров", colors: ["#191919", "#eee9e2"] },
  { href: "/demo/beauty/collection", name: "SOMA", kind: "Красота", note: "Ритуал ухода, объёмы товаров", colors: ["#741813", "#f7e9de"] },
  { href: "/demo/flowers/collection", name: "ВЕТКА", kind: "Цветы", note: "Повод, дата и район доставки", colors: ["#0b3fa5", "#fffdf6"] },
  { href: "/demo/home/collection", name: "ТИХО", kind: "Дом", note: "Тёплый editorial-каталог", colors: ["#3d2e21", "#f4eee3"] },
  { href: "/demo/other/collection", name: "БЮРО", kind: "Товары", note: "Форматы, подборки и фильтры", colors: ["#0756be", "#f6f6f3"] },
  { href: "/demo/food/collection", name: "BULKA", kind: "Еда", note: "Меню, опции, pickup и delivery", colors: ["#f28b20", "#fff4dc"] },
] as const;

export default function DemoPage() {
  return <main className="min-h-screen bg-[#f5f1eb] text-neutral-950"><div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
    <nav className="flex items-center justify-between text-sm"><Link href="/">← Dukenim</Link><Link href="/register?plan=basic">Создать магазин <ArrowRight className="inline" size={15}/></Link></nav>
    <header className="max-w-3xl py-14 md:py-20"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-neutral-500">Утверждённые примеры</p><h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Один раздел. Сразу в живую витрину.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600">Пять утверждённых направлений и Bulka для еды. Карточка открывает сам магазин — без второго выбора стиля. Данные синтетические, реальные клиенты не показаны.</p></header>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Примеры магазинов">{examples.map(example => <Link key={example.href} href={example.href} className="group overflow-hidden rounded-3xl border border-black/10 bg-white p-3 transition hover:-translate-y-1 hover:shadow-xl"><div className="flex aspect-[4/3] flex-col justify-between rounded-2xl p-6" style={{background:`linear-gradient(145deg, ${example.colors[1]}, white)`}}><div className="flex items-center justify-between"><b className="text-3xl tracking-tight" style={{color:example.colors[0]}}>{example.name}</b><span className="rounded-full border border-current/15 px-3 py-1 text-xs" style={{color:example.colors[0]}}>{example.kind}</span></div><div><p className="max-w-[16rem] text-sm text-neutral-600">{example.note}</p><span className="mt-4 inline-flex items-center gap-2 font-bold" style={{color:example.colors[0]}}>Открыть магазин <ArrowRight size={16}/></span></div></div></Link>)}</section>
    <p className="mt-8 text-sm text-neutral-500">Концепт-борды не вставлены внутрь магазинов как фальшивые phone frames: витрины собраны кодом и проверяются отдельно на mobile и desktop.</p>
  </div></main>;
}
