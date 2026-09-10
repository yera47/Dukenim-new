import {staffPreviewContext} from "@/lib/staff-preview";
import {aiStudioDesignSchema} from "@/lib/ai/studio-schemas";
import {StaffDesignApply} from "./design-apply";
export async function StaffDesigns({access}:{access:string}){
 const context=await staffPreviewContext(access);if(!context?.write)return null;
 const [designs,current]=await Promise.all([context.client.from("ai_studio_generations").select("id,output").eq("tenant_id",context.tenantId).eq("intent","store_design").order("created_at",{ascending:false}).limit(5),context.client.from("tenant_storefront_settings").select("updated_at").eq("tenant_id",context.tenantId).maybeSingle()]);
 if(designs.error||current.error)return <p role="alert">Оформления не загрузились.</p>;
 if(!current.data)return <p>Сначала создайте основу каталога в аккаунте владельца.</p>;
 return <div className="space-y-4"><h3 className="font-semibold">Сохранённые предложения оформления</h3>{!designs.data?.length&&<p>Пока нет предложений оформления. Владелец может создать их в AI Studio.</p>}{designs.data?.map(row=>{const design=aiStudioDesignSchema.safeParse(row.output);return design.success?<article key={row.id} className="rounded-xl border bg-white p-4"><h4 className="font-semibold">{design.data.heroTitle}</h4><p className="mb-3 text-sm">{design.data.rationale}</p><StaffDesignApply access={access} generation={row.id} expected={current.data!.updated_at}/></article>:null;})}</div>;
}
