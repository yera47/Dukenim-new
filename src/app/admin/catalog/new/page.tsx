import { ProductForm } from "@/components/admin/product-form";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getTenant } from "@/lib/queries/owner";
import { createClient } from "@/lib/supabase/server";

export default async function NewProduct() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  let categories: Array<{ id: string; name: string }> = [];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { data: tenant } = await getTenant(await createClient(), tenantId!);
    if (!tenant || tenant.catalog_status === "not_started") redirect("/admin/catalog/create");
    categories = (await (await createClient()).from("categories").select("id,name").eq("tenant_id", tenantId!).eq("is_active", true).order("sort_order")).data ?? [];
  }
  return <><div><p className="muted text-sm">Каталог / Новый товар</p><h1 className="mt-1 text-3xl font-semibold">Добавить товар</h1><p className="muted mt-2">Добавьте фотографии, цену и остаток. Разделы из AI Studio доступны для выбора ниже.</p></div><ProductForm categories={categories} /></>;
}
