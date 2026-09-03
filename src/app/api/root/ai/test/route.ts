import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth";
import { AzureFoundryError, createAzureFoundryChatCompletion } from "@/lib/ai/azure-foundry";

const requestSchema = z.object({ prompt: z.string().trim().min(2).max(1000) });

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session?.user) return NextResponse.json({ error: "Требуется вход." }, { status: 401 });
  if (session.role !== "superadmin") return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Введите запрос от 2 до 1000 символов." }, { status: 400 });

  try {
    const result = await createAzureFoundryChatCompletion([
      { role: "system", content: "Ты внутренний AI-помощник платформы Dukenim. Отвечай кратко, точно и на русском языке." },
      { role: "user", content: input.data.prompt },
    ]);
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof AzureFoundryError && error.status && error.status < 500 ? error.status : 502;
    const message = error instanceof AzureFoundryError ? error.message : "Не удалось получить ответ Azure AI.";
    return NextResponse.json({ error: message }, { status });
  }
}
