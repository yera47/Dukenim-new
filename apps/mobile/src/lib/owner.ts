import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type OwnerStore = {
  id: string;
  name: string;
  slug: string;
  business_vertical: string | null;
  catalog_published: boolean;
  onboarding_completed: boolean;
  catalog_status: "not_started" | "building" | "ready";
  next_plan: "basic" | "standard" | "pro" | null;
  preferred_billing_period: "monthly" | "annual";
};

export type OwnerContext = {
  user: User;
  role: "customer" | "owner" | "superadmin";
  stores: OwnerStore[];
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
      .select("id,name,slug,business_vertical,catalog_published,onboarding_completed,catalog_status,next_plan,preferred_billing_period")
      .in("id", ids)
      .order("created_at", { ascending: true });
    if (error) throw new Error("Не удалось открыть магазины.");
    stores = (data ?? []) as OwnerStore[];
  }
  const rawRole = profile?.role;
  const role = rawRole === "superadmin" ? "superadmin" : rawRole === "owner" ? "owner" : "customer";
  return { user: auth.user, role, stores };
}

export function routeForStore(store: OwnerStore): "/onboarding" | "/catalog-builder" | "/catalog" | "/studio" {
  if (!store.onboarding_completed) return "/onboarding";
  if (store.catalog_status === "not_started") return "/catalog-builder";
  if (store.catalog_status === "building") return "/catalog";
  return "/studio";
}

export async function workspaceRoute(): Promise<"/onboarding" | "/catalog-builder" | "/catalog" | "/studio" | "/staff" | "/setup-store"> {
  const context = await loadOwnerContext();
  if (context.stores.length) {
    const selectedId = globalThis.localStorage?.getItem("dukenim_selected_store");
    return routeForStore(context.stores.find(store => store.id === selectedId) ?? context.stores[0]);
  }
  if (!supabase) return "/setup-store";
  const { data } = await supabase.rpc("staff_directory" as never);
  return Array.isArray(data) && data.length > 0 ? "/staff" : "/setup-store";
}
