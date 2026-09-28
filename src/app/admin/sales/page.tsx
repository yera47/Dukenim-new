import FieldSalesPage from "@/app/root/sales/page";
import { requireFieldSalesAccess } from "@/lib/field-sales-access.server";

export const dynamic = "force-dynamic";

type Params = { zone?: string; segment?: string; status?: string; q?: string; lead?: string; date?: string; saved?: string };

export default async function AdminFieldSalesPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireFieldSalesAccess();
  const params = await searchParams;
  return <FieldSalesPage searchParams={Promise.resolve({ ...params, view: "admin" })}/>;
}
