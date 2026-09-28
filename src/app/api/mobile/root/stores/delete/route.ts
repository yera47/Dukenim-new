import { NextResponse } from "next/server";
import { getMobileRoot } from "@/lib/mobile-auth";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(request: Request) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  let body: { stores?: { id: string; slug: string }[]; reason?: string; confirmation?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const stores = body.stores;
  const reason = body.reason?.trim() ?? "";
  if (!Array.isArray(stores) || stores.length < 2 || stores.length > 20 || stores.some(store => !uuid.test(store.id) || !slug.test(store.slug)) || new Set(stores.map(store => store.id)).size !== stores.length || reason.length < 3 || reason.length > 1000 || body.confirmation !== `УДАЛИТЬ ${stores.length}`) {
    return NextResponse.json({ error: "Проверьте выбор, причину и фразу подтверждения." }, { status: 400 });
  }
  const rpc = root.admin as unknown as { rpc: (name: "root_bulk_delete_empty_stores", args: { p_stores: { id: string; slug: string }[]; p_actor: string; p_reason: string }) => Promise<{ data: number | null; error: { message: string } | null }> };
  const result = await rpc.rpc("root_bulk_delete_empty_stores", { p_stores: stores, p_actor: root.user.id, p_reason: reason });
  if (result.error || result.data !== stores.length) return NextResponse.json({ error: result.error?.message ?? "Удаление не выполнено." }, { status: 409 });
  return NextResponse.json({ deleted: result.data }, { headers: { "Cache-Control": "no-store" } });
}
