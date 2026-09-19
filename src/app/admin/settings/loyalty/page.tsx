import Link from "next/link";
import {requireRole} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {loyaltyClient} from "@/lib/loyalty-db";
import {loyaltyProgramSchema} from "@/lib/loyalty";
import {LoyaltySettingsForm} from "./form";
export default async function LoyaltySettings(){
 const {tenantId}=await requireRole(["owner","superadmin"]);const client=await createClient();
 const {data:tenant}=await client.from("tenants").select("business_vertical").eq("id",tenantId!).single();
 if(tenant?.business_vertical!=="food")return <p>Конструктор лояльности пока доступен для кафе и еды.</p>;
 const db=loyaltyClient(client);
 const [program,rules]=await Promise.all([db.from("loyalty_programs").select("*").eq("tenant_id",tenantId!).maybeSingle(),db.from("loyalty_rules").select("config").eq("tenant_id",tenantId!).eq("active",true).order("created_at")]);
 if(program.error||rules.error)return <p role="alert">Не удалось прочитать программу. Обновите страницу.</p>;
 const parsed=program.data?loyaltyProgramSchema.safeParse({name:program.data.name,enabled:program.data.enabled,terms:program.data.terms,rules:rules.data?.map(r=>r.config)}):null;
 return <><Link href="/admin/settings" className="text-sm text-neutral-500">← Настройки</Link><h1 className="mt-5 text-3xl font-semibold">Лояльность гостей</h1><LoyaltySettingsForm initial={parsed?.success?parsed.data:null}/></>;
}
