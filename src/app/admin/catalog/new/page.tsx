import { ProductForm } from "@/components/admin/product-form";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getTenant } from "@/lib/queries/owner";
import { createClient } from "@/lib/supabase/server";

export default async function NewProduct() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const { data: tenant } = await getTenant(await createClient(), tenantId!);
    if (!tenant || tenant.catalog_status === "not_started") redirect("/admin/catalog/create");
  }
  return <><div><p className="muted text-sm">Каталог / Новый товар</p><h1 className="mt-1 text-3xl font-semibold">Добавить товар</h1><p className="muted mt-2">Заполните основное и нажмите «Сохранить» — обычно это занимает меньше минуты.</p></div><ProductForm /></>;
}
