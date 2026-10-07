"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { storeArchiveEnabled } from "@/lib/store-archive-feature";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type StoreArchiveState = { error: string | null };

export async function switchStore(formData: FormData) {
  const { user } = await requireRole(["owner", "superadmin"]);
  const tenantId = String(formData.get("tenantId") ?? "");
  if (!UUID.test(tenantId)) return;
  const client = await createClient();
  const { data } = await client.from("tenant_users").select("tenant_id")
    .eq("user_id", user!.id).eq("tenant_id", tenantId).eq("role", "owner").maybeSingle();
  if (!data) return;
  if (storeArchiveEnabled()) {
    const active = await client.from("tenants").select("id").eq("id", tenantId).is("archived_at", null).maybeSingle();
    if (!active.data) return;
  }
  (await cookies()).set("dukenim_selected_tenant", tenantId, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/admin");
}

async function ownedStore(tenantId: string, actorId: string) {
  if (!UUID.test(tenantId)) return { error: "Некорректный магазин." } as const;
  const client = await createClient();
  const membership = await client.from("tenant_users").select("tenant_id")
    .eq("tenant_id", tenantId).eq("user_id", actorId).eq("role", "owner").maybeSingle();
  if (membership.error || !membership.data) return { error: "Магазин не принадлежит вашему аккаунту." } as const;
  const store = await client.from("tenants").select("slug,archived_at").eq("id", tenantId).single();
  if (store.error || !store.data) return { error: "Магазин не найден." } as const;
  return { store: store.data } as const;
}

export async function archiveStore(_: StoreArchiveState, formData: FormData): Promise<StoreArchiveState> {
  if (!storeArchiveEnabled()) return { error: "Архив магазинов пока недоступен." };
  const { user } = await requireRole(["owner", "superadmin"]);
  const tenantId = String(formData.get("tenantId") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!confirmation || reason.length < 3 || reason.length > 1000) return { error: "Укажите адрес магазина и причину от 3 до 1000 символов." };
  const owned = await ownedStore(tenantId, user!.id);
  if ("error" in owned) return { error: owned.error ?? "Магазин недоступен." };
  if (owned.store.slug !== confirmation) return { error: "Адрес магазина не совпал." };
  if (owned.store.archived_at) return { error: "Магазин уже находится в архиве." };

  const admin = createAdminClient() as unknown as {
    rpc: (name: "archive_owner_store", args: { p_tenant: string; p_actor: string; p_slug: string; p_reason: string }) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  };
  const result = await admin.rpc("archive_owner_store", { p_tenant: tenantId, p_actor: user!.id, p_slug: confirmation, p_reason: reason });
  if (result.error || !result.data) return { error: result.error?.message ?? "Архивация не выполнена." };

  const cookieStore = await cookies();
  if (cookieStore.get("dukenim_selected_tenant")?.value === tenantId) cookieStore.delete("dukenim_selected_tenant");
  revalidatePath("/stores");
  revalidatePath("/admin");
  revalidatePath("/root");
  redirect("/stores?archived=1");
}

export async function restoreStore(_: StoreArchiveState, formData: FormData): Promise<StoreArchiveState> {
  if (!storeArchiveEnabled()) return { error: "Восстановление магазинов пока недоступно." };
  const { user } = await requireRole(["owner", "superadmin"]);
  const tenantId = String(formData.get("tenantId") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!confirmation || reason.length < 3 || reason.length > 1000) return { error: "Укажите адрес магазина и причину от 3 до 1000 символов." };
  const owned = await ownedStore(tenantId, user!.id);
  if ("error" in owned) return { error: owned.error ?? "Магазин недоступен." };
  if (owned.store.slug !== confirmation) return { error: "Адрес магазина не совпал." };
  if (!owned.store.archived_at) return { error: "Магазин не находится в архиве." };

  const admin = createAdminClient() as unknown as {
    rpc: (name: "restore_owner_store", args: { p_tenant: string; p_actor: string; p_slug: string; p_reason: string }) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  };
  const result = await admin.rpc("restore_owner_store", { p_tenant: tenantId, p_actor: user!.id, p_slug: confirmation, p_reason: reason });
  if (result.error || !result.data) return { error: result.error?.message ?? "Восстановление не выполнено." };

  (await cookies()).set("dukenim_selected_tenant", tenantId, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/stores");
  revalidatePath("/admin");
  redirect("/stores?restored=1");
}
