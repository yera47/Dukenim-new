import Link from "next/link";
import { Activity, ArrowLeft, Bot, CalendarClock, CircleDollarSign, Radar, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMarketingDashboard } from "@/lib/queries/marketing";
import type { LucideIcon } from "lucide-react";

export default async function MarketingPage() {
  const empty = { signals: [], content: [], sources: [], runs: [], error: null };
  const data = process.env.NEXT_PUBLIC_SUPABASE_URL ? await getMarketingDashboard(await createClient()) : empty;
  const shortlisted = data.signals.filter((item) => item.total_score >= 60);
  const queued = data.content.filter((item) => !["published", "failed"].includes(item.status));
  const spent = data.content.reduce((sum, item) => sum + item.estimated_cost_cents, 0);
  const lastRun = data.runs[0];

  return <main className="min-h-screen bg-[#071b17] text-[#fffdf8]">
    <div className="container py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/root" className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white"><ArrowLeft size={16}/> Центр управления</Link>
          <p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-[#b08a50]">Dukenim Growth Engine</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-.04em] md:text-6xl">Маркетинг 24/7</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white/55">Система сначала использует бесплатные сигналы и локальный скоринг. AI включается только для тем с доказанным потенциалом.</p>
        </div>
        <div className="rounded-full border border-[#b08a50]/35 bg-[#b08a50]/10 px-4 py-2 text-sm text-[#d6bc91]">Экономный режим активен</div>
      </div>

      <section className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["Сильные сигналы", shortlisted.length, Radar], ["В очереди", queued.length, CalendarClock],
          ["Источники", data.sources.filter((item) => item.enabled).length, Activity], ["Расход AI", `$${(spent / 100).toFixed(2)}`, CircleDollarSign],
        ] as Array<[string, string | number, LucideIcon]>).map(([label, value, Icon]) => <div key={label} className="bg-[#0b241e] p-6">
          <div className="flex items-center justify-between text-white/45"><span className="text-xs font-bold uppercase tracking-[.14em]">{String(label)}</span><Icon size={18}/></div>
          <strong className="mt-7 block text-3xl tabular-nums">{String(value)}</strong>
        </div>)}
      </section>

      {data.error && <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">Примените миграцию `202608130001_marketing_engine.sql`, чтобы подключить живые данные.</div>}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-2xl bg-[#f4f0e8] p-6 text-[#071b17] md:p-8">
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#8f6d39]">Очередь возможностей</p><h2 className="mt-2 text-2xl font-extrabold">Лучшие тренды сейчас</h2></div><Sparkles className="text-[#b08a50]"/></div>
          <div className="mt-6 space-y-3">
            {data.signals.length ? data.signals.slice(0, 10).map((signal) => <article key={signal.id} className="grid gap-4 rounded-xl border border-[#071b17]/10 bg-white/55 p-4 md:grid-cols-[64px_1fr_auto] md:items-center">
              <div className="grid size-14 place-items-center rounded-full bg-[#071b17] text-lg font-extrabold text-white">{signal.total_score}</div>
              <div><h3 className="font-bold">{signal.title}</h3><p className="mt-1 line-clamp-2 text-sm leading-5 text-[#071b17]/55">{signal.summary || "Сигнал без описания"}</p></div>
              {signal.url ? <a href={signal.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#8f6d39]">Источник ↗</a> : null}
            </article>) : <div className="rounded-xl border border-dashed border-[#071b17]/20 p-10 text-center text-[#071b17]/55">После первого cron-запуска здесь появятся бесплатные тренд-сигналы.</div>}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/[.055] p-6">
            <div className="flex items-center gap-3"><Bot className="text-[#b08a50]"/><h2 className="text-xl font-extrabold">AI-ворота</h2></div>
            <ol className="mt-5 space-y-4 text-sm leading-6 text-white/60">
              <li><b className="text-white">1. Бесплатно:</b> RSS и локальный скоринг каждые 6 часов.</li>
              <li><b className="text-white">2. Codex:</b> сценарий только при балле 60+.</li>
              <li><b className="text-white">3. Claude:</b> независимая редактура финалистов, не всех идей.</li>
              <li><b className="text-white">4. Видео:</b> генерация только после вашего одобрения.</li>
            </ol>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/[.055] p-6">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-white/40">Последний сбор</p>
            <strong className="mt-3 block text-xl">{lastRun ? (lastRun.status === "success" ? "Успешно" : "Требует внимания") : "Ещё не запускался"}</strong>
            <p className="mt-2 text-sm text-white/50">{lastRun ? `${lastRun.items_processed} сигналов · $${(lastRun.estimated_cost_cents / 100).toFixed(2)}` : "Cron будет запускаться каждые 6 часов."}</p>
          </section>
        </aside>
      </div>
    </div>
  </main>;
}
