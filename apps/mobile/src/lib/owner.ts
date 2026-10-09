import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ACTIVE_OWNER_STORE_COLUMNS, ARCHIVE_OWNER_STORE_COLUMNS, storeArchiveEnabled } from "@/lib/store-archive-feature";

export type OwnerStore = {
  id: string;
  name: string;
  slug: string;
  business_vertical: string | null;
  catalog_published: boolean;
  onboarding_completed: boolean;
  catalog_status: "not_started" | "building" | "ready";
  plan: "basic" | "standard" | "pro";
  next_plan: "basic" | "standard" | "pro" | null;
  preferred_billing_period: "monthly" | "annual";
  status?: "active" | "paused" | "trial";
  trial_ends_at?: string | null;
  logo_url?: string | null;
  accent_color?: string;
  archived_at?: string | null;
  archive_reason?: string | null;
  brand_profile?: {color_theme:unknown;layout_config:unknown;brand_color:string|null;template_key?:string|null}|null;
};

export type OwnerContext = {
  user: User;
  role: "customer" | "owner" | "superadmin";
  stores: OwnerStore[];
  archivedStores?: OwnerStore[];
};

export async function loadOwnerContext(): Promise<OwnerContext> {
  if (!supabase) throw new Error("Мобильное подключение ещё не настроено.");
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Сессия закончилась. Войдите снова.");
  const [{ data: profile }, { data: memberships, error: membershipError }] = await Promise.all([
    supabase.from("profiles").select("role").eq("user_id", auth.user.id).maybeSingle(),
    supabase.from("tenant_users").select("tenant_id").eq("user_id", auth.user.id),
  ]);
  if (membershipError) throw new Error("Не удалось загрузить ваши магазины.");
  const ids = [...new Set((memberships ?? []).map((row) => row.tenant_id as string))];
  let stores: OwnerStore[] = [];
  if (ids.length) {
    const { data, error } = await supabase
      .from("tenants")
      .select(storeArchiveEnabled ? ARCHIVE_OWNER_STORE_COLUMNS : ACTIVE_OWNER_STORE_COLUMNS)
      .in("id", ids)
      .order("created_at", { ascending: true });
    if (error) throw new Error("Не удалось открыть магазины.");
    stores = ((data ?? []) as unknown as Array<OwnerStore&{tenant_storefront_settings?:OwnerStore["brand_profile"]}>).map(({tenant_storefront_settings,...store})=>({...store,brand_profile:tenant_storefront_settings??null}));
  }
  const rawRole = profile?.role;
  const role = rawRole === "superadmin" ? "superadmin" : rawRole === "owner" ? "owner" : "customer";
  const archivedStores = storeArchiveEnabled ? stores.filter(store => Boolean(store.archived_at)) : [];
  return { user: auth.user, role, stores: storeArchiveEnabled ? stores.filter(store => !store.archived_at) : stores, archivedStores };
}

export function routeForStore(store: OwnerStore): "/onboarding" | "/catalog-builder" | "/catalog" | "/more" {
  if (!store.onboarding_completed) return "/onboarding";
  if (store.catalog_status === "not_started") return "/catalog-builder";
  if (store.catalog_status === "building") return "/catalog";
  return "/more";
}

export async function workspaceRoute(): Promise<"/root" | "/onboarding" | "/catalog-builder" | "/catalog" | "/more" | "/staff" | "/setup-store"> {
  const context = await loadOwnerContext();
  if (context.role === "superadmin") return "/root";
  if (context.stores.length) {
    const selectedId = globalThis.localStorage?.getItem("dukenim_selected_store");
    return routeForStore(context.stores.find(store => store.id === selectedId) ?? context.stores[0]);
  }
  if (!supabase) return "/setup-store";
  const { data } = await supabase.rpc("staff_directory" as never);
  return Array.isArray(data) && data.length > 0 ? "/staff" : "/setup-store";
}
