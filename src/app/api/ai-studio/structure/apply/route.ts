import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionContext } from "@/lib/auth";
import { tenantEntitlement } from "@/lib/plan-access";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({ generationId: z.string().uuid() });
const structureSchema = z.object({
  sections: z.array(z.object({ name: z.string().trim().min(2).max(40) })).min(2).max(6),
});

export async function POST(request: Request) {
  const context = await getSessionContext();
  if (!context?.user) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  if (!context.tenantId || !["owner", "superadmin"].includes(context.role)) return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Выберите сохранённый результат AI." }, { status: 400 });
  if (!(await tenantEntitlement(context.tenantId)).active) return NextResponse.json({ error: "Для сохранения нужен активный пробный период или подписка." }, { status: 403 });
  // Use the user's session and RLS in addition to the explicit tenant filters.
  const client = await createClient();
  const tenant = await client.from("tenants").select("catalog_status").eq("id", context.tenantId).single();
  if (tenant.error || !tenant.data || tenant.data.catalog_status === "not_started") return NextResponse.json({ error: "Сначала сохраните основу каталога в редакторе ниже." }, { status: 409 });
  const generation = await client.from("ai_studio_generations").select("id,output").eq("id", input.data.generationId).eq("tenant_id", context.tenantId).eq("intent", "catalog_structure").maybeSingle();
  if (generation.error || !generation.data) return NextResponse.json({ error: "Результат не найден в вашем магазине." }, { status: 404 });
  const output = structureSchema.safeParse(generation.data.output);
  if (!output.success) return NextResponse.json({ error: "Структуру нужно сгенерировать заново." }, { status: 422 });
  // Stable keys + the existing (tenant_id, slug) unique constraint make retries
  // idempotent. Ignore duplicates: never overwrite later owner edits.
  const rows = output.data.sections.map((section, index) => ({
    tenant_id: context.tenantId!, name: section.name,
    slug: `ai-${generation.data!.id}-${index + 1}`,
    sort_order: index, is_active: true,
  }));
  const saved = await client.from("categories").upsert(rows, { onConflict: "tenant_id,slug", ignoreDuplicates: true });
  if (saved.error) return NextResponse.json({ error: "Не удалось сохранить разделы. Повторная попытка не создаст копии." }, { status: 500 });
  revalidatePath("/admin/ai-studio"); revalidatePath("/admin/catalog"); revalidatePath("/s/[slug]", "page");
  return NextResponse.json({ saved: true, count: rows.length });
}
