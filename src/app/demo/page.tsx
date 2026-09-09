import Image from "next/image";
import Link from "next/link";
import { launchVerticals } from "@/lib/launch-verticals";
import { nichePresets } from "@/lib/niche-presets";

export default function DemoPage() {
  return <main className="min-h-screen bg-white text-neutral-900"><div className="mx-auto max-w-6xl px-6 py-10">
    <nav className="flex justify-between text-sm"><Link href="/">← Dukenim</Link><Link href="/admin/ai-studio">К созданию каталога →</Link></nav>
    <header className="max-w-2xl py-16"><p className="mb-4 text-sm text-neutral-500">ПОПРОБУЙТЕ DUKENIM</p><h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Какой у вас бизнес?</h1><p className="mt-6 text-lg text-neutral-500">Откройте пример, пройдите по разделам и попробуйте оформление заказа.</p></header>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{launchVerticals.map(({id:vertical})=>{const preset=nichePresets[vertical];return <Link key={vertical} href={`/demo/${vertical}`} className="overflow-hidden rounded-2xl border border-neutral-200 hover:border-neutral-600"><div className="aspect-[4/3] bg-neutral-100">{preset.imageUrl&&<Image unoptimized width={600} height={450} src={preset.imageUrl} alt={preset.product} className="h-full w-full object-cover"/>}</div><div className="p-6"><h2 className="text-xl font-semibold">{preset.label}</h2><p className="mt-3 text-sm text-neutral-500">Выбрать оформление →</p></div></Link>})}</div>
    <p className="mt-8 text-sm text-neutral-500">Демонстрационные магазины. Заказы не отправляются и деньги не списываются.</p>
  </div></main>;
}
