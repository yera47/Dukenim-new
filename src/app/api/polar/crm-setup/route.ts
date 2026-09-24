import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";

export async function POST() {
  const context = await getSessionContext();
  if (!context?.user || context.role !== "owner" || !context.tenantId) {
    return NextResponse.json({ error: "Настройками интеграций может управлять только владелец магазина." }, { status: 403 });
  }
  return NextResponse.json(
    { error: "Настройка интеграции со стороны Dukenim уже входит в тариф «Каталог». Отдельная оплата не требуется; лицензия внешнего сервиса оплачивается его поставщику." },
    { status: 409 },
  );
}
