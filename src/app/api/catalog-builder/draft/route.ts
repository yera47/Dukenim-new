import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { catalogBuilderSaveSchema } from "@/lib/catalog-builder-draft";
import { tenantEntitlement } from "@/lib/plan-access";

async function owner() {
  const session = await getSessionContext();
  return session?.user && session.tenantId && session.role === "owner" ? session : null;
}
export async function GET() {
  const session = await owner();
  if (!session) return NextResponse.json({error:"Войдите в аккаунт владельца магазина."},{status:401});
  try {
    const client = await createClient();
    const result = await client.from("catalog_builder_drafts").select("revision,state,updated_at").eq("tenant_id",session.tenantId!).maybeSingle();
    if (result.error) return NextResponse.json({error:"Не удалось загрузить черновик. Не закрывайте страницу с несохранёнными изменениями."},{status:503});
    return NextResponse.json({draft:result.data},{headers:{"Cache-Control":"private, no-store"}});
  } catch { return NextResponse.json({error:"Черновик временно недоступен."},{status:503}); }
}
export async function PUT(request: Request) {
  const session = await owner();
  if (!session) return NextResponse.json({error:"Войдите в аккаунт владельца магазина."},{status:401});
  try {
    const raw = await request.text();
    if (raw.length > 16000) return NextResponse.json({error:"Черновик слишком большой."},{status:413});
    const input = catalogBuilderSaveSchema.safeParse(JSON.parse(raw));
    if (!input.success) return NextResponse.json({error:"Проверьте поля черновика."},{status:400});
    if (!(await tenantEntitlement(session.tenantId!)).active) return NextResponse.json({error:"Для изменений нужен активный пробный период или тариф."},{status:403});
    const client = await createClient();
    const {revision,state} = input.data;
    const fields = {state,revision:revision+1,updated_at:new Date().toISOString()};
    // Compare-and-swap is one UPDATE. Two tabs cannot silently overwrite each other.
    const result = revision === 0
      ? await client.from("catalog_builder_drafts").insert({tenant_id:session.tenantId!,...fields}).select("revision").single()
      : await client.from("catalog_builder_drafts").update(fields).eq("tenant_id",session.tenantId!).eq("revision",revision).select("revision").maybeSingle();
    if (result.error?.code === "23505" || (!result.error && !result.data)) return NextResponse.json({error:"Черновик изменён в другой вкладке. Ваши поля остаются здесь: скопируйте их перед обновлением страницы."},{status:409});
    if (result.error || !result.data) return NextResponse.json({error:"Не удалось сохранить черновик. Введённые поля остаются на экране."},{status:503});
    return NextResponse.json({revision:result.data.revision});
  } catch { return NextResponse.json({error:"Не удалось сохранить черновик. Проверьте соединение."},{status:400}); }
}
