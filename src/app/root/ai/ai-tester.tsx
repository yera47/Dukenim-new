"use client";
import { FormEvent, useState } from "react";

export function AiTester({ configured }: { configured: boolean }) {
  const [prompt, setPrompt] = useState("Кратко опиши, чем Dukenim полезен владельцу магазина.");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setAnswer(""); setError("");
    try {
      const response = await fetch("/api/root/ai/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const data = await response.json() as { content?: string; error?: string };
      if (!response.ok || !data.content) throw new Error(data.error ?? "Проверка не выполнена.");
      setAnswer(data.content);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Проверка не выполнена."); }
    finally { setPending(false); }
  }

  return <form onSubmit={submit} className="mt-6 space-y-3"><label className="block text-sm font-bold" htmlFor="ai-prompt">Тестовый запрос</label><textarea id="ai-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={1000} rows={4} className="input h-auto resize-y text-black"/><button disabled={!configured || pending} className="btn bg-[var(--accent-bright)] text-[var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-40">{pending ? "Проверяем…" : "Проверить модель"}</button>{answer && <div className="rounded-xl bg-white/8 p-4 text-sm leading-6 text-white/80">{answer}</div>}{error && <p role="alert" className="text-sm text-red-300">{error}</p>}</form>;
}
