import { NextResponse } from "next/server";
import { getMobileRoot } from "@/lib/mobile-auth";
import { createPlatformAuditEvent } from "@/lib/queries/root";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!uuid.test(id) || id === root.user.id) return NextResponse.json({ error: "Аккаунт недоступен для изменения" }, { status: 400 });
  const [userResult, profile] = await Promise.all([
    root.admin.auth.admin.getUserById(id),
    root.admin.from("profiles").select("role").eq("user_id", id).maybeSingle(),
  ]);
  const user = userResult.data.user;
  if (userResult.error || profile.error) return NextResponse.json({ error: "Не удалось прочитать аккаунт" }, { status: 503 });
  if (!user?.email) return NextResponse.json({ error: "Аккаунт не найден" }, { status: 404 });
  if (profile.data?.role === "superadmin") return NextResponse.json({ error: "Superadmin нельзя заблокировать здесь" }, { status: 403 });
  return NextResponse.json({ account: { id: user.id, email: user.email, blocked: Boolean(user.banned_until && new Date(user.banned_until) > new Date()) } }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function POST(request: Request) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  let body: { userId?: string; email?: string; expectedBlocked?: boolean; block?: boolean; reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const id = body.userId ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const reason = body.reason?.trim() ?? "";
  if (!uuid.test(id) || id === root.user.id || !email || typeof body.expectedBlocked !== "boolean" || typeof body.block !== "boolean" || body.expectedBlocked === body.block || reason.length < 5 || reason.length > 1000) {
    return NextResponse.json({ error: "Проверьте аккаунт, email и причину" }, { status: 400 });
  }
  const [userResult, profile] = await Promise.all([
    root.admin.auth.admin.getUserById(id),
    root.admin.from("profiles").select("role").eq("user_id", id).maybeSingle(),
  ]);
  const user = userResult.data.user;
  if (userResult.error || profile.error) return NextResponse.json({ error: "Не удалось прочитать аккаунт" }, { status: 503 });
  if (!user || user.email?.toLowerCase() !== email || profile.data?.role === "superadmin") return NextResponse.json({ error: "Аккаунт или email не совпадает" }, { status: 403 });
  const blocked = Boolean(user.banned_until && new Date(user.banned_until) > new Date());
  if (blocked !== body.expectedBlocked) return NextResponse.json({ error: "Состояние изменилось. Обновите данные" }, { status: 409 });
  const audit = await createPlatformAuditEvent(root.admin, { actorId: root.user.id, action: "account.login_access_requested", reason, metadata: { userId: id, beforeBlocked: blocked, afterBlocked: body.block } });
  if (audit.error) return NextResponse.json({ error: "Журнал аудита недоступен. Изменение не выполнено" }, { status: 503 });
  const updated = await root.admin.auth.admin.updateUserById(id, { ban_duration: body.block ? "876000h" : "none" });
  if (updated.error) return NextResponse.json({ error: "Не удалось изменить вход" }, { status: 503 });
  await createPlatformAuditEvent(root.admin, { actorId: root.user.id, action: body.block ? "account.login_blocked" : "account.login_restored", reason, metadata: { userId: id } });
  return NextResponse.json({ saved: true }, { headers: { "Cache-Control": "no-store, private" } });
}
