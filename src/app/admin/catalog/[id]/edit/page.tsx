import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {loadOwnerCatalog} from "@/lib/owner-data";
import {createClient} from "@/lib/supabase/server";
import {EditProductForm} from "@/components/admin/edit-product-form";

export default async function EditProduct({params}:{params:Promise<{id:string}>}){
 const{id}=await params;
 const{tenantId}=await requireRole(["owner","superadmin"]);
 const client=await createClient();
 const[catalog,{data:tenant}]=await Promise.all([loadOwnerCatalog(tenantId!),client.from("tenants").select("business_vertical").eq("id",tenantId!).single()]);
 const product=catalog.products.find(p=>p.id===id);
 if(!product)notFound();
 const choices=catalog.variants.filter(v=>v.product_id!==id&&v.is_active).map(v=>({id:v.id,label:`${catalog.products.find(p=>p.id===v.product_id)?.title??"Товар"}${v.size?` · ${v.size}`:""}`}));
 return <><div><p className="muted text-sm">Каталог / Редактирование</p><h1 className="mt-1 text-3xl font-semibold">{product.title}</h1></div><EditProductForm product={product} variants={catalog.variants.filter(v=>v.product_id===id)} choices={choices} food={tenant?.business_vertical==="food"}/></>;
}
