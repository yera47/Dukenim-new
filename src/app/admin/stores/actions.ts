"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function switchStore(formData: FormData) {
  const { user } = await requireRole(["owner", "superadmin"]);
  const tenantId = String(formData.get("tenantId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) return;
  const client = await createClient();
  const { data } = await client.from("tenant_users").select("tenant_id").eq("user_id", user!.id).eq("tenant_id", tenantId).eq("role", "owner").maybeSingle();
  if (!data) return;
  (await cookies()).set("dukenim_selected_tenant", tenantId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/admin");
}
