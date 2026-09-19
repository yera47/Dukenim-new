import {loadOwnerCatalog} from "@/lib/owner-data";
import { ProductForm } from "@/components/admin/product-form";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getTenant } from "@/lib/queries/owner";
import { createClient } from "@/lib/supabase/server";

import type { BusinessVertical } from "@/types/database";
import { businessWorkflow } from "@/lib/business-workflow";

export default async function NewProduct() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  let vertical: BusinessVertical = "other";
  let categories: Array<{ id: string; name: string }> = [];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { data: tenant } = await getTenant(await createClient(), tenantId!);
    if (!tenant || tenant.catalog_status === "not_started") redirect("/admin/catalog/create");
    vertical = tenant.business_vertical ?? "other";
    categories = (await (await createClient()).from("categories").select("id,name").eq("tenant_id", tenantId!).eq("is_active", true).order("sort_order")).data ?? [];
  }
  const catalog=vertical==="food"?await loadOwnerCatalog(tenantId!):null;const choices=catalog?catalog.variants.filter(v=>v.is_active).map(v=>({id:v.id,label:`${catalog.products.find(p=>p.id===v.product_id)?.title??"Товар"}${v.size?` · ${v.size}`:""}`})):[];
  const workflow = businessWorkflow(vertical);
  return <><div><p className="muted text-sm">Каталог / Новая позиция</p><h1 className="mt-1 text-3xl font-semibold">Добавить: {workflow.item.toLowerCase()}</h1><p className="muted mt-2">Добавьте фотографии, цену и остаток. Разделы из AI Studio доступны для выбора ниже.</p></div><ProductForm choices={choices} categories={categories} vertical={vertical} /></>;
}
