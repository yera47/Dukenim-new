import Link from "next/link";
import { ArrowRight, Check, MessageCircle, Sparkles } from "lucide-react";

const jobs = ["Тексты витрины", "Структура каталога", "Рекламные баннеры"];

export function AiStudioSection() {
  return <section className="story-ai-studio" id="ai-studio"><div className="container story-ai-grid">
    <div className="story-ai-copy"><p className="story-ai-kicker"><Sparkles size={15}/> AI STUDIO · РАБОЧИЙ ЦЕНТР</p><h2>Не угадывает за вас. Помогает собрать магазин.</h2><p className="story-ai-lead">Опишите задачу — Dukenim подготовит проверяемый черновик. Вы решаете, что попадёт на витрину, а если нужен человек, поддержка всегда рядом.</p><div className="story-ai-actions"><Link href="/register" className="btn btn-primary">Попробовать 7 дней <ArrowRight size={17}/></Link><Link href="/admin/requests?source=ai-studio" className="story-ai-support"><MessageCircle size={16}/> Написать человеку</Link></div></div>
    <div className="story-ai-console" aria-label="Пример задач AI Studio"><div className="story-ai-console-head"><span><i/>AI STUDIO</span><small>ЧЕРНОВИК · НЕ ОПУБЛИКОВАН</small></div><div className="story-ai-console-body"><p>Чем займёмся сегодня?</p>{jobs.map((job, index) => <div key={job} className={index === 1 ? "is-active" : ""}><span>{String(index + 1).padStart(2, "0")}</span><b>{job}</b><Check size={15}/></div>)}<em>Каждый результат можно проверить перед публикацией.</em></div></div>
  </div></section>;
}
