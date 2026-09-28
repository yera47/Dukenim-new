import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileOwner } from "@/lib/mobile-auth";
import { computeEntitlement } from "@/lib/entitlement";
import { createAiStudioDraft, getAiStudioStatus } from "@/lib/ai/studio";

const inputSchema = z.object({
  tenantId: z.string().uuid(),
  brief: z.string().trim().min(8).max(800),
}).strict();

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 3000) return NextResponse.json({ error: "Запрос слишком большой." }, { status: 413 });
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Опишите акцию и её реальные условия." }, { status: 400 });
  const context = await getMobileOwner(request, input.data.tenantId);
  if (!context) return NextResponse.json({ error: "Войдите как владелец магазина." }, { status: 401 });
  if (!getAiStudioStatus().configured) return NextResponse.json({ error: "AI Studio временно недоступен." }, { status: 503 });
  const { admin, tenantId, user } = context;
  const [tenant, usage] = await Promise.all([
    admin.from("tenants").select("name,business_vertical,status,plan,next_plan,trial_ends_at").eq("id", tenantId).maybeSingle(),
    admin.from("ai_studio_generations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
  ]);
  if (tenant.error || !tenant.data || usage.error) return NextResponse.json({ error: "Не удалось загрузить магазин." }, { status: 503 });
  if (!computeEntitlement(tenant.data).active) return NextResponse.json({ error: "Пробный период или подписка завершены." }, { status: 403 });
  if ((usage.count ?? 0) >= Math.max(1, Number(process.env.AZURE_AI_MAX_TENANT_DAILY_REQUESTS) || 40)) return NextResponse.json({ error: "Дневной лимит AI Studio исчерпан." }, { status: 429 });
  const rpc = admin as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
  const reserved = await rpc.rpc("reserve_ai_credits", { p_tenant_id: tenantId, p_cost: 1, p_monthly_allotment: 600 });
  if (reserved.error) return NextResponse.json({ error: "Лимит AI Studio исчерпан." }, { status: 429 });
  try {
    const result = await createAiStudioDraft("promotion", input.data.brief, tenant.data);
    const saved = await admin.from("ai_studio_generations").insert({
      tenant_id: tenantId, requested_by: user.id, intent: "promotion", input_summary: input.data.brief,
      output: result.draft, model: getAiStudioStatus().deployment, usage: result.usage ?? {}, credit_cost: 1,
    }).select("id").single();
    if (saved.error || !saved.data) throw new Error("save_failed");
    return NextResponse.json({ generationId: saved.data.id, draft: result.draft }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    await rpc.rpc("refund_ai_credits", { p_tenant_id: tenantId, p_cost: 1 });
    return NextResponse.json({ error: "Не удалось подготовить акцию. Попробуйте ещё раз." }, { status: 502 });
  }
}
