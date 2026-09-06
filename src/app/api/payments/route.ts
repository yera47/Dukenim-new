import { NextResponse } from "next/server";

// Legacy placeholder kept fail-closed so no client-supplied amount can ever be
// treated as a real payment. Subscriptions use the authenticated Polar routes.
export async function POST() {
  return NextResponse.json(
    { error: "Онлайн-оплата заказов ещё не подключена. Используйте оплату при получении." },
    { status: 503 },
  );
}
