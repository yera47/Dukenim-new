import FieldSalesPage from "@/app/root/sales/page";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { zone?: string; segment?: string; status?: string; q?: string; stops?: string; lead?: string };

export default async function AdminFieldSalesPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireRole(["superadmin"]);
  const params = await searchParams;
  return <FieldSalesPage searchParams={Promise.resolve({ ...params, view: "admin" })}/>;
}
