"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitAiRequest, type AiRequestState } from "@/app/admin/ai-studio/request-action";
import { aiRequestSubjects } from "@/lib/ai/request";

export function AiRequestCard({ kind, message, generationId }: {
  kind: keyof typeof aiRequestSubjects;
  message: string;
  generationId: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(message);
  const [state, action, pending] = useActionState<AiRequestState, FormData>(submitAiRequest, {});
  const router = useRouter();
  useEffect(() => {
    if (state.requestId) router.push(`/admin/requests/${state.requestId}`);
  }, [state.requestId, router]);

  return <div className="rounded-2xl border bg-white p-4">
    {state.requestId ? <p role="status">Заявка сохранена. <Link className="underline" href={`/admin/requests/${state.requestId}`}>Открыть чат обращения →</Link></p>
      : !open ? <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>Подготовить заявку здесь</button>
      : <form action={action} className="grid gap-3" aria-label={aiRequestSubjects[kind]} aria-busy={pending}>
        <p className="font-semibold">{aiRequestSubjects[kind]}</p>
        <input type="hidden" name="kind" value={kind}/>
        <input type="hidden" name="generationId" value={generationId}/>
        <label className="grid gap-2 text-sm">Что передать команде
          <textarea name="text" className="input min-h-24 w-full" value={text} onChange={event => setText(event.target.value)} readOnly={pending} minLength={2} maxLength={3000} required/>
        </label>
        <p className="text-xs text-neutral-500">Проверьте текст перед отправкой. Создадим обращение в поддержку; статус и ответы появятся в его чате. Подключение и списание денег не выполняются. Не добавляйте пароли и ключи.</p>
        {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn btn-primary whitespace-normal" disabled={pending || text.trim().length < 2}>{pending ? "Отправляю…" : "Отправить заявку и открыть чат"}</button>
          <button className="btn btn-secondary" type="button" disabled={pending} onClick={() => setOpen(false)}>Отмена</button>
        </div>
      </form>}
  </div>;
}
