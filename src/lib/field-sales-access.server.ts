import "server-only";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { canUseFieldSales } from "@/lib/field-sales-access";

export async function requireFieldSalesAccess() {
  const context = await requireRole(["owner", "superadmin"]);
  if (!canUseFieldSales(context.role, context.tenantId)) redirect("/admin");
  if (!context.user) redirect("/login");
  return context;
}
