import { NextResponse } from "next/server";
import { getMobileRoot } from "@/lib/mobile-auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  const { id } = await params;
  let body: { slug?: unknown; expected?: unknown; publish?: unknown; reason?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!UUID.test(id) || !/^[a-z0-9][a-z0-9-]{1,78}$/.test(slug) || typeof body.expected !== "boolean" || typeof body.publish !== "boolean" || body.expected === body.publish || reason.length < 3 || reason.length > 1000) {
    return NextResponse.json({ error: "Проверьте магазин, подтверждение и причину" }, { status: 400 });
  }
  const rpc = root.admin as unknown as { rpc: (name: "root_set_catalog_publication", args: { p_tenant: string; p_actor: string; p_slug: string; p_expected: boolean; p_publish: boolean; p_reason: string }) => Promise<{ data: boolean | null; error: { message: string } | null }> };
  const { data, error } = await rpc.rpc("root_set_catalog_publication", {
    p_tenant: id, p_actor: root.user.id, p_slug: slug, p_expected: body.expected, p_publish: body.publish, p_reason: reason,
  });
  if (error || !data) return NextResponse.json({ error: "Публикация не изменена. Обновите данные магазина." }, { status: 409 });
  return NextResponse.json({ published: body.publish }, { headers: { "Cache-Control": "no-store" } });
}
