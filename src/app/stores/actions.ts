"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function switchStore(formData: FormData) {
  const { user } = await requireRole(["owner", "superadmin"]);
  const tenantId = String(formData.get("tenantId") ?? "");
  if (!UUID.test(tenantId)) return;
  const client = await createClient();
  const { data } = await client.from("tenant_users").select("tenant_id")
    .eq("user_id", user!.id).eq("tenant_id", tenantId).eq("role", "owner").maybeSingle();
  if (!data) return;
  (await cookies()).set("dukenim_selected_tenant", tenantId, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/admin");
}

export type DeleteStoreState = { error: string | null };

export async function deleteStore(_: DeleteStoreState, formData: FormData): Promise<DeleteStoreState> {
  const { user } = await requireRole(["owner", "superadmin"]);
  const tenantId = String(formData.get("tenantId") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (!UUID.test(tenantId) || !confirmation) return { error: "Введите адрес магазина для подтверждения." };

  const client = await createClient();
  const membership = await client.from("tenant_users").select("tenant_id")
    .eq("tenant_id", tenantId).eq("user_id", user!.id).eq("role", "owner").maybeSingle();
  if (membership.error || !membership.data) return { error: "Магазин не принадлежит вашему аккаунту." };
  const store = await client.from("tenants").select("slug").eq("id", tenantId).single();
  if (store.error || !store.data || store.data.slug !== confirmation) return { error: "Адрес магазина не совпал." };

  const admin = createAdminClient() as unknown as {
    rpc: (name: "delete_owner_store", args: { p_tenant: string; p_actor: string; p_slug: string }) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  };
  const result = await admin.rpc("delete_owner_store", {
    p_tenant: tenantId, p_actor: user!.id, p_slug: confirmation,
  });
  if (result.error || !result.data) return { error: result.error?.message ?? "Удаление не выполнено." };

  const cookieStore = await cookies();
  if (cookieStore.get("dukenim_selected_tenant")?.value === tenantId) cookieStore.delete("dukenim_selected_tenant");
  revalidatePath("/stores");
  revalidatePath("/admin");
  revalidatePath("/root");
  redirect("/stores?deleted=1");
}
