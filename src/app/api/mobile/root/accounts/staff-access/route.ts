import { NextResponse } from "next/server";
import { getMobileRoot } from "@/lib/mobile-auth";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!uuid.test(id)) return NextResponse.json({ error: "Некорректный доступ" }, { status: 400 });
  const access = await root.admin.from("staff_access").select("id,user_id,tenant_id,title,active,revision").eq("id", id).maybeSingle();
  if (access.error) return NextResponse.json({ error: "Не удалось прочитать доступ" }, { status: 503 });
  if (!access.data) return NextResponse.json({ error: "Доступ не найден" }, { status: 404 });
  const [user, tenant] = await Promise.all([
    root.admin.auth.admin.getUserById(access.data.user_id),
    root.admin.from("tenants").select("name").eq("id", access.data.tenant_id).maybeSingle(),
  ]);
  if (user.error || tenant.error || !user.data.user?.email || !tenant.data) return NextResponse.json({ error: "Не удалось полностью прочитать доступ" }, { status: 503 });
  return NextResponse.json({ access: { ...access.data, email: user.data.user.email, storeName: tenant.data.name } }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function POST(request: Request) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  let body: { accessId?: string; email?: string; active?: boolean; revision?: number; reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const accessId = body.accessId ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const reason = body.reason?.trim() ?? "";
  if (!uuid.test(accessId) || !email || typeof body.active !== "boolean" || !Number.isInteger(body.revision) || (body.revision ?? -1) < 0 || reason.length < 3 || reason.length > 1000) {
    return NextResponse.json({ error: "Проверьте сотрудника, email и причину" }, { status: 400 });
  }
  const rpc = root.admin as unknown as { rpc: (name: "root_set_staff_access", args: { p_access: string; p_actor: string; p_email: string; p_active: boolean; p_expected_revision: number; p_reason: string }) => Promise<{ data: boolean | null; error: { message: string } | null }> };
  const result = await rpc.rpc("root_set_staff_access", { p_access: accessId, p_actor: root.user.id, p_email: email, p_active: body.active, p_expected_revision: body.revision!, p_reason: reason });
  if (result.error || !result.data) return NextResponse.json({ error: "Доступ не изменён. Проверьте состояние и повторите попытку" }, { status: 409 });
  return NextResponse.json({ saved: true }, { headers: { "Cache-Control": "no-store, private" } });
}
