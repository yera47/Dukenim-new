import Image from "next/image";
import Link from "next/link";
import { launchVerticals } from "@/lib/launch-verticals";
import { commerceConfigurations } from "@/lib/commerce-configurations";
import { nichePresets } from "@/lib/niche-presets";

export default function DemoPage() {
  return <main className="min-h-screen bg-white text-neutral-900"><div className="mx-auto max-w-6xl px-6 py-10">
    <nav className="flex justify-between text-sm"><Link href="/">← Dukenim</Link><Link href="/admin/ai-studio">К созданию каталога →</Link></nav>
    <header className="max-w-2xl py-16"><p className="mb-4 text-sm text-neutral-500">ПОПРОБУЙТЕ DUKENIM</p><h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Какой у вас бизнес?</h1><p className="mt-6 text-lg text-neutral-500">Откройте пример, пройдите по разделам и попробуйте оформление заказа.</p></header>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{launchVerticals.map(({id:vertical}) => { const preset = nichePresets[vertical]; return <article key={vertical} className="overflow-hidden rounded-2xl border border-neutral-200"><div className="flex aspect-[4/3] items-center justify-center bg-neutral-100">{preset.imageUrl ? <Image unoptimized width={600} height={450} src={preset.imageUrl} alt={preset.product} className="h-full w-full object-cover"/> : <span className="text-3xl font-semibold tracking-tight">{preset.storeName}</span>}</div><div className="p-6"><h2 className="text-xl font-semibold">{preset.label}</h2><p className="mt-2 text-sm text-neutral-500">Три способа показать ваш ассортимент</p><div className="mt-5 grid gap-2">{commerceConfigurations.filter(c=>c.vertical===vertical).map(c=><Link key={c.id} href={c.href} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm hover:bg-neutral-100">{c.title} →</Link>)}</div></div></article>; })}</div>
    <p className="mt-8 text-sm text-neutral-500">Демонстрационные магазины. Заказы не отправляются и деньги не списываются.</p>
  </div></main>;
}
