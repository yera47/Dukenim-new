import { redirect } from "next/navigation";
import { CatalogSetupForm } from "@/components/admin/catalog-setup-form";
import { requireRole } from "@/lib/auth";
import { getTenant } from "@/lib/queries/owner";
import { createClient } from "@/lib/supabase/server";

export default async function CreateCatalog() {
  const { tenantId } = await requireRole(["owner", "superadmin"]);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/admin/catalog/new");
  const { data: tenant } = await getTenant(await createClient(), tenantId!);
  if (!tenant) redirect("/admin");
  if (tenant.catalog_status !== "not_started") redirect(tenant.catalog_status === "ready" ? "/admin/catalog" : "/admin/catalog/new");
  return <><div><p className="muted text-sm">Первый запуск</p><h1 className="mt-1 text-3xl font-semibold">Создайте каталог</h1><p className="muted mt-2 max-w-2xl">Выберите оформление будущей витрины, затем добавьте товары. Это отдельный шаг: товар сам по себе не создаёт каталог.</p></div><CatalogSetupForm defaultName={tenant.name} slug={tenant.slug} plan={tenant.plan} /></>;
}
