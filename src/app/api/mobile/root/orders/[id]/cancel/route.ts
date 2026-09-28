import { NextResponse } from "next/server";
import { getMobileRoot } from "@/lib/mobile-auth";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cancellable = new Set(["new", "confirmed", "assembled", "delivering"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const root = await getMobileRoot(request);
  if (!root) return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  const { id } = await context.params;
  let body: { number?: number; expectedStatus?: string; reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const number = body.number;
  const expectedStatus = body.expectedStatus ?? "";
  const reason = body.reason?.trim() ?? "";
  if (!uuid.test(id) || !Number.isSafeInteger(number) || (number ?? 0) < 1 || !cancellable.has(expectedStatus) || reason.length < 3 || reason.length > 1000) {
    return NextResponse.json({ error: "Проверьте заказ, номер и причину отмены" }, { status: 400 });
  }
  const rpc = root.admin as unknown as { rpc: (name: "root_cancel_unpaid_order", args: { p_order: string; p_actor: string; p_number: number; p_expected_status: string; p_reason: string }) => Promise<{ data: boolean | null; error: { message: string } | null }> };
  const result = await rpc.rpc("root_cancel_unpaid_order", { p_order: id, p_actor: root.user.id, p_number: number!, p_expected_status: expectedStatus, p_reason: reason });
  if (result.error || !result.data) return NextResponse.json({ error: "Заказ не отменён. Обновите данные и проверьте оплату" }, { status: 409 });
  return NextResponse.json({ cancelled: true }, { headers: { "Cache-Control": "no-store, private" } });
}
