import Link from "next/link";
import { notFound } from "next/navigation";
import { isLaunchVertical,launchVerticals } from "@/lib/launch-verticals";
import { commerceConfigurations } from "@/lib/commerce-configurations";
export function generateStaticParams(){return launchVerticals.map(({id})=>({vertical:id}));}
export default async function SegmentExamples({params}:{params:Promise<{vertical:string}>}){
 const {vertical}=await params;if(!isLaunchVertical(vertical))notFound();
 return <main className="mx-auto max-w-7xl px-5 py-10"><nav className="flex justify-between gap-3 text-sm"><Link href="/demo">← Все сферы бизнеса</Link><Link href="/admin/ai-studio">Создать магазин →</Link></nav><header className="py-12"><p className="text-sm text-neutral-500">{launchVerticals.find(v=>v.id===vertical)!.label}</p><h1 className="mt-3 text-4xl font-semibold">Как покупатели будут выбирать?</h1><p className="mt-5 max-w-2xl text-neutral-500">Сравните три способа подачи. Откройте пример целиком, чтобы проверить карточки товаров и путь заказа.</p></header>
 <div className="grid items-start gap-6 lg:grid-cols-3">{commerceConfigurations.filter(c=>c.vertical===vertical).map((c,index)=><article key={c.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"><div className="p-6"><span className="text-sm text-neutral-500">Вариант {index+1}</span><h2 className="mt-3 text-2xl font-semibold">{c.title}</h2><p className="mt-4 text-sm leading-6 text-neutral-600">{c.description}</p><Link href={c.href} className="btn btn-primary mt-5">Открыть пример →</Link></div><iframe loading="lazy" title={c.title} src={c.href} className="h-[480px] w-full border-0 border-t"/></article>)}</div>
 </main>;
}
