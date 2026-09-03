"use client";
import { useState } from "react";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
type Intent = "hero" | "promotion" | "catalog_copy";
type Draft = { eyebrow?: string; title: string; body: string; ctaLabel: string };
const intents: Array<{ id: Intent; title: string; text: string }> = [
  { id: "hero", title: "Главный блок", text: "Переосмыслить обещание и CTA витрины." },
  { id: "promotion", title: "Акция", text: "Собрать честный черновик кампании." },
  { id: "catalog_copy", title: "Подборка", text: "Описать категорию или сезонный выбор." },
];
export function AiStudioClient({ enabled, brand }: { enabled: boolean; brand: boolean }) {
  const [intent, setIntent] = useState<Intent>("promotion"), [brief, setBrief] = useState(""), [pending, setPending] = useState(false), [error, setError] = useState(""), [draft, setDraft] = useState<Draft | null>(null);
  async function createDraft() { setPending(true); setError(""); setDraft(null); try { const response = await fetch("/api/ai-studio/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent, brief }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setDraft(data.draft); } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось создать черновик."); } finally { setPending(false); } }
  if (!brand) return <div className="ai-studio-lock"><LockKeyhole/><div><b>AI Studio доступен на тарифе «Бренд»</b><p>В «Старт» этот модуль виден заранее, но не создаёт тексты и не скрывает функциональность витрины.</p></div><a className="btn btn-primary" href="/admin/plan">Открыть тарифы <ArrowRight size={17}/></a></div>;
  return <div className="ai-studio-grid"><div className="ai-studio-form">{intents.map((item) => <button key={item.id} onClick={() => setIntent(item.id)} type="button" className={intent === item.id ? "is-selected" : ""}><b>{item.title}</b><span>{item.text}</span></button>)}<label>Что вы хотите сообщить покупателю?<textarea value={brief} onChange={(event) => setBrief(event.target.value)} maxLength={800} placeholder="Например: осенняя подборка свободных костюмов, без выдуманных скидок и сроков."/></label><button onClick={createDraft} disabled={!enabled || brief.trim().length < 8 || pending} className="btn btn-primary">{pending ? "Создаём черновик…" : <><Sparkles size={17}/>Создать черновик</>}</button>{!enabled && <p className="ai-studio-note">Интерфейс готов. Для запуска нужны серверные Azure-секреты и применённая миграция AI Studio.</p>}{error && <p role="alert" className="ai-studio-error">{error}</p>}</div><aside className="ai-studio-preview"><span className="data-label">ПРЕДПРОСМОТР — НЕ ОПУБЛИКОВАНО</span>{draft ? <><small>{draft.eyebrow}</small><h2>{draft.title}</h2><p>{draft.body}</p><button type="button">{draft.ctaLabel}</button><em>Сначала проверьте текст, затем вручную перенесите его в настройки витрины или акцию.</em></> : <><h2>Ваш черновик появится здесь.</h2><p>Никаких автоматических публикаций и изменений кода — только предварительный текст для проверки владельцем.</p></>}</aside></div>;
}
