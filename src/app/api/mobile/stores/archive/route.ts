import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMobileOwner } from "@/lib/mobile-auth";
import { storeArchiveEnabled } from "@/lib/store-archive-feature";

export const runtime = "nodejs";
const input = z.object({
  action: z.enum(["archive", "restore"]),
  tenantId: z.string().uuid(),
  slug: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(3).max(1000),
}).strict();
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });
const migrationUnavailable = (error: { code?: string; message?: string } | null | undefined) => Boolean(error && (
  ["42703", "42883", "PGRST202", "PGRST204", "PGRST205"].includes(error.code ?? "") ||
  /archived_at|archive_owner_store|restore_owner_store/i.test(error.message ?? "")
));

export async function POST(request: Request) {
  if (!storeArchiveEnabled()) return fail("Архив магазинов пока недоступен.", 404);
  if (!/^Bearer\s+.{20,}$/i.test(request.headers.get("authorization") ?? "")) return fail("Требуется повторный вход.", 401);
  let parsed: z.infer<typeof input>;
  try {
    const result = input.safeParse(await request.json());
    if (!result.success) return fail("Проверьте магазин, действие и причину.", 400);
    parsed = result.data;
  } catch { return fail("Некорректный запрос.", 400); }
  const context = await getMobileOwner(request, parsed.tenantId);
  if (!context) return fail("Нет доступа к магазину.", 403);
  const store = await context.admin.from("tenants").select("slug,archived_at").eq("id", parsed.tenantId).maybeSingle();
  if (migrationUnavailable(store.error)) return fail("Архив магазинов ещё не подготовлен в базе данных.", 503);
  if (store.error || !store.data) return fail("Магазин не найден.", 404);
  if (store.data.slug !== parsed.slug) return fail("Имя магазина не совпало.", 409);
  if (parsed.action === "archive" && store.data.archived_at) return fail("Магазин уже в архиве.", 409);
  if (parsed.action === "restore" && !store.data.archived_at) return fail("Магазин не находится в архиве.", 409);

  const rpc = context.admin as unknown as { rpc: (name: string, args: Record<string, string>) => Promise<{ data: boolean | null; error: { code?: string; message: string } | null }> };
  const result = await rpc.rpc(parsed.action === "archive" ? "archive_owner_store" : "restore_owner_store", {
    p_tenant: parsed.tenantId,
    p_actor: context.user.id,
    p_slug: parsed.slug,
    p_reason: parsed.reason,
  });
  if (migrationUnavailable(result.error)) return fail("Архив магазинов ещё не подготовлен в базе данных.", 503);
  if (result.error || !result.data) return fail(result.error?.message ?? "Действие не выполнено.", 409);
  revalidatePath("/s/[slug]", "page");
  revalidatePath("/stores");
  return NextResponse.json({ ok: true, action: parsed.action }, { headers: { "Cache-Control": "private, no-store" } });
}
